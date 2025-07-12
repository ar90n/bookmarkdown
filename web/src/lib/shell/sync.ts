import { Root, Category, Bundle, Bookmark, MergeConflict, ConflictResolution } from '../types/index.js';
import { Result, success, failure, mapResult, flatMapResult } from '../types/result.js';
import { createGistClient, GistConfig } from './gist-io.js';
import { MarkdownParser, MarkdownGenerator } from '../parsers/index.js';
import { 
  mergeRoots, 
  resolveConflicts
} from '../utils/merge.js';
import { 
  ensureRootMetadata, 
  ensureRootMetadataWithoutTimestamp,
  updateAllLastSynced,
  getLocalLastSynced,
  setLocalLastSynced,
  getCategoryLastModified,
  getCategoryLastSynced,
  getBundleLastModified,
  getBundleLastSynced,
  getBookmarkLastModified,
  isNewerThan,
  isCategoryDeleted
} from '../utils/metadata.js';

export interface SyncConfig extends GistConfig {
  readonly gistId?: string;
  readonly description?: string;
}

export interface SyncResult {
  readonly gistId: string;
  readonly updatedAt: string;
  readonly conflicts?: MergeConflict[];
  readonly hasConflicts?: boolean;
  readonly mergedRoot?: Root;
}

export interface SyncShell {
  load: (gistId?: string) => Promise<Result<Root>>;
  save: (root: Root, gistId?: string, description?: string) => Promise<Result<SyncResult>>;
  sync: (root: Root, gistId?: string) => Promise<Result<SyncResult>>;
  syncWithConflictResolution: (root: Root, resolutions: ConflictResolution[], gistId?: string) => Promise<Result<SyncResult>>;
  checkConflicts: (root: Root, gistId?: string) => Promise<Result<MergeConflict[]>>;
  
  // Transactional sync operations
  syncBeforeOperation: (localRoot: Root, gistId?: string) => Promise<Result<Root>>;
  saveAfterOperation: (root: Root, gistId?: string) => Promise<Result<SyncResult>>;
}

const DEFAULT_FILENAME = 'bookmarks.md';
const GIST_CREATE_LOCK_KEY = 'bookmarkdown_gist_create_lock';
const LOCK_TIMEOUT_MS = 30000; // 30 seconds

