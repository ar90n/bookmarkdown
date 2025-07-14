import { useState, useCallback, useEffect, useRef } from 'react';
import { AppContextValue, AppConfig } from '../AppContext.js';
import { useAuthContextProvider } from './useAuthContextProvider.js';
import { useBookmarkContextProvider } from './useBookmarkContextProvider.js';
import { BookmarkContextValue } from '../BookmarkContext.js';

// Helper function to wait for sync configuration
async function waitForSyncConfiguration(
  bookmarkContext: BookmarkContextValue,
  maxRetries: number,
  intervalMs: number = 1000
): Promise<boolean> {
  let retryCount = 0;
  
  while (retryCount < maxRetries && !bookmarkContext.isSyncConfigured?.()) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    retryCount++;
  }
  
  return bookmarkContext.isSyncConfigured?.() ?? false;
}

// Helper function to retry loading from remote
async function retryLoadFromRemote(
  bookmarkContext: BookmarkContextValue,
  maxRetries: number
): Promise<{ success: boolean; error?: Error }> {
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount < maxRetries) {
    try {
      await bookmarkContext.loadFromRemote();
      return { success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      retryCount++;
      
      if (retryCount < maxRetries) {
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }
  
  return { success: false, error: lastError || new Error('Failed to load from remote') };
}

export function useAppContextProvider(config: AppConfig): AppContextValue {
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create sub-contexts
  const authContext = useAuthContextProvider({
    ...config,
    oauthServiceUrl: config.oauthServiceUrl
  });
  
  // Use V2 bookmark context
  const bookmarkContext = useBookmarkContextProvider({
    accessToken: authContext.tokens?.accessToken,
    storageKey: config.storageConfig?.bookmarkKey || 'bookmarkdown_data',
    filename: 'bookmarks.md',
    autoSave: true
  });

  // Setup auto-sync
  useEffect(() => {
    if (syncEnabled && config.autoSync && config.syncInterval && bookmarkContext.isDirty) {
      const intervalMs = config.syncInterval * 60 * 1000; // Convert minutes to ms
      
      syncIntervalRef.current = setInterval(async () => {
        if (bookmarkContext.isDirty) {
          try {
            await bookmarkContext.syncWithRemote();
          } catch (error) {
            console.warn('Auto-sync failed:', error);
          }
        }
      }, intervalMs);
      
      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    }
  }, [syncEnabled, config.autoSync, config.syncInterval, bookmarkContext]);

  // Initialize operation
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      // Wait a bit for auth context to fully initialize
      // This helps avoid race conditions on page reload
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If we have an access token, try to load from remote
      if (authContext.tokens?.accessToken) {
        // First ensure the bookmark context is ready
        const maxRetries = 3;
        let retryCount = 0;
        
        // Wait for sync to be configured
        const syncReady = await waitForSyncConfiguration(bookmarkContext, maxRetries);
        
        if (!syncReady) {
          console.log('Sync not configured during initialization, skipping remote load');
          setSyncEnabled(false);
        } else {
          // Try to load from remote with retries
          const loadResult = await retryLoadFromRemote(bookmarkContext, maxRetries);
          
          if (loadResult.success) {
            setSyncEnabled(true);
          } else {
            console.error('Failed to load from remote after retries:', loadResult.error);
            bookmarkContext.setError(`Sync failed: ${loadResult.error?.message}`);
          }
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize:', error);
      // Continue with local data
      setIsInitialized(true);
    }
  }, [authContext.tokens?.accessToken, bookmarkContext, isInitialized]);

  // Enable sync when auth state changes
  useEffect(() => {
    if (authContext.isAuthenticated && !syncEnabled) {
      setSyncEnabled(true);
      // Try to load remote data when newly authenticated
      // Add retry logic here as well
      const loadWithRetry = async () => {
        const maxRetries = 3;
        let retryCount = 0;
        
        // First, wait for sync to be configured
        const waitResult = await waitForSyncConfiguration(bookmarkContext, maxRetries);
        if (!waitResult) {
          console.log('Sync not configured after waiting, skipping remote load');
          return;
        }
        
        // Try to load from remote with retries
        const loadResult = await retryLoadFromRemote(bookmarkContext, maxRetries);
        
        if (!loadResult.success) {
          console.error('Failed to load from remote:', loadResult.error);
          bookmarkContext.setError(`Unable to sync with remote: ${loadResult.error?.message}`);
        }
      };
      
      loadWithRetry();
    } else if (!authContext.isAuthenticated && syncEnabled) {
      setSyncEnabled(false);
    }
  }, [authContext.isAuthenticated, syncEnabled, bookmarkContext]);

  return {
    auth: authContext,
    bookmark: bookmarkContext,
    config,
    isInitialized,
    initialize,
    syncEnabled
  };
}