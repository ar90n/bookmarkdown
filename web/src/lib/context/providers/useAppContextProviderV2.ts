import { useState, useCallback, useEffect, useRef } from 'react';
import { AppContextValue, AppConfig } from '../AppContext.js';
import { useAuthContextProvider } from './useAuthContextProvider.js';
import { useBookmarkContextProviderV2 } from './useBookmarkContextProviderV2.js';

export function useAppContextProviderV2(config: AppConfig): AppContextValue {
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create sub-contexts
  const authContext = useAuthContextProvider({
    ...config,
    oauthServiceUrl: config.oauthServiceUrl
  });
  
  // Use V2 bookmark context
  const bookmarkContext = useBookmarkContextProviderV2({
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
      // If we have an access token, try to load from remote
      if (authContext.tokens?.accessToken) {
        await bookmarkContext.loadFromRemote();
        setSyncEnabled(true);
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
      bookmarkContext.loadFromRemote().catch(console.error);
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