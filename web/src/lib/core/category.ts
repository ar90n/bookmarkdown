import { Category, BookmarkInput, BookmarkUpdate } from '../types/index.js';
import { 
  createBundle, 
  addBundle, 
  updateBundleByName, 
  removeBundleByName, 
  renameBundleByName,
  addBookmarkToBundle,
  updateBookmarkInBundle,
  removeBookmarkFromBundle,
  markBookmarkAsDeletedInBundle,
  markBundleAsDeleted
} from './bundle.js';
import { initializeCategoryMetadata, getCurrentTimestamp } from '../utils/metadata.js';

export const createCategory = (name: string): Category => initializeCategoryMetadata({
  name,
  bundles: [],
});

export const updateCategoryName = (category: Category, newName: string): Category => ({
  ...category,
  name: newName,
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const addBundleToCategory = (category: Category, bundleName: string): Category => {
  const bundle = createBundle(bundleName);
  return {
    ...category,
    bundles: addBundle(category.bundles, bundle),
    metadata: {
      ...category.metadata,
      lastModified: getCurrentTimestamp(),
    },
  };
};

export const removeBundleFromCategory = (category: Category, bundleName: string): Category => ({
  ...category,
  bundles: removeBundleByName(category.bundles, bundleName),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const renameBundleInCategory = (
  category: Category, 
  oldName: string, 
  newName: string
): Category => ({
  ...category,
  bundles: renameBundleByName(category.bundles, oldName, newName),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const addBookmarkToCategory = (
  category: Category, 
  bundleName: string, 
  bookmarkInput: BookmarkInput
): Category => ({
  ...category,
  bundles: updateBundleByName(
    category.bundles, 
    bundleName, 
    bundle => addBookmarkToBundle(bundle, bookmarkInput)
  ),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const updateBookmarkInCategory = (
  category: Category, 
  bundleName: string, 
  bookmarkId: string, 
  update: BookmarkUpdate
): Category => ({
  ...category,
  bundles: updateBundleByName(
    category.bundles, 
    bundleName, 
    bundle => updateBookmarkInBundle(bundle, bookmarkId, update)
  ),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const removeBookmarkFromCategory = (
  category: Category, 
  bundleName: string, 
  bookmarkId: string
): Category => ({
  ...category,
  bundles: updateBundleByName(
    category.bundles, 
    bundleName, 
    bundle => removeBookmarkFromBundle(bundle, bookmarkId)
  ),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const markBookmarkAsDeletedInCategory = (
  category: Category, 
  bundleName: string, 
  bookmarkId: string
): Category => ({
  ...category,
  bundles: updateBundleByName(
    category.bundles, 
    bundleName, 
    bundle => markBookmarkAsDeletedInBundle(bundle, bookmarkId)
  ),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const markBundleAsDeletedInCategory = (
  category: Category, 
  bundleName: string
): Category => ({
  ...category,
  bundles: updateBundleByName(
    category.bundles, 
    bundleName, 
    bundle => markBundleAsDeleted(bundle)
  ),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const markCategoryAsDeleted = (category: Category): Category => ({
  ...category,
  bundles: category.bundles.map(bundle => ({
    ...bundle,
    bookmarks: bundle.bookmarks.map(bookmark => ({
      ...bookmark,
      metadata: {
        ...bookmark.metadata,
        lastModified: getCurrentTimestamp(),
        isDeleted: true,
      }
    })),
    metadata: {
      ...bundle.metadata,
      lastModified: getCurrentTimestamp(),
      isDeleted: true,
    }
  })),
  metadata: {
    ...category.metadata,
    lastModified: getCurrentTimestamp(),
    isDeleted: true,
  },
});

export const findCategoryByName = (categories: readonly Category[], name: string): Category | undefined =>
  categories.find(category => category.name === name);

export const addCategory = (categories: readonly Category[], category: Category): readonly Category[] =>
  [...categories, category];

export const updateCategoryByName = (
  categories: readonly Category[], 
  name: string, 
  updater: (category: Category) => Category
): readonly Category[] =>
  categories.map(category => category.name === name ? updater(category) : category);

export const removeCategoryByName = (categories: readonly Category[], name: string): readonly Category[] =>
  categories.filter(category => category.name !== name);

export const renameCategoryByName = (
  categories: readonly Category[], 
  oldName: string, 
  newName: string
): readonly Category[] =>
  categories.map(category => 
    category.name === oldName ? updateCategoryName(category, newName) : category
  );