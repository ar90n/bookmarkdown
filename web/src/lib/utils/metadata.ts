import { Root, Category, Bundle, Bookmark } from '../types/index.js';

// Unix epoch timestamp for initial state
export const EPOCH_TIMESTAMP = '1970-01-01T00:00:00.000Z';

// Get current ISO timestamp
export const getCurrentTimestamp = (): string => new Date().toISOString();

// Initialize metadata for Root
export const initializeRootMetadata = (root: Root): Root => ({
  ...root,
  metadata: {
    lastModified: getCurrentTimestamp(),
    // lastSynced is not initialized here - it's managed by localStorage
  }
});

// Update Root metadata
export const updateRootMetadata = (
  root: Root, 
  lastModified?: string, 
  lastSynced?: string
): Root => {
  const rootWithMeta = ensureRootMetadata(root);
  return {
    ...rootWithMeta,
    metadata: {
      lastModified: lastModified || rootWithMeta.metadata?.lastModified || getCurrentTimestamp(),
      // lastSynced should not be stored in Root metadata - it's managed by localStorage
      ...(lastSynced && { lastSynced })
    }
  };
};

// Initialize metadata for Category
export const initializeCategoryMetadata = (category: Category): Category => ({
  ...category,
  metadata: {
    lastModified: getCurrentTimestamp(),
    lastSynced: getCurrentTimestamp(),
  }
});

// Update Category metadata
export const updateCategoryMetadata = (
  category: Category, 
  lastModified?: string,
  lastSynced?: string
): Category => ({
  ...category,
  metadata: {
    ...category.metadata, // Preserve existing metadata including isDeleted flag
    lastModified: lastModified || getCurrentTimestamp(),
    lastSynced: lastSynced || category.metadata?.lastSynced || EPOCH_TIMESTAMP,
  }
});

// Compare timestamps
export const isNewerThan = (timestamp1: string, timestamp2: string): boolean => {
  return new Date(timestamp1) > new Date(timestamp2);
};

// Check if Root has metadata
export const hasRootMetadata = (root: Root): boolean => {
  return !!root.metadata;
};

// Check if Category has metadata
export const hasCategoryMetadata = (category: Category): boolean => {
  return !!category.metadata;
};

// Ensure Root has metadata (create if missing)
export const ensureRootMetadata = (root: Root): Root => {
  if (hasRootMetadata(root)) {
    return root;
  }
  return initializeRootMetadata(root);
};

// Ensure Root has metadata without updating timestamp (for sync operations)
export const ensureRootMetadataWithoutTimestamp = (root: Root): Root => {
  if (hasRootMetadata(root)) {
    return root;
  }
  // Use existing lastModified if available, otherwise use epoch
  return {
    ...root,
    metadata: {
      lastModified: root.metadata?.lastModified || EPOCH_TIMESTAMP,
      // lastSynced is not initialized here - it's managed by localStorage
    }
  };
};

// Ensure Category has metadata (create if missing)
export const ensureCategoryMetadata = (category: Category): Category => {
  if (hasCategoryMetadata(category)) {
    return category;
  }
  return initializeCategoryMetadata(category);
};

// Get last modified timestamp from Root
export const getRootLastModified = (root: Root): string => {
  return root.metadata?.lastModified || EPOCH_TIMESTAMP;
};

// Get last sync timestamp from Root (LOCAL ONLY - should use localStorage instead)
export const getRootLastSynced = (root: Root): string => {
  return root.metadata?.lastSynced || EPOCH_TIMESTAMP;
};

// Get last modified timestamp from Category
export const getCategoryLastModified = (category: Category): string => {
  return category.metadata?.lastModified || EPOCH_TIMESTAMP;
};

// Get last synced timestamp from Category
export const getCategoryLastSynced = (category: Category): string => {
  return category.metadata?.lastSynced || EPOCH_TIMESTAMP;
};

// Initialize metadata for Bundle
export const initializeBundleMetadata = (bundle: Bundle): Bundle => ({
  ...bundle,
  metadata: {
    lastModified: getCurrentTimestamp(),
    lastSynced: getCurrentTimestamp(),
  }
});

