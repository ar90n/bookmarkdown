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
} from './bundle.js';
import { initializeCategoryMetadata } from '../utils/metadata.js';

export const createCategory = (name: string): Category => initializeCategoryMetadata({
  name,
  bundles: [],
});

export const updateCategoryName = (category: Category, newName: string): Category => ({
  ...category,
  name: newName,
});

export const addBundleToCategory = (category: Category, bundleName: string): Category => {
  const bundle = createBundle(bundleName);
  return {
    ...category,
    bundles: addBundle(category.bundles, bundle),
  };
};

export const removeBundleFromCategory = (category: Category, bundleName: string): Category => ({
  ...category,
  bundles: removeBundleByName(category.bundles, bundleName),
});

export const renameBundleInCategory = (
  category: Category, 
  oldName: string, 
  newName: string
): Category => ({
  ...category,
  bundles: renameBundleByName(category.bundles, oldName, newName),
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