import { Root, Bookmark, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats, MergeConflict, ConflictResolution } from '../types/index.js';

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
  
  // Move operations
  moveBookmark: (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => Promise<void>;
  moveBundle: (fromCategory: string, toCategory: string, bundleName: string) => Promise<void>;
  
  // Search and stats
  searchBookmarks: (filter?: BookmarkFilter) => BookmarkSearchResult[];
  getStats: () => BookmarkStats;
  
  // Sync operations
  syncWithRemote: () => Promise<void>;
  syncWithConflictResolution: (resolutions: ConflictResolution[]) => Promise<void>;
  checkConflicts: () => Promise<MergeConflict[]>;
  loadFromRemote: () => Promise<void>;
  saveToRemote: () => Promise<void>;
  
  // Import/Export operations
  importData: (data: string, format: 'json' | 'markdown') => Promise<void>;
  exportData: (format: 'json' | 'markdown') => Promise<string>;
  
  // State management
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
  
  // Business logic methods (delegate to service)
  canDragBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => boolean;
  canDropBookmark: (item: { categoryName: string; bundleName: string; bookmarkId: string }, targetCategory: string, targetBundle: string) => boolean;
  canDropBundle: (bundleName: string, fromCategory: string, toCategory: string) => boolean;
  getSourceBundle: (categoryName: string, bundleName: string) => { bookmarks: readonly Bookmark[]; name: string } | null;
  hasCategories: () => boolean;
  getCategories: () => readonly { name: string; bundles: readonly { name: string; bookmarks: readonly Bookmark[] }[] }[];
}

// Factory function removed - use useBookmarkContextProvider hook instead