import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats } from '../types/index.js';
import { Result } from '../types/result.js';
import { BookmarkService } from '../adapters/index.js';

export interface BookmarkContextState {
  readonly root: Root;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly lastSyncAt: Date | null;
  readonly isDirty: boolean; // Has unsaved changes
}

export interface BookmarkContextValue extends BookmarkContextState {
  // Core operations
  addCategory: (name: string) => Promise<Result<Root>>;
  removeCategory: (name: string) => Promise<Result<Root>>;
  renameCategory: (oldName: string, newName: string) => Promise<Result<Root>>;
  
  // Bundle operations
  addBundle: (categoryName: string, bundleName: string) => Promise<Result<Root>>;
  removeBundle: (categoryName: string, bundleName: string) => Promise<Result<Root>>;
  renameBundle: (categoryName: string, oldName: string, newName: string) => Promise<Result<Root>>;
  
  // Bookmark operations
  addBookmark: (categoryName: string, bundleName: string, bookmark: BookmarkInput) => Promise<Result<Root>>;
  updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => Promise<Result<Root>>;
  removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => Promise<Result<Root>>;
  
  // Search and stats
  searchBookmarks: (filter?: BookmarkFilter) => BookmarkSearchResult[];
  getStats: () => BookmarkStats;
  
  // Sync operations
  syncWithRemote: () => Promise<Result<{ gistId: string; updatedAt: string }>>;
  loadFromRemote: () => Promise<Result<Root>>;
  saveToRemote: () => Promise<Result<{ gistId: string; updatedAt: string }>>;
  
  // State management
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

export interface BookmarkContextActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRoot: (root: Root) => void;
  setLastSyncAt: (date: Date | null) => void;
  setDirty: (dirty: boolean) => void;
}

export const createBookmarkContextValue = (
  service: BookmarkService,
  state: BookmarkContextState,
  actions: BookmarkContextActions
): BookmarkContextValue => {
  
  const withAsyncOperation = async <T>(
    operation: () => Promise<Result<T>>,
    onSuccess?: (data: T) => void
  ): Promise<Result<T>> => {
    actions.setLoading(true);
    actions.setError(null);
    
    try {
      const result = await operation();
      
      if (result.success) {
        actions.setDirty(true);
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        actions.setError(result.error.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      actions.setError(errorMessage);
      return { success: false, error: new Error(errorMessage) } as Result<T>;
    } finally {
      actions.setLoading(false);
    }
  };

  return {
    // State
    ...state,
    
    // Category operations
    addCategory: async (name: string) => 
      withAsyncOperation(
        async () => {
          const result = service.addCategory(name);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),
      
    removeCategory: async (name: string) =>
      withAsyncOperation(
        async () => {
          const result = service.removeCategory(name);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),
      
    renameCategory: async (oldName: string, newName: string) =>
      withAsyncOperation(
        async () => {
          const result = service.renameCategory(oldName, newName);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),

    // Bundle operations
    addBundle: async (categoryName: string, bundleName: string) =>
      withAsyncOperation(
        async () => {
          const result = service.addBundle(categoryName, bundleName);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),
      
    removeBundle: async (categoryName: string, bundleName: string) =>
      withAsyncOperation(
        async () => {
          const result = service.removeBundle(categoryName, bundleName);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),
      
    renameBundle: async (categoryName: string, oldName: string, newName: string) =>
      withAsyncOperation(
        async () => {
          const result = service.renameBundle(categoryName, oldName, newName);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),

    // Bookmark operations
    addBookmark: async (categoryName: string, bundleName: string, bookmark: BookmarkInput) =>
      withAsyncOperation(
        async () => {
          const result = service.addBookmark(categoryName, bundleName, bookmark);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),
      
    updateBookmark: async (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) =>
      withAsyncOperation(
        async () => {
          const result = service.updateBookmark(categoryName, bundleName, bookmarkId, update);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),
      
    removeBookmark: async (categoryName: string, bundleName: string, bookmarkId: string) =>
      withAsyncOperation(
        async () => {
          const result = service.removeBookmark(categoryName, bundleName, bookmarkId);
          if (result.success) {
            actions.setRoot(result.data);
          }
          return result;
        }
      ),

    // Search and stats
    searchBookmarks: (filter?: BookmarkFilter) => {
      try {
        return service.searchBookmarks(filter || {});
      } catch (error) {
        actions.setError(error instanceof Error ? error.message : 'Search failed');
        return [];
      }
    },
      
    getStats: () => {
      try {
        return service.getStats();
      } catch (error) {
        actions.setError(error instanceof Error ? error.message : 'Stats failed');
        return { categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 };
      }
    },

    // Sync operations
    syncWithRemote: async () =>
      withAsyncOperation(
        async () => {
          const result = await service.syncWithRemote();
          if (result.success) {
            actions.setRoot(service.getRoot());
            actions.setLastSyncAt(new Date());
            actions.setDirty(false);
          }
          return result;
        }
      ),
      
    loadFromRemote: async () =>
      withAsyncOperation(
        async () => {
          const result = await service.loadFromSync();
          if (result.success) {
            actions.setRoot(result.data);
            actions.setLastSyncAt(new Date());
            actions.setDirty(false);
          }
          return result;
        }
      ),
      
    saveToRemote: async () =>
      withAsyncOperation(
        async () => {
          const result = await service.saveToSync();
          if (result.success) {
            actions.setLastSyncAt(new Date());
            actions.setDirty(false);
          }
          return result;
        }
      ),

    // State management
    setError: (error: string | null) => actions.setError(error),
    clearError: () => actions.setError(null),
    resetState: () => {
      actions.setRoot(service.getRoot());
      actions.setError(null);
      actions.setLoading(false);
      actions.setLastSyncAt(null);
      actions.setDirty(false);
    }
  };
};