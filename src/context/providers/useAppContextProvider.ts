import { useState, useCallback, useEffect, useRef } from 'react';
import { AppContextValue, AppConfig } from '../AppContext.js';
import { useAuthContextProvider } from './useAuthContextProvider.js';
import { useBookmarkContextProvider } from './useBookmarkContextProvider.js';

export function useAppContextProvider(config: AppConfig): AppContextValue {
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create sub-contexts
  const authContext = useAuthContextProvider({
    ...config,
    oauthServiceUrl: config.oauthServiceUrl
  });
  
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
      // Try to refresh auth if we have stored tokens
      if (authContext.tokens?.accessToken) {
        await authContext.refreshAuth();
      }

      // Setup sync if authenticated
      if (authContext.isAuthenticated && authContext.tokens?.accessToken) {
        setSyncEnabled(true);
        
        // Try to sync on initialization
        if (config.autoSync) {
          try {
            await bookmarkContext.loadFromRemote();
          } catch (error) {
            console.warn('Failed to load from remote on initialization:', error);
          }
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app context:', error);
      throw error;
    }
  }, [authContext, bookmarkContext, config.autoSync, isInitialized]);

  // Reset operation
  const reset = useCallback(async () => {
    // Clear all state
    authContext.resetAuth();
    bookmarkContext.resetState();
    setSyncEnabled(false);
    setIsInitialized(false);
    
    // Clear sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, [authContext, bookmarkContext]);

  // Sync management
  const enableSync = useCallback(async () => {
    if (!authContext.isAuthenticated) {
      throw new Error('Authentication required to enable sync');
    }
    
    setSyncEnabled(true);
    
    // Load from remote immediately
    if (config.autoSync) {
      await bookmarkContext.loadFromRemote();
    }

    // Setup auto-sync interval
    if (config.autoSync && config.syncInterval) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      syncIntervalRef.current = setInterval(async () => {
        try {
          // Only sync if there are changes and user is authenticated
          if (bookmarkContext.isDirty && authContext.isAuthenticated) {
            console.log('Auto-sync: syncing dirty changes...');
            await bookmarkContext.syncWithRemote();
          }
        } catch (error) {
          console.warn('Auto-sync failed:', error);
        }
      }, config.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    }
  }, [authContext.isAuthenticated, bookmarkContext, config.autoSync, config.syncInterval]);

  const disableSync = useCallback(() => {
    setSyncEnabled(false);
    
    // Clear sync interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const isSyncEnabled = useCallback(() => syncEnabled, [syncEnabled]);

  return {
    bookmark: bookmarkContext,
    auth: authContext,
    isInitialized,
    initialize,
    reset,
    enableSync,
    disableSync,
    isSyncEnabled
  };
}