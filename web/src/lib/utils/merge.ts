import { Root, Category, Bundle, Bookmark, MergeConflict, ConflictResolution } from '../types/index.js';
import { 
  getCategoryLastModified, 
  getBundleLastModified,
  getBookmarkLastModified,
  getRootLastSynced,
  updateRootMetadata, 
  getCurrentTimestamp,
  isNewerThan,
  ensureRootMetadata,
  ensureRootMetadataWithoutTimestamp,
  ensureCategoryMetadata,
  ensureBundleMetadata,
  ensureBookmarkMetadata,
  isBookmarkDeleted,
  isBundleDeleted,
  isCategoryDeleted,
  compareRootsContent
} from './metadata.js';

export interface MergeResult {
  mergedRoot: Root;
  conflicts: MergeConflict[];
  hasConflicts: boolean;
  hasChanges: boolean;
}

export interface MergeOptions {
  conflictResolutions?: ConflictResolution[];
  strategy?: 'timestamp-based' | 'local-wins' | 'remote-wins';
  userLastSynced?: string; // When this device last synced (from localStorage)
}

/**
 * Content-based key for bookmarks (URL + title)
 */
const getBookmarkContentKey = (bookmark: Bookmark): string => {
  return `${bookmark.url}||${bookmark.title}`;
};

/**
 * Transactional merge with deletion detection
 */
export const mergeRoots = (
  localRoot: Root, 
  remoteRoot: Root, 
  options: MergeOptions = {}
): MergeResult => {
  const { conflictResolutions = [], strategy = 'timestamp-based', userLastSynced } = options;
  
  // Ensure both roots have metadata without updating timestamps
  const localWithMeta = ensureRootMetadataWithoutTimestamp(localRoot);
  const remoteWithMeta = ensureRootMetadataWithoutTimestamp(remoteRoot);
  
  const conflicts: MergeConflict[] = [];
  // Use userLastSynced from options (localStorage) instead of from Root metadata
  const deviceLastSynced = userLastSynced || '1970-01-01T00:00:00.000Z';
  
  // Determine if there are actual content differences before merge
  const hasContentDifferences = !compareRootsContent(localWithMeta, remoteWithMeta);
  
  // Merge categories using transactional algorithm with soft delete support
  const mergedCategories = mergeCategories(
    localWithMeta.categories, 
    remoteWithMeta.categories, 
    deviceLastSynced,
    conflictResolutions, 
    strategy, 
    conflicts
  );
  
  // Check if merge actually changed local content
  const hasChanges = !compareRootsContent(localWithMeta, {
    version: Math.max(localWithMeta.version, remoteWithMeta.version) as 1,
    categories: mergedCategories,
    metadata: localWithMeta.metadata,
  });
  
  // Create merged root
  const mergedRoot: Root = {
    version: Math.max(localWithMeta.version, remoteWithMeta.version) as 1,
    categories: mergedCategories,
    metadata: {
      // Only update lastModified if there were actual changes
      lastModified: hasChanges ? getCurrentTimestamp() : 
        (localWithMeta.metadata?.lastModified || remoteWithMeta.metadata?.lastModified || getCurrentTimestamp()),
      // lastSynced is NOT stored in Root - it's managed by localStorage
    }
  };
  
  return {
    mergedRoot,
    conflicts,
    hasConflicts: conflicts.length > 0,
    hasChanges
  };
};

/**
 * Merge categories with deletion detection
 */
