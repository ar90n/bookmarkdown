import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats, Bookmark, Bundle } from '../types/index.js';
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
  removeBookmarkFromCategory,
  markBookmarkAsDeletedInCategory,
  markBundleAsDeletedInCategory,
  markCategoryAsDeleted
} from './category.js';
import { bookmarkMatchesFilter, filterActiveBookmarks } from './bookmark.js';
import { initializeRootMetadata, updateRootMetadata, updateCategoryMetadata, getCurrentTimestamp, isBookmarkDeleted, isBundleDeleted, isCategoryDeleted } from '../utils/metadata.js';

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

export const markBookmarkAsDeletedInRoot = (
  root: Root, 
  categoryName: string, 
  bundleName: string, 
  bookmarkId: string
): Root => {
  // First check if the bookmark exists
  const category = root.categories.find(c => c.name === categoryName);
  if (!category) return root;
  
  const bundle = category.bundles.find(b => b.name === bundleName);
  if (!bundle) return root;
  
  const bookmarkExists = bundle.bookmarks.some(b => b.id === bookmarkId);
  if (!bookmarkExists) return root;
  
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(markBookmarkAsDeletedInCategory(category, bundleName, bookmarkId))
    ),
  };
  
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const markBundleAsDeletedInRoot = (
  root: Root, 
  categoryName: string, 
  bundleName: string
): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(markBundleAsDeletedInCategory(category, bundleName))
    ),
  };
  return updateRootMetadata(updatedRoot, getCurrentTimestamp());
};

