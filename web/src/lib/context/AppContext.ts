import { BookmarkContextValue } from './BookmarkContext.js';
import { AuthContextValue, AuthConfig } from './AuthContext.js';

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

// Factory function removed - use useAppContextProvider hook instead