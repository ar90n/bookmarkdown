export * from './bookmark.js';
export * from './result.js';

// Re-export shell types for easy access
export type {
  LocalStorageShell,
  ChromeStorageShell,
  StorageConfig,
  GistConfig,
  GistClient,
  GistCreateResult,
  GistReadResult
} from '../shell/index.js';