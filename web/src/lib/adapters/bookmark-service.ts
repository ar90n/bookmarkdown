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
  markBundleAsDeletedInRoot,
  markCategoryAsDeletedInRoot,
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
  
  // Category operations (now async with transactional sync)
  addCategory: (name: string) => Promise<Result<Root>>;
  removeCategory: (name: string) => Promise<Result<Root>>;
  renameCategory: (oldName: string, newName: string) => Promise<Result<Root>>;
  
  // Bundle operations (now async with transactional sync)
  addBundle: (categoryName: string, bundleName: string) => Promise<Result<Root>>;
  removeBundle: (categoryName: string, bundleName: string) => Promise<Result<Root>>;
  renameBundle: (categoryName: string, oldName: string, newName: string) => Promise<Result<Root>>;
  
  // Bookmark operations (now async with transactional sync)
  addBookmark: (categoryName: string, bundleName: string, bookmark: BookmarkInput) => Promise<Result<Root>>;
  addBookmarksBatch: (categoryName: string, bundleName: string, bookmarks: BookmarkInput[]) => Promise<Result<Root>>;
  updateBookmark: (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => Promise<Result<Root>>;
  removeBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => Promise<Result<Root>>;
  
  // Query operations
  searchBookmarks: (filter?: BookmarkFilter) => BookmarkSearchResult[];
  getStats: () => BookmarkStats;
  
  // Move operations (now async with transactional sync)
  moveBookmark: (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => Promise<Result<Root>>;
  moveBundle: (fromCategory: string, toCategory: string, bundleName: string) => Promise<Result<Root>>;
  
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

    addCategory: async (name: string): Promise<Result<Root>> => {
      // Normalize category name
      const normalizedName = name.trim();
      
      if (!normalizedName) {
        return failure(new Error('Category name cannot be empty'));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        if (currentRoot.categories.some(category => category.name.trim() === normalizedName)) {
          return failure(new Error(`Category '${normalizedName}' already exists`));
        }
        currentRoot = addCategoryToRoot(currentRoot, normalizedName);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if category already exists after sync
      if (currentRoot.categories.some(category => category.name.trim() === normalizedName)) {
        return failure(new Error(`Category '${normalizedName}' already exists`));
      }
      
      // Perform operation
      currentRoot = addCategoryToRoot(currentRoot, normalizedName);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    removeCategory: async (name: string): Promise<Result<Root>> => {
      if (!syncShell) {
        // No sync - operate locally only
        if (!validateCategoryExists(name)) {
          return failure(new Error(`Category '${name}' not found`));
        }
        currentRoot = removeCategoryFromRoot(currentRoot, name);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if category still exists after sync
      if (!validateCategoryExists(name)) {
        return success(currentRoot);
      }
      
      // Perform operation
      currentRoot = markCategoryAsDeletedInRoot(currentRoot, name);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    renameCategory: async (oldName: string, newName: string): Promise<Result<Root>> => {
      if (!validateCategoryExists(oldName)) {
        return failure(new Error(`Category '${oldName}' not found`));
      }
      
      if (currentRoot.categories.some(category => category.name === newName)) {
        return failure(new Error(`Category '${newName}' already exists`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        currentRoot = renameCategoryInRoot(currentRoot, oldName, newName);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Re-validate after sync
      if (!validateCategoryExists(oldName)) {
        return failure(new Error(`Category '${oldName}' not found after sync`));
      }
      
      if (currentRoot.categories.some(category => category.name === newName)) {
        return failure(new Error(`Category '${newName}' already exists after sync`));
      }
      
      // Perform operation
      currentRoot = renameCategoryInRoot(currentRoot, oldName, newName);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    addBundle: async (categoryName: string, bundleName: string): Promise<Result<Root>> => {
      if (!validateCategoryExists(categoryName)) {
        return failure(new Error(`Category '${categoryName}' not found`));
      }
      
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      if (category?.bundles.some(bundle => bundle.name === bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' already exists in category '${categoryName}'`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        currentRoot = addBundleToRoot(currentRoot, categoryName, bundleName);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if bundle already exists after sync
      const categoryAfterSync = currentRoot.categories.find(cat => cat.name === categoryName);
      if (categoryAfterSync?.bundles.some(bundle => bundle.name === bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' already exists in category '${categoryName}'`));
      }
      
      // Perform operation
      currentRoot = addBundleToRoot(currentRoot, categoryName, bundleName);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    removeBundle: async (categoryName: string, bundleName: string): Promise<Result<Root>> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only (hard delete for immediate removal)
        currentRoot = removeBundleFromRoot(currentRoot, categoryName, bundleName);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if bundle still exists after sync
      if (!validateBundleExists(categoryName, bundleName)) {
        return success(currentRoot);
      }
      
      // Perform operation
      currentRoot = markBundleAsDeletedInRoot(currentRoot, categoryName, bundleName);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    renameBundle: async (categoryName: string, oldName: string, newName: string): Promise<Result<Root>> => {
      if (!validateBundleExists(categoryName, oldName)) {
        return failure(new Error(`Bundle '${oldName}' not found in category '${categoryName}'`));
      }
      
      const category = currentRoot.categories.find(cat => cat.name === categoryName);
      if (category?.bundles.some(bundle => bundle.name === newName)) {
        return failure(new Error(`Bundle '${newName}' already exists in category '${categoryName}'`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        currentRoot = renameBundleInRoot(currentRoot, categoryName, oldName, newName);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if old bundle still exists and new name is available after sync
      if (!validateBundleExists(categoryName, oldName)) {
        return failure(new Error(`Bundle '${oldName}' not found in category '${categoryName}' after sync`));
      }
      
      const categoryAfterSync = currentRoot.categories.find(cat => cat.name === categoryName);
      if (categoryAfterSync?.bundles.some(bundle => bundle.name === newName)) {
        return failure(new Error(`Bundle '${newName}' already exists in category '${categoryName}' after sync`));
      }
      
      // Perform operation
      currentRoot = renameBundleInRoot(currentRoot, categoryName, oldName, newName);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    addBookmark: async (categoryName: string, bundleName: string, bookmark: BookmarkInput): Promise<Result<Root>> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        currentRoot = addBookmarkToRoot(currentRoot, categoryName, bundleName, bookmark);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if bundle still exists after sync
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}' after sync`));
      }
      
      // Perform operation
      currentRoot = addBookmarkToRoot(currentRoot, categoryName, bundleName, bookmark);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    addBookmarksBatch: async (categoryName: string, bundleName: string, bookmarks: BookmarkInput[]): Promise<Result<Root>> => {
      
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      if (bookmarks.length === 0) {
        return success(currentRoot);
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        for (const bookmark of bookmarks) {
          currentRoot = addBookmarkToRoot(currentRoot, categoryName, bundleName, bookmark);
        }
        return success(currentRoot);
      }
      
      // Single sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if bundle still exists after sync
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}' after sync`));
      }
      
      // Add all bookmarks locally (fast operation)
      for (const bookmark of bookmarks) {
        currentRoot = addBookmarkToRoot(currentRoot, categoryName, bundleName, bookmark);
      }
      
      // Single save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    updateBookmark: async (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate): Promise<Result<Root>> => {
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        currentRoot = updateBookmarkInRoot(currentRoot, categoryName, bundleName, bookmarkId, update);
        return success(currentRoot);
      }
      
      // Sync before operation
      const syncResult = await syncShell.syncBeforeOperation(currentRoot);
      if (!syncResult.success) {
        return failure(new Error(`Sync failed: ${syncResult.error.message}`));
      }
      
      // Update current root with synced data
      currentRoot = syncResult.data;
      
      // Check if bundle still exists after sync
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}' after sync`));
      }
      
      // Perform operation
      currentRoot = updateBookmarkInRoot(currentRoot, categoryName, bundleName, bookmarkId, update);
      
      // Save to remote
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    removeBookmark: async (categoryName: string, bundleName: string, bookmarkId: string): Promise<Result<Root>> => {
      
      if (!validateBundleExists(categoryName, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${categoryName}'`));
      }
      
      
      if (!syncShell) {
        // No sync - operate locally only (hard delete for immediate removal)
        
        currentRoot = removeBookmarkFromRoot(currentRoot, categoryName, bundleName, bookmarkId);
        
        
        return success(currentRoot);
      }
      
      // BYPASS SYNC FOR DELETION - Use hard delete for immediate user feedback
      
      // Perform hard delete for immediate UI feedback
      currentRoot = removeBookmarkFromRoot(currentRoot, categoryName, bundleName, bookmarkId);
      
      
      // Save to remote without sync to persist the change
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps if available
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
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

    moveBookmark: async (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string): Promise<Result<Root>> => {
      
      // Helper function for validation
      const validateBundleExistsWithRoot = (root: Root, categoryName: string, bundleName: string): boolean => {
        const category = root.categories.find(cat => cat.name === categoryName);
        return category?.bundles.some(bundle => bundle.name === bundleName) || false;
      };
      
      // Initial validation
      if (!validateBundleExistsWithRoot(currentRoot, fromCategory, fromBundle)) {
        return failure(new Error(`Source bundle '${fromBundle}' not found in category '${fromCategory}'`));
      }
      
      if (!validateBundleExistsWithRoot(currentRoot, toCategory, toBundle)) {
        return failure(new Error(`Target bundle '${toBundle}' not found in category '${toCategory}'`));
      }
      
      // Additional validation
      const sourceCategory = currentRoot.categories.find(cat => cat.name === fromCategory);
      const sourceBundle = sourceCategory?.bundles.find(bundle => bundle.name === fromBundle);
      
      if (!sourceBundle) {
        return failure(new Error(`Source bundle '${fromBundle}' not found in category '${fromCategory}' during move operation`));
      }
      
      
      // Check only active (non-deleted) bookmarks
      const activeBookmarks = sourceBundle.bookmarks.filter(bookmark => !bookmark.metadata?.isDeleted);
      
      const bookmarkExists = activeBookmarks.some(bookmark => bookmark.id === bookmarkId);
      
      if (!bookmarkExists) {
        const activeBookmarkIds = activeBookmarks.map(b => b.id);
        return failure(new Error(`Bookmark with id '${bookmarkId}' not found in source bundle '${fromBundle}' in category '${fromCategory}'. Available active bookmark IDs: [${activeBookmarkIds.join(', ')}]`));
      }
      
      
      if (!syncShell) {
        // No sync - operate locally only
        try {
          currentRoot = moveBookmarkToBundle(currentRoot, fromCategory, fromBundle, toCategory, toBundle, bookmarkId);
          return success(currentRoot);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to move bookmark';
          return failure(new Error(`Move operation failed: ${errorMessage}`));
        }
      }
      
      // BYPASS SYNC FOR MOVE - Use direct move for immediate user feedback
      
      // Perform move operation directly
      try {
        currentRoot = moveBookmarkToBundle(currentRoot, fromCategory, fromBundle, toCategory, toBundle, bookmarkId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to move bookmark';
        return failure(new Error(`Move operation failed: ${errorMessage}`));
      }
      
      // Save to remote without sync to persist the change
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps if available
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
    },

    moveBundle: async (fromCategory: string, toCategory: string, bundleName: string): Promise<Result<Root>> => {
      if (!validateBundleExists(fromCategory, bundleName)) {
        return failure(new Error(`Bundle '${bundleName}' not found in category '${fromCategory}'`));
      }
      
      if (!validateCategoryExists(toCategory)) {
        return failure(new Error(`Target category '${toCategory}' not found`));
      }
      
      if (!syncShell) {
        // No sync - operate locally only
        try {
          currentRoot = moveBundleToCategory(currentRoot, fromCategory, toCategory, bundleName);
          return success(currentRoot);
        } catch (error) {
          return failure(error instanceof Error ? error : new Error('Failed to move bundle'));
        }
      }
      
      // BYPASS SYNC FOR MOVE - Use direct move for immediate user feedback
      
      // Perform move operation directly
      try {
        currentRoot = moveBundleToCategory(currentRoot, fromCategory, toCategory, bundleName);
      } catch (error) {
        return failure(error instanceof Error ? error : new Error('Failed to move bundle'));
      }
      
      // Save to remote without sync to persist the change
      const saveResult = await syncShell.saveAfterOperation(currentRoot);
      if (!saveResult.success) {
        return failure(new Error(`Failed to save: ${saveResult.error.message}`));
      }
      
      // Update with synced timestamps if available
      if (saveResult.data.mergedRoot) {
        currentRoot = saveResult.data.mergedRoot;
      }
      
      return success(currentRoot);
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
      const hasCategories = currentRoot.categories.some(category => !category.metadata?.isDeleted);
      return hasCategories;
    },

    getCategories: (): readonly { name: string; bundles: readonly { name: string; bookmarks: readonly Bookmark[] }[] }[] => {
      return currentRoot.categories.filter(category => !category.metadata?.isDeleted);
    },
  };
};