import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats } from '../types/index.js';
import { 
  createCategory, 
  addCategory, 
  updateCategoryByName, 
  removeCategoryByName, 
  renameCategoryByName,
  addBundleToCategory,
  removeBundleFromCategory,
  renameBundleInCategory,
  addBookmarkToCategory,
  updateBookmarkInCategory,
  removeBookmarkFromCategory
} from './category.js';
import { bookmarkMatchesFilter } from './bookmark.js';
import { initializeRootMetadata, updateRootMetadata, updateCategoryMetadata, getCurrentTimestamp } from '../utils/metadata.js';

export const createRoot = (): Root => initializeRootMetadata({
  version: 1,
  categories: [],
});

export const addCategoryToRoot = (root: Root, categoryName: string): Root => {
  const category = createCategory(categoryName);
  const updatedRoot = {
    ...root,
    categories: addCategory(root.categories, category),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const removeCategoryFromRoot = (root: Root, categoryName: string): Root => {
  const updatedRoot = {
    ...root,
    categories: removeCategoryByName(root.categories, categoryName),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const renameCategoryInRoot = (root: Root, oldName: string, newName: string): Root => {
  const updatedRoot = {
    ...root,
    categories: renameCategoryByName(root.categories, oldName, newName),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const addBundleToRoot = (root: Root, categoryName: string, bundleName: string): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(addBundleToCategory(category, bundleName))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const removeBundleFromRoot = (root: Root, categoryName: string, bundleName: string): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(removeBundleFromCategory(category, bundleName))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const renameBundleInRoot = (
  root: Root, 
  categoryName: string, 
  oldName: string, 
  newName: string
): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(renameBundleInCategory(category, oldName, newName))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const addBookmarkToRoot = (
  root: Root, 
  categoryName: string, 
  bundleName: string, 
  bookmarkInput: BookmarkInput
): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(addBookmarkToCategory(category, bundleName, bookmarkInput))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const updateBookmarkInRoot = (
  root: Root, 
  categoryName: string, 
  bundleName: string, 
  bookmarkId: string, 
  update: BookmarkUpdate
): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(updateBookmarkInCategory(category, bundleName, bookmarkId, update))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const removeBookmarkFromRoot = (
  root: Root, 
  categoryName: string, 
  bundleName: string, 
  bookmarkId: string
): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(removeBookmarkFromCategory(category, bundleName, bookmarkId))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const searchBookmarksInRoot = (root: Root, filter: BookmarkFilter = {}): BookmarkSearchResult[] => {
  const results: BookmarkSearchResult[] = [];

  for (const category of root.categories) {
    if (filter.categoryName && category.name !== filter.categoryName) {
      continue;
    }

    for (const bundle of category.bundles) {
      if (filter.bundleName && bundle.name !== filter.bundleName) {
        continue;
      }

      for (const bookmark of bundle.bookmarks) {
        if (bookmarkMatchesFilter(bookmark, filter)) {
          results.push({
            bookmark,
            categoryName: category.name,
            bundleName: bundle.name
          });
        }
      }
    }
  }

  return results;
};

export const getStatsFromRoot = (root: Root): BookmarkStats => {
  let bundlesCount = 0;
  let bookmarksCount = 0;
  const allTags = new Set<string>();

  for (const category of root.categories) {
    bundlesCount += category.bundles.length;
    
    for (const bundle of category.bundles) {
      bookmarksCount += bundle.bookmarks.length;
      
      for (const bookmark of bundle.bookmarks) {
        if (bookmark.tags) {
          bookmark.tags.forEach((tag: string) => allTags.add(tag.toLowerCase()));
        }
      }
    }
  }

  return {
    categoriesCount: root.categories.length,
    bundlesCount,
    bookmarksCount,
    tagsCount: allTags.size
  };
};