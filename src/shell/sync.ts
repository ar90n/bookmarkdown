import { Root } from '../types/index.js';
import { Result, success, failure, mapResult, flatMapResult } from '../types/result.js';
import { createGistClient, GistConfig } from './gist-io.js';
import { MarkdownParser, MarkdownGenerator } from '../parsers/index.js';

export interface SyncConfig extends GistConfig {
  readonly gistId?: string;
  readonly description?: string;
}

export interface SyncResult {
  readonly gistId: string;
  readonly updatedAt: string;
}

export interface SyncShell {
  load: (gistId?: string) => Promise<Result<Root>>;
  save: (root: Root, gistId?: string, description?: string) => Promise<Result<SyncResult>>;
  sync: (root: Root, gistId?: string) => Promise<Result<SyncResult>>;
}

export const createSyncShell = (config: SyncConfig): SyncShell => {
  const gistClient = createGistClient(config);
  const parser = new MarkdownParser();
  const generator = new MarkdownGenerator();

  return {
    load: async (gistId?: string): Promise<Result<Root>> => {
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
              }))
            }))
          };
          return success(root);
        } catch (error) {
          return failure(new Error(`Failed to parse markdown: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    },

    save: async (root: Root, gistId?: string, description?: string): Promise<Result<SyncResult>> => {
      const targetGistId = gistId || config.gistId;
      
      try {
        // Convert readonly Root to mutable for generator
        const mutableRoot = {
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
            }))
          }))
        };
        const markdownContent = generator.generate(mutableRoot);
        
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
    },

    sync: async (root: Root, gistId?: string): Promise<Result<SyncResult>> => {
      const targetGistId = gistId || config.gistId;
      
      if (!targetGistId) {
        // No remote gist exists, create new one
        const mutableRoot = {
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
            }))
          }))
        };
        return await gistClient.create(
          config.description || 'BookMarkDown - Bookmark Collection',
          generator.generate(mutableRoot)
        ).then(result => 
          mapResult(result, (data) => ({
            gistId: data.id,
            updatedAt: data.updatedAt,
          }))
        );
      }

      // Check if gist exists
      const existsResult = await gistClient.exists(targetGistId);
      
      if (!existsResult.success || !existsResult.data) {
        // Gist doesn't exist, create new one
        const mutableRoot = {
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
            }))
          }))
        };
        return await gistClient.create(
          config.description || 'BookMarkDown - Bookmark Collection',
          generator.generate(mutableRoot)
        ).then(result => 
          mapResult(result, (data) => ({
            gistId: data.id,
            updatedAt: data.updatedAt,
          }))
        );
      }

      // Gist exists, use last-write-wins strategy by simply saving local data
      try {
        // Convert readonly Root to mutable for generator
        const mutableRoot = {
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
            }))
          }))
        };
        const markdownContent = generator.generate(mutableRoot);
        const updateResult = await gistClient.update(targetGistId, markdownContent);
        return mapResult(updateResult, (result) => ({
          gistId: result.id,
          updatedAt: result.updatedAt,
        }));
      } catch (error) {
        return failure(new Error(`Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },
  };
};