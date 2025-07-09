import { Root, Category, MergeConflict, ConflictResolution } from '../types/index.js';
import { 
  getRootLastModified, 
  getCategoryLastModified, 
  updateRootMetadata, 
  getCurrentTimestamp,
  isNewerThan,
  ensureRootMetadata,
  ensureCategoryMetadata
} from './metadata.js';

export interface MergeResult {
  mergedRoot: Root;
  conflicts: MergeConflict[];
  hasConflicts: boolean;
}

export interface MergeOptions {
  conflictResolutions?: ConflictResolution[];
  strategy?: 'timestamp-based' | 'local-wins' | 'remote-wins';
}

/**
 * Merge local and remote roots with conflict detection
 */
export const mergeRoots = (
  localRoot: Root, 
  remoteRoot: Root, 
  options: MergeOptions = {}
): MergeResult => {
  const { conflictResolutions = [], strategy = 'timestamp-based' } = options;
  
  // Ensure both roots have metadata
  const localWithMeta = ensureRootMetadata(localRoot);
  const remoteWithMeta = ensureRootMetadata(remoteRoot);
  
  const conflicts: MergeConflict[] = [];
  const mergedCategories = new Map<string, Category>();
  
  // Get all category names from both roots
  const allCategoryNames = new Set([
    ...localWithMeta.categories.map(c => c.name),
    ...remoteWithMeta.categories.map(c => c.name)
  ]);
  
  for (const categoryName of allCategoryNames) {
    const localCategory = localWithMeta.categories.find(c => c.name === categoryName);
    const remoteCategory = remoteWithMeta.categories.find(c => c.name === categoryName);
    
    if (!localCategory && remoteCategory) {
      // Remote-only category
      mergedCategories.set(categoryName, ensureCategoryMetadata(remoteCategory));
    } else if (localCategory && !remoteCategory) {
      // Local-only category
      mergedCategories.set(categoryName, ensureCategoryMetadata(localCategory));
    } else if (localCategory && remoteCategory) {
      // Both exist - check for conflicts
      const localCategoryWithMeta = ensureCategoryMetadata(localCategory);
      const remoteCategoryWithMeta = ensureCategoryMetadata(remoteCategory);
      
      const localLastModified = getCategoryLastModified(localCategoryWithMeta);
      const remoteLastModified = getCategoryLastModified(remoteCategoryWithMeta);
      
      // Check if user has provided resolution for this category
      const userResolution = conflictResolutions.find(r => r.categoryName === categoryName);
      
      if (userResolution) {
        // Use user's choice
        if (userResolution.resolution === 'local') {
          mergedCategories.set(categoryName, localCategoryWithMeta);
        } else if (userResolution.resolution === 'remote') {
          mergedCategories.set(categoryName, remoteCategoryWithMeta);
        }
      } else {
        // Apply merge strategy
        let winner: Category;
        
        switch (strategy) {
          case 'local-wins':
            winner = localCategoryWithMeta;
            break;
          case 'remote-wins':
            winner = remoteCategoryWithMeta;
            break;
          case 'timestamp-based':
          default:
            if (isNewerThan(localLastModified, remoteLastModified)) {
              winner = localCategoryWithMeta;
            } else if (isNewerThan(remoteLastModified, localLastModified)) {
              winner = remoteCategoryWithMeta;
            } else {
              // Same timestamp or both epoch - need user resolution
              conflicts.push({
                category: categoryName,
                localData: localCategoryWithMeta,
                remoteData: remoteCategoryWithMeta,
                localLastModified,
                remoteLastModified
              });
              // Use local as temporary placeholder
              winner = localCategoryWithMeta;
            }
            break;
        }
        
        mergedCategories.set(categoryName, winner);
      }
    }
  }
  
  // Create merged root
  const mergedRoot: Root = {
    version: Math.max(localWithMeta.version, remoteWithMeta.version) as 1,
    categories: Array.from(mergedCategories.values()),
  };
  
  // Update root metadata with current timestamp
  const finalRoot = updateRootMetadata(mergedRoot, getCurrentTimestamp(), getCurrentTimestamp());
  
  return {
    mergedRoot: finalRoot,
    conflicts,
    hasConflicts: conflicts.length > 0
  };
};

/**
 * Resolve conflicts with user choices and re-merge
 */
export const resolveConflicts = (
  localRoot: Root,
  remoteRoot: Root,
  resolutions: ConflictResolution[]
): Root => {
  const result = mergeRoots(localRoot, remoteRoot, {
    conflictResolutions: resolutions,
    strategy: 'timestamp-based'
  });
  
  if (result.hasConflicts) {
    throw new Error('Conflicts still exist after resolution attempt');
  }
  
  return result.mergedRoot;
};

/**
 * Check if two roots have conflicts without merging
 */
export const hasConflicts = (localRoot: Root, remoteRoot: Root): boolean => {
  const result = mergeRoots(localRoot, remoteRoot, { strategy: 'timestamp-based' });
  return result.hasConflicts;
};

/**
 * Get conflicts between two roots without merging
 */
export const getConflicts = (localRoot: Root, remoteRoot: Root): MergeConflict[] => {
  const result = mergeRoots(localRoot, remoteRoot, { strategy: 'timestamp-based' });
  return result.conflicts;
};