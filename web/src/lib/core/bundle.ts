import { Bundle, BookmarkInput, BookmarkUpdate } from '../types/index.js';
import { createBookmark, addBookmark, updateBookmarkById, removeBookmarkById, markBookmarkAsDeleted } from './bookmark.js';
import { getCurrentTimestamp } from '../utils/metadata.js';

export const createBundle = (name: string): Bundle => ({
  name,
  bookmarks: [],
  metadata: {
    lastModified: getCurrentTimestamp(),
  },
});

export const updateBundleName = (bundle: Bundle, newName: string): Bundle => ({
  ...bundle,
  name: newName,
  metadata: {
    ...bundle.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const addBookmarkToBundle = (bundle: Bundle, bookmarkInput: BookmarkInput): Bundle => {
  const bookmark = createBookmark(bookmarkInput);
  return {
    ...bundle,
    bookmarks: addBookmark(bundle.bookmarks, bookmark),
    metadata: {
      ...bundle.metadata,
      lastModified: getCurrentTimestamp(),
    },
  };
};

export const updateBookmarkInBundle = (
  bundle: Bundle, 
  bookmarkId: string, 
  update: BookmarkUpdate
): Bundle => ({
  ...bundle,
  bookmarks: updateBookmarkById(bundle.bookmarks, bookmarkId, update),
  metadata: {
    ...bundle.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const removeBookmarkFromBundle = (bundle: Bundle, bookmarkId: string): Bundle => ({
  ...bundle,
  bookmarks: markBookmarkAsDeleted(bundle.bookmarks, bookmarkId),
  metadata: {
    ...bundle.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const markBookmarkAsDeletedInBundle = (bundle: Bundle, bookmarkId: string): Bundle => ({
  ...bundle,
  bookmarks: markBookmarkAsDeleted(bundle.bookmarks, bookmarkId),
  metadata: {
    ...bundle.metadata,
    lastModified: getCurrentTimestamp(),
  },
});

export const markBundleAsDeleted = (bundle: Bundle): Bundle => ({
  ...bundle,
  metadata: {
    ...bundle.metadata,
    lastModified: getCurrentTimestamp(),
    isDeleted: true,
  },
});

export const findBundleByName = (bundles: readonly Bundle[], name: string): Bundle | undefined =>
  bundles.find(bundle => bundle.name === name);

export const addBundle = (bundles: readonly Bundle[], bundle: Bundle): readonly Bundle[] =>
  [...bundles, bundle];

export const updateBundleByName = (
  bundles: readonly Bundle[], 
  name: string, 
  updater: (bundle: Bundle) => Bundle
): readonly Bundle[] =>
  bundles.map(bundle => bundle.name === name ? updater(bundle) : bundle);

export const removeBundleByName = (bundles: readonly Bundle[], name: string): readonly Bundle[] =>
  bundles.filter(bundle => bundle.name !== name);

export const renameBundleByName = (
  bundles: readonly Bundle[], 
  oldName: string, 
  newName: string
): readonly Bundle[] =>
  bundles.map(bundle => 
    bundle.name === oldName ? updateBundleName(bundle, newName) : bundle
  );