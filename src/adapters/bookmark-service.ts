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
  getStatsFromRoot
} from '../core/index.js';
import { SyncShell } from '../shell/index.js';

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
  
  // Sync operations
  loadFromSync: (gistId?: string) => Promise<Result<Root>>;
  saveToSync: (gistId?: string, description?: string) => Promise<Result<{ gistId: string; updatedAt: string }>>;
  syncWithRemote: (gistId?: string) => Promise<Result<{ gistId: string; updatedAt: string }>>;
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
    getRoot: () => currentRoot,
    
    setRoot: (root: Root) => {
      currentRoot = root;
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

    saveToSync: async (gistId?: string, description?: string): Promise<Result<{ gistId: string; updatedAt: string }>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      return await syncShell.save(currentRoot, gistId, description);
    },

    syncWithRemote: async (gistId?: string): Promise<Result<{ gistId: string; updatedAt: string }>> => {
      if (!syncShell) {
        return failure(new Error('Sync shell not configured'));
      }
      
      return await syncShell.sync(currentRoot, gistId);
    },
  };
};