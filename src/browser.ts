// Browser entry point - exports for use in browser environments
// This file bundles all necessary dependencies for browser usage

// Core functionality
export * from './core/index.js';

// Types
export * from './types/index.js';

// Parsers
export * from './parsers/index.js';

// Utilities
export * from './utils/index.js';

// Adapters
import { createBookmarkService } from './adapters/index.js';
export { createBookmarkService, type BookmarkService } from './adapters/index.js';

// Shell exports
export { createLocalStorageShell, type LocalStorageShell } from './shell/storage.js';
export { createSyncShell, type SyncShell } from './shell/sync.js';
export { createGistClient, type GistClient } from './shell/gist-io.js';

// Context exports
export * from './context/index.js';
import { createAppContext } from './context/AppContext.js';

// Factory function for browser usage
export const createBookmarkAppForBrowser = () => {
  // For browser, we don't include GitHub sync by default
  // Users can implement their own sync mechanism
  return createBookmarkService();
};

// Factory function for browser with context
export const createBookmarkAppContext = (config = {}) => {
  return createAppContext(config);
};

// Export version for debugging
export const VERSION = '1.0.0';