const mergeCategories = (
  localCategories: readonly Category[],
  remoteCategories: readonly Category[],
  userLastSynced: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Category[] => {
  const mergedCategories = new Map<string, Category>();
  
  // Create maps for efficient lookup
  const localCategoryMap = new Map<string, Category>();
  const remoteCategoryMap = new Map<string, Category>();
  
  localCategories.forEach(cat => localCategoryMap.set(cat.name, cat));
  remoteCategories.forEach(cat => remoteCategoryMap.set(cat.name, cat));
  
  // Get all category names
  const allCategoryNames = new Set([
    ...localCategories.map(c => c.name),
    ...remoteCategories.map(c => c.name)
  ]);
  
  for (const categoryName of allCategoryNames) {
    const localCategory = localCategoryMap.get(categoryName);
    const remoteCategory = remoteCategoryMap.get(categoryName);
    
    if (localCategory && remoteCategory) {
      // Both exist - check for soft delete differences and merge
      const mergedCategory = mergeSingleCategoryWithSoftDelete(
        localCategory, 
        remoteCategory, 
        userLastSynced,
        conflictResolutions, 
        strategy, 
        conflicts
      );
      
      if (mergedCategory && !isCategoryDeleted(mergedCategory)) {
        mergedCategories.set(categoryName, mergedCategory);
      }
      
    } else if (localCategory && !remoteCategory) {
      // Local only - check if deleted remotely or new addition
      const localCategoryWithMeta = ensureCategoryMetadata(localCategory);
      
      if (new Date(userLastSynced).getTime() === new Date('1970-01-01T00:00:00.000Z').getTime()) {
        // Never synced - keep local if not deleted
        if (!isCategoryDeleted(localCategoryWithMeta)) {
          mergedCategories.set(categoryName, localCategoryWithMeta);
        }
      } else {
        // Previously synced category exists only locally
        if (isCategoryDeleted(localCategoryWithMeta)) {
          // Category was deleted locally - don't include in merged result
        } else {
          // Local only category - treat as new addition
          mergedCategories.set(categoryName, localCategoryWithMeta);
        }
      }
      
    } else if (!localCategory && remoteCategory) {
      // Remote only - add to local if not deleted
      const remoteCategoryWithMeta = ensureCategoryMetadata(remoteCategory);
      if (!isCategoryDeleted(remoteCategoryWithMeta)) {
        mergedCategories.set(categoryName, remoteCategoryWithMeta);
      }
    }
  }
  
  return Array.from(mergedCategories.values());
};

/**
 * Compare two bundle arrays for content equality
 */
const compareBundleArrays = (bundles1: readonly Bundle[], bundles2: readonly Bundle[]): boolean => {
  if (bundles1.length !== bundles2.length) {
    return false;
  }
  
  // Sort bundles by name for consistent comparison
  const sorted1 = [...bundles1].sort((a, b) => a.name.localeCompare(b.name));
  const sorted2 = [...bundles2].sort((a, b) => a.name.localeCompare(b.name));
  
  for (let i = 0; i < sorted1.length; i++) {
    if (!compareBundlesContentMerge(sorted1[i], sorted2[i])) {
      return false;
    }
  }
  
  return true;
};

/**
 * Compare two bundles for content equality (excluding metadata timestamps) - MERGE VERSION
 */
const compareBundlesContentMerge = (bundle1: Bundle, bundle2: Bundle): boolean => {
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
    if (!compareBookmarksContentMerge(bookmarks1[i], bookmarks2[i])) {
      return false;
    }
  }
  return true;
};

/**
 * Compare two bookmarks for content equality (excluding metadata timestamps and ID) - MERGE VERSION
 * Note: ID is for UI optimization only (React key), not for business logic
 */
const compareBookmarksContentMerge = (bm1: Bookmark, bm2: Bookmark): boolean => {
  const titleMatch = bm1.title === bm2.title;
  const urlMatch = bm1.url === bm2.url;
  const notesMatch = bm1.notes === bm2.notes;
  const tagsMatch = JSON.stringify(bm1.tags?.slice().sort()) === JSON.stringify(bm2.tags?.slice().sort());
  const deletedMatch = bm1.metadata?.isDeleted === bm2.metadata?.isDeleted;
  
  const allMatch = titleMatch && urlMatch && notesMatch && tagsMatch && deletedMatch;
  
  
  return allMatch;
};

/**
 * Merge a single category with soft delete support
 */