export const markCategoryAsDeletedInRoot = (
  root: Root, 
  categoryName: string
): Root => {
  const updatedRoot = {
    ...root,
    categories: updateCategoryByName(
      root.categories, 
      categoryName, 
      category => updateCategoryMetadata(markCategoryAsDeleted(category))
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
        if (!isBookmarkDeleted(bookmark) && bookmarkMatchesFilter(bookmark, filter)) {
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

  const activeCategories = root.categories.filter(category => !isCategoryDeleted(category));

  for (const category of activeCategories) {
    const activeBundles = category.bundles.filter(bundle => !isBundleDeleted(bundle));
    bundlesCount += activeBundles.length;
    
    for (const bundle of activeBundles) {
      const activeBookmarks = filterActiveBookmarks(bundle.bookmarks);
      bookmarksCount += activeBookmarks.length;
      
      for (const bookmark of activeBookmarks) {
        if (bookmark.tags) {
          bookmark.tags.forEach((tag: string) => allTags.add(tag.toLowerCase()));
        }
      }
    }
  }

  return {
    categoriesCount: activeCategories.length,
    bundlesCount,
    bookmarksCount,
    tagsCount: allTags.size
  };
};

export const moveBookmarkToBundle = (
  root: Root,
  fromCategory: string,
  fromBundle: string,
  toCategory: string,
  toBundle: string,
  bookmarkId: string
): Root => {
  
  // Don't move if source and target are the same
  if (fromCategory === toCategory && fromBundle === toBundle) {
    return root;
  }

  // Validate source category exists
  const sourceCategory = root.categories.find(cat => cat.name === fromCategory);
  if (!sourceCategory) {
    throw new Error(`Source category '${fromCategory}' not found`);
  }

  // Validate source bundle exists
  const sourceBundle = sourceCategory.bundles.find(bundle => bundle.name === fromBundle);
  if (!sourceBundle) {
    throw new Error(`Source bundle '${fromBundle}' not found in category '${fromCategory}'`);
  }

  // Validate bookmark exists in source bundle
  const bookmarkExists = sourceBundle.bookmarks.some(bookmark => bookmark.id === bookmarkId);
  if (!bookmarkExists) {
    throw new Error(`Bookmark with id '${bookmarkId}' not found in source bundle '${fromBundle}' in category '${fromCategory}'`);
  }

  // Validate target category exists
  const targetCategory = root.categories.find(cat => cat.name === toCategory);
  if (!targetCategory) {
    throw new Error(`Target category '${toCategory}' not found`);
  }

  // Validate target bundle exists
  const targetBundle = targetCategory.bundles.find(bundle => bundle.name === toBundle);
  if (!targetBundle) {
    throw new Error(`Target bundle '${toBundle}' not found in category '${toCategory}'`);
  }

  // Find the bookmark to move
  let bookmarkToMove: Bookmark | undefined;
  let updatedCategories = root.categories.map(category => {
    if (category.name === fromCategory) {
      const updatedBundles = category.bundles.map(bundle => {
        if (bundle.name === fromBundle) {
          const bookmarkIndex = bundle.bookmarks.findIndex(b => b.id === bookmarkId);
          if (bookmarkIndex !== -1) {
            bookmarkToMove = bundle.bookmarks[bookmarkIndex];
            return {
              ...bundle,
              bookmarks: bundle.bookmarks.filter(b => b.id !== bookmarkId)
            };
          }
        }
        return bundle;
      });
      return updateCategoryMetadata({
        ...category,
        bundles: updatedBundles
      });
    }
    return category;
  });

  // Add bookmark to target bundle
  if (bookmarkToMove) {
    const bookmarkToAdd = bookmarkToMove; // Create a const reference that TypeScript knows is not undefined
    updatedCategories = updatedCategories.map(category => {
      if (category.name === toCategory) {
        const updatedBundles = category.bundles.map(bundle => {
          if (bundle.name === toBundle) {
            // Check if bookmark already exists in target bundle (prevent duplicates)
            const alreadyExists = bundle.bookmarks.some(b => b.id === bookmarkId);
            if (alreadyExists) {
              return bundle; // Return unchanged if already exists
            }
            return {
              ...bundle,
              bookmarks: [...bundle.bookmarks, bookmarkToAdd]
            };
          }
          return bundle;
        });
        return updateCategoryMetadata({
          ...category,
          bundles: updatedBundles
        });
      }
      return category;
    });
  } else {
    // This should not happen due to validation above, but adding as safety net
    throw new Error(`Failed to find and move bookmark with id '${bookmarkId}' from '${fromCategory}/${fromBundle}' to '${toCategory}/${toBundle}'`);
  }

  return updateRootMetadata({
    ...root,
    categories: updatedCategories
  }, getCurrentTimestamp());
};

export const moveBundleToCategory = (
  root: Root,
  fromCategory: string,
  toCategory: string,
  bundleName: string
): Root => {
  // Don't move if source and target are the same
  if (fromCategory === toCategory) {
    return root;
  }

  // Check if source category exists
  const sourceCategory = root.categories.find(c => c.name === fromCategory);
  if (!sourceCategory) {
    return root; // Return unchanged if source category doesn't exist
  }
  
  // Check if bundle exists in source category
  const bundleExists = sourceCategory.bundles.some(b => b.name === bundleName);
  if (!bundleExists) {
    return root; // Return unchanged if bundle doesn't exist
  }

  // Check if bundle name already exists in target category
  const targetCategory = root.categories.find(c => c.name === toCategory);
  if (targetCategory && targetCategory.bundles.some(b => b.name === bundleName)) {
    throw new Error(`Bundle '${bundleName}' already exists in category '${toCategory}'`);
  }

  // Find the bundle to move
  let bundleToMove: Bundle | undefined;
  let updatedCategories = root.categories.map(category => {
    if (category.name === fromCategory) {
      const bundleIndex = category.bundles.findIndex(b => b.name === bundleName);
      if (bundleIndex !== -1) {
        bundleToMove = category.bundles[bundleIndex];
        return updateCategoryMetadata({
          ...category,
          bundles: category.bundles.filter(b => b.name !== bundleName)
        });
      }
    }
    return category;
  });

  // Add bundle to target category
  if (bundleToMove) {
    const bundleToAdd = bundleToMove; // Create a const reference that TypeScript knows is not undefined
    updatedCategories = updatedCategories.map(category => {
      if (category.name === toCategory) {
        return updateCategoryMetadata({
          ...category,
          bundles: [...category.bundles, bundleToAdd]
        });
      }
      return category;
    });
  }

  return updateRootMetadata({
    ...root,
    categories: updatedCategories
  }, getCurrentTimestamp());
};