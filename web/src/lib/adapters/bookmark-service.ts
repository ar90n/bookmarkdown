import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats } from '../types/index.js';
import { Result, success, failure } from '../types/result.js';
import { 
  createRoot,
  addCategoryToRoot,
  removeCategoryFromRoot,
  renameCategoryInRoot,
  addBundleToRoot,
  removeBundleFromRoot,
  renameBundleInRoot,
  addBookmarkToRoot,
  updateBookmarkInRoot,
  removeBookmarkFromRoot,
  searchBookmarksInRoot,
  getStatsFromRoot,
  moveBookmarkToBundle,
  moveBundleToCategory,
  reorderCategoriesInRoot,
  reorderBundlesInRoot
} from '../core/index.js';
import { GistSyncShell, GistSyncResult } from '../shell/gist-sync.js';

export interface BookmarkService {
  // Data operations
  getRoot: () => Root;
  isDirty: () => boolean;
  
  // Category operations
  addCategory: (name: string) => Result<Root>;
  removeCategory: (name: string) => Result<Root>;
  renameCategory: (oldName: string, newName: string) => Result<Root>;
  
  // Bundle operations
  addBundle: (categoryName: string, bundleName: string) => Result<Root>;
  removeBundle: (categoryName: string, bundleName: string) => Result<Root>;
  renameBundle: (categoryName: string, oldName: string, newName: string) => Result<Root>;
  
  // Bookmark operations
  addBookmark: (categoryName: string, bundleName: string, bookmark: BookmarkInput) => Result<Root>;
  addBookmarksBatch: (categoryName: string, bundleName: string, bookmarks: BookmarkInput[]) => Result<Root>;
  updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => Result<Root>;
  removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => Result<Root>;
  
  // Query operations
  searchBookmarks: (filter?: BookmarkFilter) => BookmarkSearchResult[];
  getStats: () => BookmarkStats;
  
  // Move operations
  moveBookmark: (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => Result<Root>;
  moveBundle: (fromCategory: string, toCategory: string, bundleName: string) => Result<Root>;
  
  // Reorder operations
  reorderCategories: (categoryName: string, newIndex: number) => Result<Root>;
  reorderBundles: (categoryName: string, bundleName: string, newIndex: number) => Result<Root>;
  
  // Sync operations
  loadFromRemote: () => Promise<Result<Root>>;
  saveToRemote: (description?: string) => Promise<Result<GistSyncResult>>;
  hasRemoteChanges: () => Promise<Result<boolean>>;
  forceReload: () => Promise<Result<Root>>;
  getGistInfo: () => { gistId?: string; etag?: string };
  isSyncConfigured: () => boolean;
}

export interface BookmarkServiceConfig {
  onRemoteChangeDetected?: () => void;
}

export const createBookmarkService = (syncShell?: GistSyncShell, config?: BookmarkServiceConfig): BookmarkService => {
  let currentRoot: Root = createRoot();
  let dirtyState = false;
  const onRemoteChangeDetected = config?.onRemoteChangeDetected;

  const validateCategoryExists = (categoryName: string): boolean => {
    return currentRoot.categories.some(category => category.name === categoryName);
  };

  const validateBundleExists = (categoryName: string, bundleName: string): boolean => {
    const category = currentRoot.categories.find(cat => cat.name === categoryName);
    return category?.bundles.some(bundle => bundle.name === bundleName) || false;
  };
  
  const updateRoot = (newRoot: Root, markDirty = true): Root => {
    currentRoot = newRoot;
    if (markDirty) {
      dirtyState = true;
    }
    return currentRoot;
  };

  const service: BookmarkService = {
    getRoot: () => currentRoot,
    isDirty: () => dirtyState,

    // Category operations (synchronous, local only)
    addCategory: (name: string): Result<Root> => {
      const normalizedName = name.trim();
      
      if (!normalizedName) {
        return failure(new Error('Category name cannot be empty'));
      }
      
      if (currentRoot.categories.some(category => category.name.trim() === normalizedName)) {
        return failure(new Error(`Category '${normalizedName}' already exists`));
      }
      
      return success(updateRoot(addCategoryToRoot(currentRoot, normalizedName)));
    },

    removeCategory: (name: string): Result<Root> => {
      if (!validateCategoryExists(name)) {
        return failure(new Error(`Category '${name}' not found`));
      }
      
      return success(updateRoot(removeCategoryFromRoot(currentRoot, name)));
    },

    renameCategory: (oldName: string, newName: string): Result<Root> => {
      if (!validateCategoryExists(oldName)) {
        return failure(new Error(`Category '${oldName}' not found`));
      }
      
      if (currentRoot.categories.some(category => category.name === newName)) {
        return failure(new Error(`Category '${newName}' already exists`));
      }
      
      return success(updateRoot(renameCategoryInRoot(currentRoot, oldName, newName)));
    },

    // Bundle operations (synchronous, local only)
    addBundle: (categoryName: string, bundleName: string): Result<Root> => {
      if (!validateCategoryExists(categoryName)) {
        return failure(new Error(`Category '${categoryName}' not found`));
      }
      
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      if (category?.bundles.some(bundle => bundle.name === bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' already exists in category '${categoryName}'`));
      }
      
      return success(updateRoot(addBundleToRoot(currentRoot, categoryName, bundleName)));
    },

    removeBundle: (categoryName: string, bundleName: string): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      return success(updateRoot(removeBundleFromRoot(currentRoot, categoryName, bundleName)));
    },

    renameBundle: (categoryName: string, oldName: string, newName: string): Result<Root> => {
      if (!validateBundleExists(categoryName, oldName)) {
        return failure(new Error(`Bundle '${oldName}' not found in category '${categoryName}'`));
      }
      
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      if (category?.bundles.some(bundle => bundle.name === newName)) {
        return failure(new Error(`Bundle '${newName}' already exists in category '${categoryName}'`));
      }
      
      return success(updateRoot(renameBundleInRoot(currentRoot, categoryName, oldName, newName)));
    },

    // Bookmark operations (synchronous, local only)
    addBookmark: (categoryName: string, bundleName: string, bookmark: BookmarkInput): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      return success(updateRoot(addBookmarkToRoot(currentRoot, categoryName, bundleName, bookmark)));
    },

    addBookmarksBatch: (categoryName: string, bundleName: string, bookmarks: BookmarkInput[]): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      if (bookmarks.length === 0) {
        return success(currentRoot);
      }
      
      let root = currentRoot;
      for (const bookmark of bookmarks) {
        root = addBookmarkToRoot(root, categoryName, bundleName, bookmark);
      }
      
      return success(updateRoot(root));
    },

    updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      return success(updateRoot(updateBookmarkInRoot(currentRoot, categoryName, bundleName, bookmarkId, update)));
    },

    removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      return success(updateRoot(removeBookmarkFromRoot(currentRoot, categoryName, bundleName, bookmarkId)));
    },

    // Query operations
    searchBookmarks: (filter: BookmarkFilter = {}): BookmarkSearchResult[] => {
      return searchBookmarksInRoot(currentRoot, filter);
    },

    getStats: (): BookmarkStats => {
      return getStatsFromRoot(currentRoot);
    },

    // Move operations
    moveBookmark: (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string): Result<Root> => {
      try {
        return success(updateRoot(moveBookmarkToBundle(currentRoot, fromCategory, fromBundle, toCategory, toBundle, bookmarkId)));
      } catch (error) {
        return failure(error instanceof Error ? error : new Error('Failed to move bookmark'));
      }
    },

    moveBundle: (fromCategory: string, toCategory: string, bundleName: string): Result<Root> => {
      try {
        return success(updateRoot(moveBundleToCategory(currentRoot, fromCategory, toCategory, bundleName)));
      } catch (error) {
        return failure(error instanceof Error ? error : new Error('Failed to move bundle'));
      }
    },

    // Reorder operations
    reorderCategories: (categoryName: string, newIndex: number): Result<Root> => {
      try {
        return success(updateRoot(reorderCategoriesInRoot(currentRoot, categoryName, newIndex)));
      } catch (error) {
        return failure(error instanceof Error ? error : new Error('Failed to reorder categories'));
      }
    },

    reorderBundles: (categoryName: string, bundleName: string, newIndex: number): Result<Root> => {
      try {
        return success(updateRoot(reorderBundlesInRoot(currentRoot, categoryName, bundleName, newIndex)));
      } catch (error) {
        return failure(error instanceof Error ? error : new Error('Failed to reorder bundles'));
      }
    },


    // Sync operations
    loadFromRemote: async (): Promise<Result<Root>> => {
      if (!syncShell) {
        return failure(new Error('Sync not configured'));
      }
      
      const result = await syncShell.load();
      if (result.success) {
        updateRoot(result.data, false); // Don't mark dirty on load
        dirtyState = false; // Reset dirty state after successful load
      }
      return result;
    },

    saveToRemote: async (description?: string): Promise<Result<GistSyncResult>> => {
      if (!syncShell) {
        return failure(new Error('Sync not configured'));
      }
      
      const result = await syncShell.save(currentRoot, description);
      if (result.success) {
        dirtyState = false; // Reset dirty state after successful save
      }
      return result;
    },

    hasRemoteChanges: async (): Promise<Result<boolean>> => {
      if (!syncShell) {
        return success(false);
      }
      
      return syncShell.isRemoteUpdated();
    },

    forceReload: async (): Promise<Result<Root>> => {
      if (!syncShell) {
        return failure(new Error('Sync not configured'));
      }
      
      // Force reload by just loading again
      const result = await syncShell.load();
      if (result.success) {
        updateRoot(result.data, false); // Don't mark dirty on load
        dirtyState = false; // Reset dirty state after successful load
      }
      return result;
    },
    
    getGistInfo: (): { gistId?: string; etag?: string } => {
      return syncShell?.getGistInfo() || {};
    },
    
    isSyncConfigured: (): boolean => {
      return syncShell !== undefined && syncShell !== null;
    }
  };
  
  // Add onRemoteChangeDetected for testing purposes
  if (onRemoteChangeDetected) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).onRemoteChangeDetected = onRemoteChangeDetected;
  }
  
  return service;
};