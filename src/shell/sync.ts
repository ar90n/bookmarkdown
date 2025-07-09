import { Root, MergeConflict, ConflictResolution } from '../types/index.js';
import { Result, success, failure, mapResult, flatMapResult } from '../types/result.js';
import { createGistClient, GistConfig } from './gist-io.js';
import { MarkdownParser, MarkdownGenerator } from '../parsers/index.js';
import { 
  mergeRoots, 
  resolveConflicts, 
  hasConflicts as checkHasConflicts,
  MergeResult 
} from '../utils/merge.js';
import { 
  ensureRootMetadata, 
  updateRootMetadata, 
  getCurrentTimestamp,
  getRootLastModified,
  isNewerThan 
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
}

export const createSyncShell = (config: SyncConfig): SyncShell => {
  const gistClient = createGistClient(config);
  const parser = new MarkdownParser();
  const generator = new MarkdownGenerator();
  
  // Helper function to convert readonly Root to mutable for generator
  const toMutableRoot = (root: Root): any => ({
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
          notes: bookmark.notes
        }))
      })),
      metadata: cat.metadata ? {
        lastModified: cat.metadata.lastModified
      } : undefined
    })),
    metadata: root.metadata ? {
      lastModified: root.metadata.lastModified,
      lastSync: root.metadata.lastSync
    } : undefined
  });

  const load = async (gistId?: string): Promise<Result<Root>> => {
      const targetGistId = gistId || config.gistId;
      
      if (!targetGistId) {
        return failure(new Error('No gist ID provided'));
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
      const targetGistId = gistId || config.gistId;
      
      try {
        const markdownContent = generator.generate(toMutableRoot(root));
        
        if (targetGistId) {
          // Update existing gist
          const updateResult = await gistClient.update(targetGistId, markdownContent, description);
          return mapResult(updateResult, (result) => ({
            gistId: result.id,
            updatedAt: result.updatedAt,
          }));
        } else {
          // Create new gist
          const gistDescription = description || config.description || 'BookMarkDown - Bookmark Collection';
          const createResult = await gistClient.create(gistDescription, markdownContent);
          return mapResult(createResult, (result) => ({
            gistId: result.id,
            updatedAt: result.updatedAt,
          }));
        }
      } catch (error) {
        return failure(new Error(`Failed to generate markdown: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    const sync = async (root: Root, gistId?: string): Promise<Result<SyncResult>> => {
      const targetGistId = gistId || config.gistId;
      const localRoot = ensureRootMetadata(root);
      
      if (!targetGistId) {
        // No remote gist exists, create new one
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

      const remoteRoot = ensureRootMetadata(remoteResult.data);
      
      // Perform timestamp-based merge
      const mergeResult = mergeRoots(localRoot, remoteRoot, { strategy: 'timestamp-based' });
      
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

      // No conflicts, save merged result
      const saveResult = await save(mergeResult.mergedRoot, targetGistId);
      
      if (!saveResult.success) {
        return saveResult;
      }

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
      const targetGistId = gistId || config.gistId;
      
      if (!targetGistId) {
        return failure(new Error('No gist ID provided for sync'));
      }
      
      // Load remote data
      const remoteResult = await load(targetGistId);
      if (!remoteResult.success) {
        return failure(new Error(`Failed to load remote data: ${remoteResult.error.message}`));
      }
      
      const localRoot = ensureRootMetadata(root);
      const remoteRoot = ensureRootMetadata(remoteResult.data);
      
      try {
        // Resolve conflicts with user choices
        const mergedRoot = resolveConflicts(localRoot, remoteRoot, resolutions);
        
        // Save merged result
        const saveResult = await save(mergedRoot, targetGistId);
        
        if (!saveResult.success) {
          return saveResult;
        }
        
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
      const targetGistId = gistId || config.gistId;
      
      if (!targetGistId) {
        return failure(new Error('No gist ID provided for conflict check'));
      }
      
      // Load remote data
      const remoteResult = await load(targetGistId);
      if (!remoteResult.success) {
        return failure(new Error(`Failed to load remote data: ${remoteResult.error.message}`));
      }
      
      const localRoot = ensureRootMetadata(root);
      const remoteRoot = ensureRootMetadata(remoteResult.data);
      
      // Check for conflicts
      const mergeResult = mergeRoots(localRoot, remoteRoot, { strategy: 'timestamp-based' });
      
      return success(mergeResult.conflicts);
    };
    
    return {
      load,
      save,
      sync,
      syncWithConflictResolution,
      checkConflicts
    };
};