// Update Bundle metadata
export const updateBundleMetadata = (
  bundle: Bundle, 
  lastModified?: string,
  lastSynced?: string
): Bundle => ({
  ...bundle,
  metadata: {
    ...bundle.metadata, // Preserve existing metadata including isDeleted flag
    lastModified: lastModified || getCurrentTimestamp(),
    lastSynced: lastSynced || bundle.metadata?.lastSynced || EPOCH_TIMESTAMP,
  }
});

// Initialize metadata for Bookmark
export const initializeBookmarkMetadata = (bookmark: Bookmark): Bookmark => ({
  ...bookmark,
  metadata: {
    lastModified: getCurrentTimestamp(),
    lastSynced: getCurrentTimestamp(),
  }
});

// Update Bookmark metadata
export const updateBookmarkMetadata = (
  bookmark: Bookmark, 
  lastModified?: string,
  lastSynced?: string
): Bookmark => ({
  ...bookmark,
  metadata: {
    ...bookmark.metadata,
    lastModified: lastModified || getCurrentTimestamp(),
    lastSynced: lastSynced || bookmark.metadata?.lastSynced || EPOCH_TIMESTAMP,
  }
});

// Check if Bundle has metadata
export const hasBundleMetadata = (bundle: Bundle): boolean => {
  return !!bundle.metadata;
};

// Check if Bookmark has metadata
export const hasBookmarkMetadata = (bookmark: Bookmark): boolean => {
  return !!bookmark.metadata;
};

// Ensure Bundle has metadata (create if missing)
export const ensureBundleMetadata = (bundle: Bundle): Bundle => {
  if (hasBundleMetadata(bundle)) {
    return bundle;
  }
  return initializeBundleMetadata(bundle);
};

// Ensure Bookmark has metadata (create if missing)
export const ensureBookmarkMetadata = (bookmark: Bookmark): Bookmark => {
  if (hasBookmarkMetadata(bookmark)) {
    return bookmark;
  }
  return initializeBookmarkMetadata(bookmark);
};

// Get last modified timestamp from Bundle
export const getBundleLastModified = (bundle: Bundle): string => {
  return bundle.metadata?.lastModified || EPOCH_TIMESTAMP;
};

// Get last synced timestamp from Bundle
export const getBundleLastSynced = (bundle: Bundle): string => {
  return bundle.metadata?.lastSynced || EPOCH_TIMESTAMP;
};

// Get last modified timestamp from Bookmark
export const getBookmarkLastModified = (bookmark: Bookmark): string => {
  return bookmark.metadata?.lastModified || EPOCH_TIMESTAMP;
};

// Get last synced timestamp from Bookmark
export const getBookmarkLastSynced = (bookmark: Bookmark): string => {
  return bookmark.metadata?.lastSynced || EPOCH_TIMESTAMP;
};

// Mark bookmark as deleted
export const markBookmarkAsDeleted = (bookmark: Bookmark): Bookmark => ({
  ...bookmark,
  metadata: {
    ...bookmark.metadata,
    lastModified: getCurrentTimestamp(),
    isDeleted: true,
  }
});

// Check if bookmark is deleted
export const isBookmarkDeleted = (bookmark: Bookmark): boolean => {
  return bookmark.metadata?.isDeleted === true;
};

export const isBundleDeleted = (bundle: Bundle): boolean => {
  return bundle.metadata?.isDeleted === true;
};

export const isCategoryDeleted = (category: Category): boolean => {
  return category.metadata?.isDeleted === true;
};

export const filterActiveBundles = (bundles: readonly Bundle[]): Bundle[] => {
  return bundles.filter(bundle => !isBundleDeleted(bundle));
};

export const filterActiveCategories = (categories: readonly Category[]): Category[] => {
  return categories.filter(category => !isCategoryDeleted(category));
};

// Update all lastSynced timestamps after successful sync (LOCAL ONLY)
// Note: Root lastSynced should be managed by localStorage, not stored in the root
export const updateAllLastSynced = (root: Root, syncTime?: string): Root => {
  const timestamp = syncTime || getCurrentTimestamp();
  
  return {
    ...root,
    // Don't update root lastSynced - it should be managed by localStorage
    categories: root.categories.map(category => ({
      ...category,
      metadata: {
        ...category.metadata!,
        lastSynced: timestamp,
      },
      bundles: category.bundles.map(bundle => ({
        ...bundle,
        metadata: {
          ...bundle.metadata!,
          lastSynced: timestamp,
        },
        bookmarks: bundle.bookmarks.map(bookmark => ({
          ...bookmark,
          metadata: {
            ...bookmark.metadata!,
            lastSynced: timestamp,
          },
        })),
      })),
    })),
  };
};

