import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats } from '../types/index.js';

export interface BookmarkContextValue {
  // State
  readonly root: Root;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastSyncAt: Date | null;
  readonly isDirty: boolean; // Has unsaved changes
  
  // Core operations
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  
  // Bundle operations
  addBundle: (categoryName: string, bundleName: string) => Promise<void>;
  removeBundle: (categoryName: string, bundleName: string) => Promise<void>;
  renameBundle: (categoryName: string, oldName: string, newName: string) => Promise<void>;
  
  // Bookmark operations
  addBookmark: (categoryName: string, bundleName: string, bookmark: BookmarkInput) => Promise<void>;
  updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => Promise<void>;
  removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => Promise<void>;
  
  // Search and stats
  searchBookmarks: (filter?: BookmarkFilter) => BookmarkSearchResult[];
  getStats: () => BookmarkStats;
  
  // Sync operations
  syncWithRemote: () => Promise<void>;
  loadFromRemote: () => Promise<void>;
  saveToRemote: () => Promise<void>;
  
  // State management
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

// Factory function removed - use useBookmarkContextProvider hook instead