export const createSyncShell = (config: SyncConfig): SyncShell => {
  const gistClient = createGistClient(config);
  const parser = new MarkdownParser();
  const generator = new MarkdownGenerator();
  
  // Helper function to get Gist ID with priority
  const getGistIdWithPriority = async (providedGistId?: string): Promise<string | null> => {
    // Priority 1: Provided Gist ID
    if (providedGistId) {
      return providedGistId;
    }
    
    // Priority 2: Gist ID from localStorage
    try {
      const storedGistId = localStorage.getItem(`bookmarkdown_data_gist_id`);
      if (storedGistId) {
        return storedGistId;
      }
    } catch {
      // Ignore localStorage errors
    }
    
    // Priority 3: Gist ID from config
    if (config.gistId) {
      return config.gistId;
    }
    
    // Priority 4: Search for existing Gist
    const searchResult = await gistClient.findByFilename(config.filename || DEFAULT_FILENAME);
    if (searchResult.success && searchResult.data) {
      return searchResult.data.id;
    }
    
    return null;
  };
  
  // Helper function to acquire creation lock
  const acquireCreateLock = (): boolean => {
    try {
      const now = Date.now();
      const lockValue = localStorage.getItem(GIST_CREATE_LOCK_KEY);
      
      if (lockValue) {
        const lockTime = parseInt(lockValue, 10);
        if (now - lockTime < LOCK_TIMEOUT_MS) {
          // Lock is still valid
          return false;
        }
      }
      
      // Set or update lock
      localStorage.setItem(GIST_CREATE_LOCK_KEY, now.toString());
      return true;
    } catch {
      // If localStorage fails, proceed without lock
      return true;
    }
  };
  
  // Helper function to release creation lock
  const releaseCreateLock = (): void => {
    try {
      localStorage.removeItem(GIST_CREATE_LOCK_KEY);
    } catch {
      // Ignore errors
    }
  };
  
  // Helper function to convert readonly Root to mutable for generator
  type MutableRoot = {
    version: 1;
    categories: Array<{
      name: string;
      bundles: Array<{
        name: string;
        bookmarks: Array<{
          id: string;
          title: string;
          url: string;
          tags?: string[];
          notes?: string;
          metadata?: {
            lastModified: string;
            isDeleted?: boolean;
          };
        }>;
        metadata?: {
          lastModified: string;
          isDeleted?: boolean;
        };
      }>;
      metadata?: {
        lastModified: string;
        isDeleted?: boolean;
      };
    }>;
    metadata?: {
      lastModified: string;
      // lastSynced is NOT stored in Gist - it's local-only state
    };
  };
  
  const toMutableRoot = (root: Root): MutableRoot => ({
    version: root.version,
    categories: root.categories.map(cat => ({
      name: cat.name,
      bundles: cat.bundles.map(bundle => ({
        name: bundle.name,
        bookmarks: bundle.bookmarks.map(bookmark => ({
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          tags: bookmark.tags ? [...bookmark.tags] : undefined,
          notes: bookmark.notes,
          metadata: bookmark.metadata ? {
            lastModified: bookmark.metadata.lastModified,
            isDeleted: bookmark.metadata.isDeleted
          } : undefined
        })),
        metadata: bundle.metadata ? {
          lastModified: bundle.metadata.lastModified,
          isDeleted: bundle.metadata.isDeleted
        } : undefined
      })),
      metadata: cat.metadata ? {
        lastModified: cat.metadata.lastModified,
        isDeleted: cat.metadata.isDeleted
      } : undefined
    })),
    metadata: root.metadata ? {
      lastModified: root.metadata.lastModified,
      // lastSynced is NOT stored in Gist - it's local-only state
    } : undefined
  });

  const load = async (gistId?: string): Promise<Result<Root>> => {
      const targetGistId = await getGistIdWithPriority(gistId);
      
      if (!targetGistId) {
        return failure(new Error('No gist ID found'));
      }

      const gistResult = await gistClient.read(targetGistId);
      
      return flatMapResult(gistResult, (gist) => {
        try {
          const parsedRoot = parser.parse(gist.content);
          // Ensure immutability by creating a readonly copy
          const root: Root = {
            version: parsedRoot.version,
            categories: parsedRoot.categories.map(cat => ({
              name: cat.name,
              bundles: cat.bundles.map(bundle => ({
                name: bundle.name,
                bookmarks: bundle.bookmarks.map(bookmark => ({
                  id: bookmark.id,
                  title: bookmark.title,
                  url: bookmark.url,
                  tags: bookmark.tags ? [...bookmark.tags] : undefined,
                  notes: bookmark.notes
                }))
              })),
              ...(cat.metadata && { metadata: cat.metadata })
            })),
            ...(parsedRoot.metadata && { metadata: parsedRoot.metadata })
          };
          return success(root);
        } catch (error) {
          return failure(new Error(`Failed to parse markdown: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    };

    const save = async (root: Root, gistId?: string, description?: string): Promise<Result<SyncResult>> => {
      try {
        const markdownContent = generator.generate(toMutableRoot(root));
        
        // Get Gist ID with priority
        let targetGistId = await getGistIdWithPriority(gistId);
        
        if (targetGistId) {
          // Update existing gist
          const updateResult = await gistClient.update(targetGistId, markdownContent, description);
          return mapResult(updateResult, (result) => ({
            gistId: result.id,
            updatedAt: result.updatedAt,
          }));
        } else {
          // No existing gist found, need to create new one
          // Double-check with direct search to avoid race conditions
          const searchResult = await gistClient.findByFilename(config.filename || DEFAULT_FILENAME);
          
          if (searchResult.success && searchResult.data) {
            // Found existing gist, update it instead of creating new one
            targetGistId = searchResult.data.id;
            const updateResult = await gistClient.update(targetGistId, markdownContent, description);
            return mapResult(updateResult, (result) => ({
              gistId: result.id,
              updatedAt: result.updatedAt,
            }));
          } else {
            // No existing gist found, create new one
            // Try to acquire creation lock to prevent concurrent creation
            if (!acquireCreateLock()) {
              // Another tab is creating a gist, wait and search again
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Search again after waiting
              const retrySearchResult = await gistClient.findByFilename(config.filename || DEFAULT_FILENAME);
              if (retrySearchResult.success && retrySearchResult.data) {
                // Found gist created by another tab
                targetGistId = retrySearchResult.data.id;
                const updateResult = await gistClient.update(targetGistId, markdownContent, description);
                return mapResult(updateResult, (result) => ({
                  gistId: result.id,
                  updatedAt: result.updatedAt,
                }));
              }
            }
            
            try {
              const gistDescription = description || config.description || 'BookMarkDown - Bookmark Collection';
              const createResult = await gistClient.create(gistDescription, markdownContent);
              return mapResult(createResult, (result) => ({
                gistId: result.id,
                updatedAt: result.updatedAt,
              }));
            } finally {
              releaseCreateLock();
            }
          }
        }
      } catch (error) {
        return failure(new Error(`Failed to generate markdown: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    const sync = async (root: Root, gistId?: string): Promise<Result<SyncResult>> => {
      const localRoot = ensureRootMetadataWithoutTimestamp(root);
      
      // Get Gist ID with priority
      const targetGistId = await getGistIdWithPriority(gistId);
      
      if (!targetGistId) {
        // No existing gist found, create new one
        const saveResult = await save(localRoot, undefined, config.description);
        return saveResult;
      }

      // Check if gist exists
      const existsResult = await gistClient.exists(targetGistId);
      
      if (!existsResult.success || !existsResult.data) {
        // Gist doesn't exist, create new one
        const saveResult = await save(localRoot, undefined, config.description);
        return saveResult;
      }

      // Load remote data
      const remoteResult = await load(targetGistId);
      if (!remoteResult.success) {
        return failure(new Error(`Failed to load remote data: ${remoteResult.error.message}`));
      }

      const remoteRoot = ensureRootMetadataWithoutTimestamp(remoteResult.data);
      
      // Get device-specific lastSynced from localStorage
      const deviceLastSynced = getLocalLastSynced(targetGistId);
      
      // Perform timestamp-based merge
      const mergeResult = mergeRoots(localRoot, remoteRoot, { 
        strategy: 'timestamp-based',
        userLastSynced: deviceLastSynced
      });
      
      if (mergeResult.hasConflicts) {
        // Return sync result with conflicts
        return success({
          gistId: targetGistId,
          updatedAt: new Date().toISOString(),
          conflicts: mergeResult.conflicts,
          hasConflicts: true,
          mergedRoot: mergeResult.mergedRoot
        });
      }

      // Check if there are actual changes to save
      if (!mergeResult.hasChanges) {
        // No changes - update localStorage with current sync time but don't save to Gist
        setLocalLastSynced(targetGistId);
        
        return success({
          gistId: targetGistId,
          updatedAt: new Date().toISOString(), // Use current time for sync timestamp
          conflicts: [],
          hasConflicts: false,
          mergedRoot: mergeResult.mergedRoot
        });
      }

      // Changes detected, save merged result
      const saveResult = await save(mergeResult.mergedRoot, targetGistId);
      
      if (!saveResult.success) {
        return saveResult;
      }

      // Update localStorage with current sync time
      setLocalLastSynced(targetGistId);

      return success({
        ...saveResult.data,
        conflicts: [],
        hasConflicts: false,
        mergedRoot: mergeResult.mergedRoot
      });
    };
    
    const syncWithConflictResolution = async (
      root: Root, 
      resolutions: ConflictResolution[], 
      gistId?: string
    ): Promise<Result<SyncResult>> => {
      const targetGistId = await getGistIdWithPriority(gistId);
      
      if (!targetGistId) {
        return failure(new Error('No gist ID found for sync'));
      }
      
      // Load remote data
      const remoteResult = await load(targetGistId);
      if (!remoteResult.success) {
        return failure(new Error(`Failed to load remote data: ${remoteResult.error.message}`));
      }
      
      const localRoot = ensureRootMetadata(root);
      const remoteRoot = ensureRootMetadataWithoutTimestamp(remoteResult.data);
      
      // Get device-specific lastSynced from localStorage
      const deviceLastSynced = getLocalLastSynced(targetGistId);
      
      try {
        // Resolve conflicts with user choices
        const mergedRoot = resolveConflicts(localRoot, remoteRoot, resolutions, deviceLastSynced);
        
        // Save merged result
        const saveResult = await save(mergedRoot, targetGistId);
        
        if (!saveResult.success) {
          return saveResult;
        }
        
        // Update localStorage with current sync time
        setLocalLastSynced(targetGistId);
        
        return success({
          ...saveResult.data,
          conflicts: [],
          hasConflicts: false,
          mergedRoot
        });
      } catch (error) {
        return failure(new Error(`Failed to resolve conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    const checkConflicts = async (root: Root, gistId?: string): Promise<Result<MergeConflict[]>> => {
      const targetGistId = await getGistIdWithPriority(gistId);
      
      if (!targetGistId) {
        return failure(new Error('No gist ID found for conflict check'));
      }
      
      // Load remote data
      const remoteResult = await load(targetGistId);
      if (!remoteResult.success) {
        return failure(new Error(`Failed to load remote data: ${remoteResult.error.message}`));
      }
      
      const localRoot = ensureRootMetadata(root);
      const remoteRoot = ensureRootMetadataWithoutTimestamp(remoteResult.data);
      
      // Get device-specific lastSynced from localStorage
      const deviceLastSynced = getLocalLastSynced(targetGistId);
      
      // Check for conflicts
      const mergeResult = mergeRoots(localRoot, remoteRoot, { 
        strategy: 'timestamp-based',
        userLastSynced: deviceLastSynced
      });
      
      return success(mergeResult.conflicts);
    };
    
    // Transactional sync - load and check for deletions
    const syncBeforeOperation = async (localRoot: Root, gistId?: string): Promise<Result<Root>> => {
      const targetGistId = await getGistIdWithPriority(gistId);
      
      if (!targetGistId) {
        // No remote exists, return local root as is
        return success(localRoot);
      }

      // Load remote data
      const remoteResult = await load(targetGistId);
      if (!remoteResult.success) {
        // If gist doesn't exist, return local root
        if (remoteResult.error.message.includes('404')) {
          return success(localRoot);
        }
        return failure(remoteResult.error);
      }

      const remoteRoot = ensureRootMetadataWithoutTimestamp(remoteResult.data);
      const localWithMeta = ensureRootMetadataWithoutTimestamp(localRoot);
      
      // Check for remote deletions and sync them locally
      const syncedRoot = syncDeletedElements(localWithMeta, remoteRoot, targetGistId);
      
      return success(syncedRoot);
    };
    
    // Save after operation with updated timestamps
    const saveAfterOperation = async (root: Root, gistId?: string): Promise<Result<SyncResult>> => {
      // Update all lastSynced timestamps (except root, which is handled by localStorage)
      const rootWithSyncTime = updateAllLastSynced(root);
      
      // Get the actual gist ID that will be used
      const targetGistId = await getGistIdWithPriority(gistId);
      
      // Save to remote (save function will use priority to find gist ID)
      const saveResult = await save(rootWithSyncTime, gistId, config.description);
      
      if (saveResult.success) {
        // Update localStorage with current sync time if we have a gist ID
        if (targetGistId) {
          setLocalLastSynced(targetGistId);
        }
        
        return success({
          ...saveResult.data,
          mergedRoot: rootWithSyncTime
        });
      }
      
      return saveResult;
    };
    
    // Helper function to sync deleted elements
    const syncDeletedElements = (localRoot: Root, remoteRoot: Root, gistId: string): Root => {
      const rootLastSynced = getLocalLastSynced(gistId);
      const updatedCategories = new Map<string, Category>();
      
      // Helper function to normalize category names
      const normalizeName = (name: string): string => {
        return name.trim().normalize('NFC');
      };
      
      // Check all local categories
      for (const localCategory of localRoot.categories) {
        
        const remoteCategory = remoteRoot.categories.find(c => normalizeName(c.name) === normalizeName(localCategory.name));
        
        if (!remoteCategory) {
          // Category deleted on remote
          const categoryLastModified = getCategoryLastModified(localCategory);
          if (isNewerThan(categoryLastModified, rootLastSynced)) {
            // Local changes after last sync - keep it
            updatedCategories.set(normalizeName(localCategory.name), localCategory);
          }
          // Otherwise, skip (delete locally)
          continue;
        }
        
        // Category exists on both sides - check bundles
        const categoryLastSynced = getCategoryLastSynced(localCategory);
        const updatedBundles = new Map<string, Bundle>();
        
        for (const localBundle of localCategory.bundles) {
          const remoteBundle = remoteCategory.bundles.find(b => b.name === localBundle.name);
          
          if (!remoteBundle) {
            // Bundle deleted on remote
            const bundleLastModified = getBundleLastModified(localBundle);
            if (isNewerThan(bundleLastModified, categoryLastSynced)) {
              // Local changes after last sync - keep it
              updatedBundles.set(localBundle.name, localBundle);
            }
            // Otherwise, skip (delete locally)
            continue;
          }
          
          // Bundle exists on both sides - check bookmarks
          const bundleLastSynced = getBundleLastSynced(localBundle);
          const updatedBookmarks = new Map<string, Bookmark>();
          
          for (const localBookmark of localBundle.bookmarks) {
            const remoteBookmark = remoteBundle.bookmarks.find(b => b.id === localBookmark.id);
            
            if (!remoteBookmark) {
              // Bookmark deleted on remote
              const bookmarkLastModified = getBookmarkLastModified(localBookmark);
              if (isNewerThan(bookmarkLastModified, bundleLastSynced)) {
                // Local changes after last sync - keep it
                updatedBookmarks.set(localBookmark.id, localBookmark);
              }
              // Otherwise, skip (delete locally)
              continue;
            }
            
            // Bookmark exists on both sides - keep it
            updatedBookmarks.set(localBookmark.id, localBookmark);
          }
          
          // Add bookmarks from remote that don't exist locally
          for (const remoteBookmark of remoteBundle.bookmarks) {
            if (!updatedBookmarks.has(remoteBookmark.id)) {
              updatedBookmarks.set(remoteBookmark.id, remoteBookmark);
            }
          }
          
          updatedBundles.set(localBundle.name, {
            ...localBundle,
            bookmarks: Array.from(updatedBookmarks.values())
          });
        }
        
        // Add bundles from remote that don't exist locally
        for (const remoteBundle of remoteCategory.bundles) {
          if (!updatedBundles.has(remoteBundle.name)) {
            updatedBundles.set(remoteBundle.name, remoteBundle);
          }
        }
        
        // Only add the category if it's not deleted locally
        if (!isCategoryDeleted(localCategory)) {
          updatedCategories.set(normalizeName(localCategory.name), {
            ...localCategory,
            bundles: Array.from(updatedBundles.values())
          });
        }
      }
      
      // Add categories from remote that don't exist locally (excluding locally deleted ones)
      for (const remoteCategory of remoteRoot.categories) {
        const categoryName = normalizeName(remoteCategory.name);
        
        if (!updatedCategories.has(categoryName)) {
          // Check if this category was deleted locally
          const localCategory = localRoot.categories.find(cat => normalizeName(cat.name) === categoryName);
          
          if (localCategory && isCategoryDeleted(localCategory)) {
            // Category was deleted locally - don't restore it from remote
            continue;
          }
          
          // Category doesn't exist locally and wasn't deleted - add it from remote
          updatedCategories.set(categoryName, remoteCategory);
        }
      }
      
      const result = {
        ...localRoot,
        categories: Array.from(updatedCategories.values())
      };
      
      return result;
    };
    
    return {
      load,
      save,
      sync,
      syncWithConflictResolution,
      checkConflicts,
      syncBeforeOperation,
      saveAfterOperation
    };
};