// localStorage utilities for sync timestamp management
export const getLocalLastSynced = (gistId: string): string => {
  try {
    const key = `bookmarkdown_last_synced_${gistId}`;
    const stored = localStorage.getItem(key);
    return stored || EPOCH_TIMESTAMP;
  } catch (error) {
    // Handle localStorage errors gracefully
    console.warn('Failed to read lastSynced from localStorage:', error);
    return EPOCH_TIMESTAMP;
  }
};

export const setLocalLastSynced = (gistId: string, timestamp?: string): void => {
  try {
    const key = `bookmarkdown_last_synced_${gistId}`;
    const syncTime = timestamp || getCurrentTimestamp();
    localStorage.setItem(key, syncTime);
  } catch (error) {
    // Handle localStorage errors gracefully
    console.warn('Failed to write lastSynced to localStorage:', error);
  }
};

export const clearLocalLastSynced = (gistId: string): void => {
  try {
    const key = `bookmarkdown_last_synced_${gistId}`;
    localStorage.removeItem(key);
  } catch (error) {
    // Handle localStorage errors gracefully
    console.warn('Failed to clear lastSynced from localStorage:', error);
  }
};

// Generic function to compare arrays by sorting them by name and comparing each element
export const compareArraysByName = <T>(
  arr1: T[],
  arr2: T[],
  getName: (item: T) => string,
  compareItem: (a: T, b: T) => boolean
): boolean => {
  // Check array lengths
  if (arr1.length !== arr2.length) {
    return false;
  }
  
  // Sort arrays by name for consistent comparison
  const sorted1 = [...arr1].sort((a, b) => getName(a).localeCompare(getName(b)));
  const sorted2 = [...arr2].sort((a, b) => getName(a).localeCompare(getName(b)));
  
  // Compare each element
  for (let i = 0; i < sorted1.length; i++) {
    if (!compareItem(sorted1[i], sorted2[i])) {
      return false;
    }
  }
  
  return true;
};

// Compare two roots for content equality (excluding metadata)
export const compareRootsContent = (root1: Root, root2: Root): boolean => {
  // Compare version
  if (root1.version !== root2.version) {
    return false;
  }
  
  // Compare categories using generic function
  return compareArraysByName(
    root1.categories,
    root2.categories,
    (cat) => cat.name,
    compareCategoriesContent
  );
};

// Compare two categories for content equality (excluding metadata)
export const compareCategoriesContent = (cat1: Category, cat2: Category): boolean => {
  if (cat1.name !== cat2.name) {
    return false;
  }
  
  if (cat1.bundles.length !== cat2.bundles.length) {
    return false;
  }
  
  // Sort bundles by name for consistent comparison
  const bundles1 = [...cat1.bundles].sort((a, b) => a.name.localeCompare(b.name));
  const bundles2 = [...cat2.bundles].sort((a, b) => a.name.localeCompare(b.name));
  
  for (let i = 0; i < bundles1.length; i++) {
    if (!compareBundlesContent(bundles1[i], bundles2[i])) {
      return false;
    }
  }
  return true;
};

// Compare two bundles for content equality (excluding metadata)
export const compareBundlesContent = (bundle1: Bundle, bundle2: Bundle): boolean => {
  if (bundle1.name !== bundle2.name) {
    return false;
  }
  
  if (bundle1.bookmarks.length !== bundle2.bookmarks.length) {
    return false;
  }
  
  // Sort bookmarks by id for consistent comparison
  const bookmarks1 = [...bundle1.bookmarks].sort((a, b) => a.id.localeCompare(b.id));
  const bookmarks2 = [...bundle2.bookmarks].sort((a, b) => a.id.localeCompare(b.id));
  
  for (let i = 0; i < bookmarks1.length; i++) {
    if (!compareBookmarksContent(bookmarks1[i], bookmarks2[i])) {
      return false;
    }
  }
  return true;
};

