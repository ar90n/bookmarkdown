import { Root, Bookmark, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats, MergeConflict, ConflictResolution } from '../types/index.js';
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
  moveBundleToCategory
} from '../core/index.js';
import { SyncShell, SyncResult } from '../shell/index.js';

export interface BookmarkService {
  // Data operations
  getRoot: () => Root;
  setRoot: (root: Root) => void;
  
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
  updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => Result<Root>;
  removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => Result<Root>;
  
  // Query operations
  searchBookmarks: (filter?: BookmarkFilter) => BookmarkSearchResult[];
  getStats: () => BookmarkStats;
  
  // Move operations
  moveBookmark: (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => Result<Root>;
  moveBundle: (fromCategory: string, toCategory: string, bundleName: string) => Result<Root>;
  
  // Business logic operations (to replace React state usage)
  canDragBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => boolean;
  canDropBookmark: (item: { categoryName: string; bundleName: string; bookmarkId: string }, targetCategory: string, targetBundle: string) => boolean;
  canDropBundle: (bundleName: string, fromCategory: string, toCategory: string) => boolean;
  getSourceBundle: (categoryName: string, bundleName: string) => { bookmarks: readonly Bookmark[]; name: string } | null;
  hasCategories: () => boolean;
  getCategories: () => readonly { name: string; bundles: readonly { name: string; bookmarks: readonly Bookmark[] }[] }[];
  
  // Sync operations
  loadFromSync: (gistId?: string) => Promise<Result<Root>>;
  saveToSync: (gistId?: string, description?: string) => Promise<Result<SyncResult>>;
  syncWithRemote: (gistId?: string) => Promise<Result<SyncResult>>;
  syncWithConflictResolution: (resolutions: ConflictResolution[], gistId?: string) => Promise<Result<SyncResult>>;
  checkConflicts: (gistId?: string) => Promise<Result<MergeConflict[]>>;
}

export const createBookmarkService = (syncShell?: SyncShell): BookmarkService => {
  let currentRoot: Root = createRoot();

  const validateCategoryExists = (categoryName: string): boolean => {
    return currentRoot.categories.some(category => category.name === categoryName);
  };

  const validateBundleExists = (categoryName: string, bundleName: string): boolean => {
    const category = currentRoot.categories.find(cat => cat.name === categoryName);
    return category?.bundles.some(bundle => bundle.name === bundleName) || false;
  };

  return {
    getRoot: () => {
      return currentRoot;
    },
    
    setRoot: (root: Root) => {
      currentRoot = JSON.parse(JSON.stringify(root));
    },

    addCategory: (name: string): Result<Root> => {
      if (currentRoot.categories.some(category => category.name === name)) {
        return failure(new Error(`Category '${name}' already exists`));
      }
      
      currentRoot = addCategoryToRoot(currentRoot, name);
      return success(currentRoot);
    },

    removeCategory: (name: string): Result<Root> => {
      if (!validateCategoryExists(name)) {
        return failure(new Error(`Category '${name}' not found`));
      }
      
      currentRoot = removeCategoryFromRoot(currentRoot, name);
      return success(currentRoot);
    },

    renameCategory: (oldName: string, newName: string): Result<Root> => {
      if (!validateCategoryExists(oldName)) {
        return failure(new Error(`Category '${oldName}' not found`));
      }
      
      if (currentRoot.categories.some(category => category.name === newName)) {
        return failure(new Error(`Category '${newName}' already exists`));
      }
      
      currentRoot = renameCategoryInRoot(currentRoot, oldName, newName);
      return success(currentRoot);
    },

    addBundle: (categoryName: string, bundleName: string): Result<Root> => {
      if (!validateCategoryExists(categoryName)) {
        return failure(new Error(`Category '${categoryName}' not found`));
      }
      
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      if (category?.bundles.some(bundle => bundle.name === bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' already exists in category '${categoryName}'`));
      }
      
      currentRoot = addBundleToRoot(currentRoot, categoryName, bundleName);
      return success(currentRoot);
    },

    removeBundle: (categoryName: string, bundleName: string): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      currentRoot = removeBundleFromRoot(currentRoot, categoryName, bundleName);
      return success(currentRoot);
    },

    renameBundle: (categoryName: string, oldName: string, newName: string): Result<Root> => {
      if (!validateBundleExists(categoryName, oldName)) {
        return failure(new Error(`Bundle '${oldName}' not found in category '${categoryName}'`));
      }
      
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      if (category?.bundles.some(bundle => bundle.name === newName)) {
        return failure(new Error(`Bundle '${newName}' already exists in category '${categoryName}'`));
      }
      
      currentRoot = renameBundleInRoot(currentRoot, categoryName, oldName, newName);
      return success(currentRoot);
    },

    addBookmark: (categoryName: string, bundleName: string, bookmark: BookmarkInput): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      currentRoot = addBookmarkToRoot(currentRoot, categoryName, bundleName, bookmark);
      return success(currentRoot);
    },

    updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      currentRoot = updateBookmarkInRoot(currentRoot, categoryName, bundleName, bookmarkId, update);
      return success(currentRoot);
    },

    removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string): Result<Root> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      currentRoot = removeBookmarkFromRoot(currentRoot, categoryName, bundleName, bookmarkId);
      return success(currentRoot);
    },

    searchBookmarks: (filter: BookmarkFilter = {}): BookmarkSearchResult[] => {
      return searchBookmarksInRoot(currentRoot, filter);
    },

    getStats: (): BookmarkStats => {
      return getStatsFromRoot(currentRoot);
    },

    loadFromSync: async (gistId?: string): Promise<Result<Root>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      const result = await syncShell.load(gistId);
      if (result.success) {
        currentRoot = result.data;
      }
      return result;
    },

    saveToSync: async (gistId?: string, description?: string): Promise<Result<SyncResult>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      return await syncShell.save(currentRoot, gistId, description);
    },

    syncWithRemote: async (gistId?: string): Promise<Result<SyncResult>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      const result = await syncShell.sync(currentRoot, gistId);
      
      // Update current root if sync was successful and no conflicts
      if (result.success && result.data.mergedRoot && !result.data.hasConflicts) {
        currentRoot = result.data.mergedRoot;
      }
      
      return result;
    },
    
    syncWithConflictResolution: async (resolutions: ConflictResolution[], gistId?: string): Promise<Result<SyncResult>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      const result = await syncShell.syncWithConflictResolution(currentRoot, resolutions, gistId);
      
      // Update current root if sync was successful
      if (result.success && result.data.mergedRoot) {
        currentRoot = result.data.mergedRoot;
      }
      
      return result;
    },
    
    checkConflicts: async (gistId?: string): Promise<Result<MergeConflict[]>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      return await syncShell.checkConflicts(currentRoot, gistId);
    },

    moveBookmark: (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string): Result<Root> => {
      // Get fresh root state using getRoot() to ensure we have the latest state
      const freshRoot = currentRoot; // Direct access since we're inside the service
      
      // CRITICAL FIX: Use fresh root for validation instead of global currentRoot
      const validateBundleExistsWithRoot = (root: Root, categoryName: string, bundleName: string): boolean => {
        const category = root.categories.find(cat => cat.name === categoryName);
        return category?.bundles.some(bundle => bundle.name === bundleName) || false;
      };
      
      // Enhanced validation with detailed error messages using fresh root
      if (!validateBundleExistsWithRoot(freshRoot, fromCategory, fromBundle)) {
        return failure(new Error(`Source bundle '${fromBundle}' not found in category '${fromCategory}'`));
      }
      
      if (!validateBundleExistsWithRoot(freshRoot, toCategory, toBundle)) {
        return failure(new Error(`Target bundle '${toBundle}' not found in category '${toCategory}'`));
      }
      
      // Additional validation with current state information
      const sourceCategory = freshRoot.categories.find(cat => cat.name === fromCategory);
      const sourceBundle = sourceCategory?.bundles.find(bundle => bundle.name === fromBundle);
      
      if (!sourceBundle) {
        return failure(new Error(`Source bundle '${fromBundle}' not found in category '${fromCategory}' during move operation`));
      }
      
      const bookmarkExists = sourceBundle.bookmarks.some(bookmark => bookmark.id === bookmarkId);
      if (!bookmarkExists) {
        // Provide detailed debugging information
        const bookmarkIds = sourceBundle.bookmarks.map(b => b.id);
        return failure(new Error(`Bookmark with id '${bookmarkId}' not found in source bundle '${fromBundle}' in category '${fromCategory}'. Available bookmark IDs: [${bookmarkIds.join(', ')}]`));
      }
      
      try {
        // Use fresh root state for the move operation
        currentRoot = moveBookmarkToBundle(freshRoot, fromCategory, fromBundle, toCategory, toBundle, bookmarkId);
        return success(currentRoot);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to move bookmark';
        return failure(new Error(`Move operation failed: ${errorMessage}`));
      }
    },

    moveBundle: (fromCategory: string, toCategory: string, bundleName: string): Result<Root> => {
      if (!validateBundleExists(fromCategory, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${fromCategory}'`));
      }
      
      if (!validateCategoryExists(toCategory)) {
        return failure(new Error(`Target category '${toCategory}' not found`));
      }
      
      try {
        currentRoot = moveBundleToCategory(currentRoot, fromCategory, toCategory, bundleName);
        return success(currentRoot);
      } catch (error) {
        return failure(error instanceof Error ? error : new Error('Failed to move bundle'));
      }
    },

    // Business logic operations (to replace React state usage)
    canDragBookmark: (categoryName: string, bundleName: string, bookmarkId: string): boolean => {
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      const bundle = category?.bundles.find(b => b.name === bundleName);
      const bookmarkExists = bundle?.bookmarks.some(b => b.id === bookmarkId);
      
      return bookmarkExists || false;
    },

    canDropBookmark: (item: { categoryName: string; bundleName: string; bookmarkId: string }, targetCategory: string, targetBundle: string): boolean => {
      // Don't allow dropping on the same bundle
      if (item.categoryName === targetCategory && item.bundleName === targetBundle) {
        return false;
      }
      
      // Verify source bookmark exists
      const sourceCategory = currentRoot.categories.find(cat => cat.name === item.categoryName);
      const sourceBundle = sourceCategory?.bundles.find(b => b.name === item.bundleName);
      const sourceExists = sourceBundle?.bookmarks.some(b => b.id === item.bookmarkId);
      
      // Verify target bundle exists
      const targetCategoryObj = currentRoot.categories.find(cat => cat.name === targetCategory);
      const targetExists = targetCategoryObj?.bundles.some(b => b.name === targetBundle);
      
      return (sourceExists && targetExists) || false;
    },

    canDropBundle: (bundleName: string, fromCategory: string, toCategory: string): boolean => {
      // Don't allow dropping on the same category
      if (fromCategory === toCategory) {
        return false;
      }
      
      // Verify source bundle exists
      const sourceExists = currentRoot.categories
        .find(cat => cat.name === fromCategory)
        ?.bundles.some(b => b.name === bundleName);
      
      // Verify target category exists
      const targetExists = currentRoot.categories.some(cat => cat.name === toCategory);
      
      return (sourceExists && targetExists) || false;
    },

    getSourceBundle: (categoryName: string, bundleName: string): { bookmarks: readonly Bookmark[]; name: string } | null => {
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      const bundle = category?.bundles.find(b => b.name === bundleName);
      
      if (bundle) {
        return bundle;
      }
      
      return null;
    },

    hasCategories: (): boolean => {
      const hasCategories = currentRoot.categories.length > 0;
      return hasCategories;
    },

    getCategories: (): readonly { name: string; bundles: readonly { name: string; bookmarks: readonly Bookmark[] }[] }[] => {
      return currentRoot.categories;
    },
  };
};