import { BookmarkContextValue, BookmarkContextState, createBookmarkContextValue } from './BookmarkContext.js';
import { AuthContextValue, AuthContextState, AuthConfig, createAuthContextValue, GitHubUser, AuthTokens } from './AuthContext.js';
import { BookmarkService, createBookmarkService } from '../adapters/index.js';
import { createSyncShell } from '../shell/sync.js';
import { createLocalStorageShell } from '../shell/storage.js';
import { createRoot } from '../core/index.js';
import { Root } from '../types/index.js';

export interface AppContextState {
  readonly bookmark: BookmarkContextState;
  readonly auth: AuthContextState;
  readonly isInitialized: boolean;
}

export interface AppContextValue {
  readonly bookmark: BookmarkContextValue;
  readonly auth: AuthContextValue;
  readonly isInitialized: boolean;
  
  // App-level operations
  initialize: () => Promise<void>;
  reset: () => Promise<void>;
  
  // Sync management
  enableSync: () => Promise<void>;
  disableSync: () => void;
  isSyncEnabled: () => boolean;
}

export interface AppConfig extends AuthConfig {
  readonly autoSync?: boolean;
  readonly syncInterval?: number; // minutes
  readonly storageConfig?: {
    readonly bookmarkKey?: string;
    readonly authKey?: string;
  };
}

export const createAppContext = (config: AppConfig = {}): AppContextValue => {
  // Initialize state
  let bookmarkState: BookmarkContextState = {
    root: createRoot(),
    isLoading: false,
    error: null,
    lastSyncAt: null,
    isDirty: false
  };

  let authState: AuthContextState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    lastLoginAt: null
  };

  let isInitialized = false;
  let bookmarkService: BookmarkService = createBookmarkService(); // Initialize immediately
  let syncEnabled = false;
  let syncInterval: NodeJS.Timeout | null = null;

  // Initialize bookmark service with localStorage
  const initializeBookmarkService = () => {
    const storageShell = createLocalStorageShell({
      storageKey: config.storageConfig?.bookmarkKey || 'bookmarkdown_data'
    });
    
    bookmarkService = createBookmarkService();
    
    // Try to load from localStorage
    const loadResult = storageShell.load<Root>();
    if (loadResult.success && loadResult.data) {
      bookmarkService.setRoot(loadResult.data);
      bookmarkState = {
        ...bookmarkState,
        root: loadResult.data
      };
    }
  };

  // Initialize with localStorage
  initializeBookmarkService();

  // Bookmark context actions
  const bookmarkActions = {
    setLoading: (loading: boolean) => {
      bookmarkState = { ...bookmarkState, isLoading: loading };
    },
    setError: (error: string | null) => {
      bookmarkState = { ...bookmarkState, error };
    },
    setRoot: (root: Root) => {
      bookmarkState = { ...bookmarkState, root };
      bookmarkService.setRoot(root);
      
      // Auto-save to localStorage
      const storageShell = createLocalStorageShell({
        storageKey: config.storageConfig?.bookmarkKey || 'bookmarkdown_data'
      });
      storageShell.save(root);
    },
    setLastSyncAt: (date: Date | null) => {
      bookmarkState = { ...bookmarkState, lastSyncAt: date };
    },
    setDirty: (dirty: boolean) => {
      bookmarkState = { ...bookmarkState, isDirty: dirty };
    }
  };

  // Auth context actions
  const authActions = {
    setUser: (user: GitHubUser | null) => {
      authState = { 
        ...authState, 
        user,
        isAuthenticated: !!user
      };
    },
    setTokens: (tokens: AuthTokens | null) => {
      authState = { ...authState, tokens };
    },
    setLoading: (loading: boolean) => {
      authState = { ...authState, isLoading: loading };
    },
    setError: (error: string | null) => {
      authState = { ...authState, error };
    },
    setLastLoginAt: (date: Date | null) => {
      authState = { ...authState, lastLoginAt: date };
    }
  };

  // Create context values
  const bookmarkContext = createBookmarkContextValue(bookmarkService, bookmarkState, bookmarkActions);
  const authContext = createAuthContextValue({
    ...config,
    oauthServiceUrl: config.oauthServiceUrl || 'https://bookmarkdown-oauth.your-subdomain.workers.dev'
  }, authState, authActions);

  // Sync management
  const setupSync = async () => {
    if (!authState.tokens?.accessToken) {
      throw new Error('Authentication required for sync');
    }

    const syncShell = createSyncShell({
      accessToken: authState.tokens.accessToken,
      filename: 'bookmarks.md'
    });

    // Replace bookmark service with sync-enabled version
    bookmarkService = createBookmarkService(syncShell);
    bookmarkService.setRoot(bookmarkState.root);
    
    syncEnabled = true;

    // Setup auto-sync if configured
    if (config.autoSync && config.syncInterval) {
      const intervalMs = config.syncInterval * 60 * 1000; // Convert minutes to ms
      syncInterval = setInterval(async () => {
        if (bookmarkState.isDirty) {
          try {
            await bookmarkContext.syncWithRemote();
          } catch (error) {
            console.warn('Auto-sync failed:', error);
          }
        }
      }, intervalMs);
    }
  };

  const teardownSync = () => {
    syncEnabled = false;
    
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }

    // Replace with localStorage-only service
    initializeBookmarkService();
  };

  // App context value
  const appContext: AppContextValue = {
    bookmark: bookmarkContext,
    auth: authContext,
    isInitialized,

    initialize: async () => {
      if (isInitialized) return;

      try {
        // Try to refresh auth if we have stored tokens
        if (authState.tokens?.accessToken) {
          await authContext.refreshAuth();
        }

        // Setup sync if authenticated
        if (authState.isAuthenticated && authState.tokens?.accessToken) {
          try {
            await setupSync();
            
            // Try to sync on initialization
            if (config.autoSync) {
              await bookmarkContext.loadFromRemote();
            }
          } catch (error) {
            console.warn('Failed to setup sync on initialization:', error);
          }
        }

        isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize app context:', error);
        throw error;
      }
    },

    reset: async () => {
      // Clear all state
      authContext.resetAuth();
      bookmarkContext.resetState();
      teardownSync();
      
      // Reinitialize
      initializeBookmarkService();
      isInitialized = false;
    },

    enableSync: async () => {
      if (!authState.isAuthenticated) {
        throw new Error('Authentication required to enable sync');
      }
      
      await setupSync();
    },

    disableSync: () => {
      teardownSync();
    },

    isSyncEnabled: () => syncEnabled
  };

  return appContext;
};