// Compare two bookmarks for content equality (excluding metadata and ID)
// Note: ID is for UI optimization only (React key), not for business logic
export const compareBookmarksContent = (bm1: Bookmark, bm2: Bookmark): boolean => {
  const titleMatch = bm1.title === bm2.title;
  const urlMatch = bm1.url === bm2.url;
  const notesMatch = bm1.notes === bm2.notes;
  const tagsMatch = JSON.stringify(bm1.tags?.slice().sort()) === JSON.stringify(bm2.tags?.slice().sort());
  const deletedMatch = bm1.metadata?.isDeleted === bm2.metadata?.isDeleted;
  
  const allMatch = titleMatch && urlMatch && notesMatch && tagsMatch && deletedMatch;
  
  
  return allMatch;
};

// Propagate timestamp changes up the hierarchy
export const propagateTimestampToParents = (
  root: Root,
  categoryName: string,
  bundleName?: string,
  timestamp?: string
): Root => {
  const modifiedTime = timestamp || getCurrentTimestamp();
  
  return {
    ...root,
    metadata: {
      ...root.metadata,
      lastModified: modifiedTime,
    },
    categories: root.categories.map(category => {
      if (category.name === categoryName) {
        return {
          ...category,
          metadata: {
            ...category.metadata!,
            lastModified: modifiedTime,
          },
          bundles: bundleName ? category.bundles.map(bundle => {
            if (bundle.name === bundleName) {
              return {
                ...bundle,
                metadata: {
                  ...bundle.metadata!,
                  lastModified: modifiedTime,
                },
              };
            }
            return bundle;
          }) : category.bundles,
        };
      }
      return category;
    }),
  };
};

// Update bookmark and propagate timestamp to parents
export const updateBookmarkWithPropagation = (
  root: Root,
  categoryName: string,
  bundleName: string,
  bookmarkId: string,
  updates: Partial<Bookmark>
): Root => {
  const timestamp = getCurrentTimestamp();
  
  const updatedRoot = {
    ...root,
    categories: root.categories.map(category => {
      if (category.name === categoryName) {
        return {
          ...category,
          bundles: category.bundles.map(bundle => {
            if (bundle.name === bundleName) {
              return {
                ...bundle,
                bookmarks: bundle.bookmarks.map(bookmark => {
                  if (bookmark.id === bookmarkId) {
                    return {
                      ...bookmark,
                      ...updates,
                      metadata: {
                        ...bookmark.metadata,
                        lastModified: timestamp,
                      },
                    };
                  }
                  return bookmark;
                }),
              };
            }
            return bundle;
          }),
        };
      }
      return category;
    }),
  };
  
  // Propagate timestamp to parents
  return propagateTimestampToParents(updatedRoot, categoryName, bundleName, timestamp);
};

// Add bookmark and propagate timestamp to parents
export const addBookmarkWithPropagation = (
  root: Root,
  categoryName: string,
  bundleName: string,
  bookmark: Bookmark
): Root => {
  const timestamp = getCurrentTimestamp();
  const bookmarkWithMeta = ensureBookmarkMetadata(bookmark);
  
  const updatedRoot = {
    ...root,
    categories: root.categories.map(category => {
      if (category.name === categoryName) {
        return {
          ...category,
          bundles: category.bundles.map(bundle => {
            if (bundle.name === bundleName) {
              return {
                ...bundle,
                bookmarks: [...bundle.bookmarks, bookmarkWithMeta],
              };
            }
            return bundle;
          }),
        };
      }
      return category;
    }),
  };
  
  // Propagate timestamp to parents
  return propagateTimestampToParents(updatedRoot, categoryName, bundleName, timestamp);
};

// Remove bookmark and propagate timestamp to parents
export const removeBookmarkWithPropagation = (
  root: Root,
  categoryName: string,
  bundleName: string,
  bookmarkId: string
): Root => {
  const timestamp = getCurrentTimestamp();
  
  const updatedRoot = {
    ...root,
    categories: root.categories.map(category => {
      if (category.name === categoryName) {
        return {
          ...category,
          bundles: category.bundles.map(bundle => {
            if (bundle.name === bundleName) {
              return {
                ...bundle,
                bookmarks: bundle.bookmarks.filter(bookmark => bookmark.id !== bookmarkId),
              };
            }
            return bundle;
          }),
        };
      }
      return category;
    }),
  };
  
  // Propagate timestamp to parents
  return propagateTimestampToParents(updatedRoot, categoryName, bundleName, timestamp);
};