const mergeSingleCategoryWithSoftDelete = (
  localCategory: Category,
  remoteCategory: Category,
  userLastSynced: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Category | null => {
  const localCategoryWithMeta = ensureCategoryMetadata(localCategory);
  const remoteCategoryWithMeta = ensureCategoryMetadata(remoteCategory);
  
  const localLastModified = getCategoryLastModified(localCategoryWithMeta);
  const remoteLastModified = getCategoryLastModified(remoteCategoryWithMeta);
  
  // Handle deletion cases
  const localDeleted = isCategoryDeleted(localCategoryWithMeta);
  const remoteDeleted = isCategoryDeleted(remoteCategoryWithMeta);
  
  if (localDeleted && remoteDeleted) {
    return null; // Both deleted
  } else if (localDeleted && !remoteDeleted) {
    // Local deleted, remote exists - check if deletion happened after last sync
    if (isNewerThan(localLastModified, userLastSynced)) {
      // Local deletion is newer than last sync - respect the deletion
      return null;
    } else {
      // Local deletion is older than last sync - use timestamp comparison
      if (isNewerThan(localLastModified, remoteLastModified)) {
        return null; // Local deletion is newer
      } else {
        return mergeSingleCategory(localCategoryWithMeta, remoteCategoryWithMeta, userLastSynced, conflictResolutions, strategy, conflicts);
      }
    }
  } else if (!localDeleted && remoteDeleted) {
    // Remote deleted, local exists - check if deletion happened after last sync
    if (isNewerThan(remoteLastModified, userLastSynced)) {
      // Remote deletion is newer than last sync - respect the deletion
      return null;
    } else {
      // Remote deletion is older than last sync - use timestamp comparison
      if (isNewerThan(remoteLastModified, localLastModified)) {
        return null; // Remote deletion is newer
      } else {
        return mergeSingleCategory(localCategoryWithMeta, remoteCategoryWithMeta, userLastSynced, conflictResolutions, strategy, conflicts);
      }
    }
  }
  
  // Both exist and neither is deleted - merge normally
  return mergeSingleCategory(localCategoryWithMeta, remoteCategoryWithMeta, userLastSynced, conflictResolutions, strategy, conflicts);
};

/**
 * Merge a single category's bundles
 */
const mergeSingleCategory = (
  localCategory: Category,
  remoteCategory: Category,
  userLastSynced: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Category => {
  const localCategoryWithMeta = ensureCategoryMetadata(localCategory);
  const remoteCategoryWithMeta = ensureCategoryMetadata(remoteCategory);
  
  // Merge bundles
  const mergedBundles = mergeBundles(
    localCategoryWithMeta.bundles,
    remoteCategoryWithMeta.bundles,
    userLastSynced,
    localCategory.name,
    conflictResolutions,
    strategy,
    conflicts
  );
  
  // Check if bundles actually changed
  const bundlesChanged = !compareBundleArrays(localCategoryWithMeta.bundles, mergedBundles);
  
  // Only update timestamp if bundles actually changed
  const categoryLastModified = bundlesChanged ? 
    getCurrentTimestamp() :
    getCategoryLastModified(localCategoryWithMeta);
  
  
  return {
    ...localCategoryWithMeta,
    bundles: mergedBundles,
    metadata: {
      lastModified: categoryLastModified,
      lastSynced: localCategoryWithMeta.metadata?.lastSynced || userLastSynced,
    }
  };
};

/**
 * Merge bundles with deletion detection
 */
const mergeBundles = (
  localBundles: readonly Bundle[],
  remoteBundles: readonly Bundle[],
  userLastSynced: string,
  categoryName: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Bundle[] => {
  const mergedBundles = new Map<string, Bundle>();
  
  // Create maps for efficient lookup
  const localBundleMap = new Map<string, Bundle>();
  const remoteBundleMap = new Map<string, Bundle>();
  
  localBundles.forEach(bundle => localBundleMap.set(bundle.name, bundle));
  remoteBundles.forEach(bundle => remoteBundleMap.set(bundle.name, bundle));
  
  // Get all bundle names
  const allBundleNames = new Set([
    ...localBundles.map(b => b.name),
    ...remoteBundles.map(b => b.name)
  ]);
  
  for (const bundleName of allBundleNames) {
    const localBundle = localBundleMap.get(bundleName);
    const remoteBundle = remoteBundleMap.get(bundleName);
    
    if (localBundle && remoteBundle) {
      // Both exist - check for soft delete differences and merge
      const mergedBundle = mergeSingleBundleWithSoftDelete(
        localBundle,
        remoteBundle,
        userLastSynced,
        categoryName,
        conflictResolutions,
        strategy,
        conflicts
      );
      
      if (mergedBundle && !isBundleDeleted(mergedBundle)) {
        mergedBundles.set(bundleName, mergedBundle);
      }
      
    } else if (localBundle && !remoteBundle) {
      // Local only - check if deleted remotely or new addition
      const localBundleWithMeta = ensureBundleMetadata(localBundle);
      
      if (new Date(userLastSynced).getTime() === new Date('1970-01-01T00:00:00.000Z').getTime()) {
        // Never synced - keep local if not deleted
        if (!isBundleDeleted(localBundleWithMeta)) {
          mergedBundles.set(bundleName, localBundleWithMeta);
        }
      } else {
        // Local only bundle - treat as new addition, not deletion
        if (!isBundleDeleted(localBundleWithMeta)) {
          mergedBundles.set(bundleName, localBundleWithMeta);
        }
      }
      
    } else if (!localBundle && remoteBundle) {
      // Remote only - add to local if not deleted
      const remoteBundleWithMeta = ensureBundleMetadata(remoteBundle);
      if (!isBundleDeleted(remoteBundleWithMeta)) {
        mergedBundles.set(bundleName, remoteBundleWithMeta);
      }
    }
  }
  
  return Array.from(mergedBundles.values());
};

/**
 * Merge a single bundle with soft delete support
 */
const mergeSingleBundleWithSoftDelete = (
  localBundle: Bundle,
  remoteBundle: Bundle,
  userLastSynced: string,
  categoryName: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Bundle | null => {
  const localBundleWithMeta = ensureBundleMetadata(localBundle);
  const remoteBundleWithMeta = ensureBundleMetadata(remoteBundle);
  
  const localLastModified = getBundleLastModified(localBundleWithMeta);
  const remoteLastModified = getBundleLastModified(remoteBundleWithMeta);
  
  // Handle deletion cases
  const localDeleted = isBundleDeleted(localBundleWithMeta);
  const remoteDeleted = isBundleDeleted(remoteBundleWithMeta);
  
  if (localDeleted && remoteDeleted) {
    return null; // Both deleted
  } else if (localDeleted && !remoteDeleted) {
    // Local deleted, remote exists - check if deletion happened after last sync
    if (isNewerThan(localLastModified, userLastSynced)) {
      // Local deletion is newer than last sync - respect the deletion
      return null;
    } else {
      // Local deletion is older than last sync - use timestamp comparison
      if (isNewerThan(localLastModified, remoteLastModified)) {
        return null; // Local deletion is newer
      } else {
        return mergeSingleBundle(localBundleWithMeta, remoteBundleWithMeta, userLastSynced, categoryName, conflictResolutions, strategy, conflicts);
      }
    }
  } else if (!localDeleted && remoteDeleted) {
    // Remote deleted, local exists - check if deletion happened after last sync
    if (isNewerThan(remoteLastModified, userLastSynced)) {
      // Remote deletion is newer than last sync - respect the deletion
      return null;
    } else {
      // Remote deletion is older than last sync - use timestamp comparison
      if (isNewerThan(remoteLastModified, localLastModified)) {
        return null; // Remote deletion is newer
      } else {
        return mergeSingleBundle(localBundleWithMeta, remoteBundleWithMeta, userLastSynced, categoryName, conflictResolutions, strategy, conflicts);
      }
    }
  }
  
  // Both exist and neither is deleted - merge normally
  return mergeSingleBundle(localBundleWithMeta, remoteBundleWithMeta, userLastSynced, categoryName, conflictResolutions, strategy, conflicts);
};

/**
 * Merge a single bundle's bookmarks
 */
const mergeSingleBundle = (
  localBundle: Bundle,
  remoteBundle: Bundle,
  userLastSynced: string,
  categoryName: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Bundle => {
  const localBundleWithMeta = ensureBundleMetadata(localBundle);
  const remoteBundleWithMeta = ensureBundleMetadata(remoteBundle);
  
  // Merge bookmarks using content-based approach
  const mergedBookmarks = mergeBookmarks(
    localBundleWithMeta.bookmarks,
    remoteBundleWithMeta.bookmarks,
    remoteBundleWithMeta, // Pass remote bundle for deletion detection
    userLastSynced,
    categoryName,
    localBundle.name,
    conflictResolutions,
    strategy,
    conflicts
  );
  
  // Check if bookmarks actually changed
  const bookmarksChanged = !compareBookmarkArrays(localBundleWithMeta.bookmarks, mergedBookmarks);
  
  // Only update timestamp if bookmarks actually changed
  const bundleLastModified = bookmarksChanged ? 
    getCurrentTimestamp() :
    getBundleLastModified(localBundleWithMeta);
  
  
  return {
    ...localBundleWithMeta,
    bookmarks: mergedBookmarks,
    metadata: {
      lastModified: bundleLastModified,
      lastSynced: localBundleWithMeta.metadata?.lastSynced || userLastSynced,
    }
  };
};

/**
 * Compare two bookmark arrays for content equality
 */
const compareBookmarkArrays = (bookmarks1: readonly Bookmark[], bookmarks2: readonly Bookmark[]): boolean => {
  if (bookmarks1.length !== bookmarks2.length) {
    return false;
  }
  
  // Sort bookmarks by id for consistent comparison
  const sorted1 = [...bookmarks1].sort((a, b) => a.id.localeCompare(b.id));
  const sorted2 = [...bookmarks2].sort((a, b) => a.id.localeCompare(b.id));
  
  for (let i = 0; i < sorted1.length; i++) {
    if (!compareBookmarksContentMerge(sorted1[i], sorted2[i])) {
      return false;
    }
  }
  
  return true;
};

/**
 * Merge bookmarks using content-based matching with deletion detection
 */
const mergeBookmarks = (
  localBookmarks: readonly Bookmark[],
  remoteBookmarks: readonly Bookmark[],
  remoteBundle: Bundle,
  userLastSynced: string,
  categoryName: string,
  bundleName: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Bookmark[] => {
  const mergedBookmarks = new Map<string, Bookmark>();
  
  // Create content-based maps
  const localBookmarkMap = new Map<string, Bookmark>();
  const remoteBookmarkMap = new Map<string, Bookmark>();
  
  localBookmarks.forEach(bookmark => {
    const key = getBookmarkContentKey(bookmark);
    localBookmarkMap.set(key, bookmark);
  });
  
  remoteBookmarks.forEach(bookmark => {
    const key = getBookmarkContentKey(bookmark);
    remoteBookmarkMap.set(key, bookmark);
  });
  
  // Get all bookmark content keys
  const allBookmarkKeys = new Set([
    ...Array.from(localBookmarkMap.keys()),
    ...Array.from(remoteBookmarkMap.keys())
  ]);
  
  
  for (const contentKey of allBookmarkKeys) {
    const localBookmark = localBookmarkMap.get(contentKey);
    const remoteBookmark = remoteBookmarkMap.get(contentKey);
    
    if (localBookmark && remoteBookmark) {
      // Both exist - merge with conflict detection
      const mergedBookmark = mergeSingleBookmark(
        localBookmark,
        remoteBookmark,
        userLastSynced,
        categoryName,
        bundleName,
        conflictResolutions,
        strategy,
        conflicts
      );
      
      if (mergedBookmark && !isBookmarkDeleted(mergedBookmark)) {
        mergedBookmarks.set(contentKey, mergedBookmark);
      }
      
    } else if (localBookmark && !remoteBookmark) {
      // Local only - check if deleted remotely
      const localBookmarkWithMeta = ensureBookmarkMetadata(localBookmark);
      
      if (new Date(userLastSynced).getTime() === new Date('1970-01-01T00:00:00.000Z').getTime()) {
        // Never synced - keep local
        if (!isBookmarkDeleted(localBookmarkWithMeta)) {
          mergedBookmarks.set(contentKey, localBookmarkWithMeta);
        }
      } else {
        // Local only bookmark - treat as new addition, not deletion
        if (!isBookmarkDeleted(localBookmarkWithMeta)) {
          mergedBookmarks.set(contentKey, localBookmarkWithMeta);
        }
      }
      
    } else if (!localBookmark && remoteBookmark) {
      // Remote only - add to local
      const remoteBookmarkWithMeta = ensureBookmarkMetadata(remoteBookmark);
      if (!isBookmarkDeleted(remoteBookmarkWithMeta)) {
        mergedBookmarks.set(contentKey, remoteBookmarkWithMeta);
      }
    }
  }
  
  return Array.from(mergedBookmarks.values());
};

/**
 * Merge a single bookmark with conflict detection
 */
const mergeSingleBookmark = (
  localBookmark: Bookmark,
  remoteBookmark: Bookmark,
  userLastSynced: string,
  categoryName: string,
  bundleName: string,
  conflictResolutions: ConflictResolution[],
  strategy: string,
  conflicts: MergeConflict[]
): Bookmark | null => {
  const localBookmarkWithMeta = ensureBookmarkMetadata(localBookmark);
  const remoteBookmarkWithMeta = ensureBookmarkMetadata(remoteBookmark);
  
  const localLastModified = getBookmarkLastModified(localBookmarkWithMeta);
  const remoteLastModified = getBookmarkLastModified(remoteBookmarkWithMeta);
  
  // Check if user has provided resolution for this bookmark
  const userResolution = conflictResolutions.find(r => 
    r.categoryName === categoryName && 
    r.bundleName === bundleName && 
    r.bookmarkId === localBookmark.id &&
    r.type === 'bookmark'
  );
  
  if (userResolution) {
    // Use user's choice
    if (userResolution.resolution === 'local') {
      return localBookmarkWithMeta;
    } else if (userResolution.resolution === 'remote') {
      return remoteBookmarkWithMeta;
    }
  }
  
  // Handle deletion cases
  const localDeleted = isBookmarkDeleted(localBookmarkWithMeta);
  const remoteDeleted = isBookmarkDeleted(remoteBookmarkWithMeta);
  
  if (localDeleted && remoteDeleted) {
    return null; // Both deleted
  } else if (localDeleted && !remoteDeleted) {
    // Local deleted, remote exists - check if deletion happened after last sync
    if (isNewerThan(localLastModified, userLastSynced)) {
      // Local deletion is newer than last sync - respect the deletion
      return null;
    } else {
      // Local deletion is older than last sync - use timestamp comparison
      if (isNewerThan(localLastModified, remoteLastModified)) {
        return null; // Local deletion is newer
      } else {
        return remoteBookmarkWithMeta; // Remote bookmark is newer
      }
    }
  } else if (!localDeleted && remoteDeleted) {
    // Remote deleted, local exists - check if deletion happened after last sync
    if (isNewerThan(remoteLastModified, userLastSynced)) {
      // Remote deletion is newer than last sync - respect the deletion
      return null;
    } else {
      // Remote deletion is older than last sync - use timestamp comparison
      if (isNewerThan(remoteLastModified, localLastModified)) {
        return null; // Remote deletion is newer
      } else {
        return localBookmarkWithMeta; // Local bookmark is newer
      }
    }
  }
  
  // Both exist and neither is deleted - apply merge strategy
  let winner: Bookmark;
  
  switch (strategy) {
    case 'local-wins':
      winner = localBookmarkWithMeta;
      break;
    case 'remote-wins':
      winner = remoteBookmarkWithMeta;
      break;
    case 'timestamp-based':
    default:
      if (isNewerThan(localLastModified, remoteLastModified)) {
        winner = localBookmarkWithMeta;
      } else if (isNewerThan(remoteLastModified, localLastModified)) {
        winner = remoteBookmarkWithMeta;
      } else {
        // Same timestamp - check if content is different
        const isContentDifferent = (
          localBookmark.title !== remoteBookmark.title ||
          localBookmark.url !== remoteBookmark.url ||
          localBookmark.notes !== remoteBookmark.notes ||
          JSON.stringify(localBookmark.tags) !== JSON.stringify(remoteBookmark.tags)
        );
        
        if (isContentDifferent) {
          // Content is different - need user resolution
          conflicts.push({
            category: categoryName,
            bundle: bundleName,
            bookmark: localBookmark.id,
            localData: localBookmarkWithMeta,
            remoteData: remoteBookmarkWithMeta,
            localLastModified,
            remoteLastModified,
            type: 'bookmark'
          });
        }
        
        // Use local as temporary placeholder
        winner = localBookmarkWithMeta;
      }
      break;
  }
  
  return winner;
};

/**
 * Resolve conflicts with user choices and re-merge
 */
export const resolveConflicts = (
  localRoot: Root,
  remoteRoot: Root,
  resolutions: ConflictResolution[],
  userLastSynced?: string
): Root => {
  const result = mergeRoots(localRoot, remoteRoot, {
    conflictResolutions: resolutions,
    strategy: 'timestamp-based',
    userLastSynced
  });
  
  if (result.hasConflicts) {
    throw new Error('Conflicts still exist after resolution attempt');
  }
  
  return result.mergedRoot;
};

/**
 * Check if two roots have conflicts without merging
 */
export const hasConflicts = (localRoot: Root, remoteRoot: Root, userLastSynced?: string): boolean => {
  const result = mergeRoots(localRoot, remoteRoot, { 
    strategy: 'timestamp-based',
    userLastSynced
  });
  return result.hasConflicts;
};

/**
 * Get conflicts between two roots without merging
 */
export const getConflicts = (localRoot: Root, remoteRoot: Root, userLastSynced?: string): MergeConflict[] => {
  const result = mergeRoots(localRoot, remoteRoot, { 
    strategy: 'timestamp-based',
    userLastSynced
  });
  return result.conflicts;
};