import { Octokit } from '@octokit/rest';
import { Result, success, failure } from '../types/result.js';

export interface GistConfig {
  readonly accessToken: string;
  readonly filename: string;
  readonly isPublic?: boolean;
}

export interface GistContent {
  readonly id: string;
  readonly content: string;
  readonly updatedAt: string;
  readonly createdAt: string;
}

export interface GistCreateResult {
  readonly id: string;
  readonly updatedAt: string;
}

export interface GistReadResult {
  readonly id: string;
  readonly content: string;
  readonly updatedAt: string;
}

export interface GistClient {
  create: (description: string, content: string) => Promise<Result<GistCreateResult>>;
  read: (gistId: string) => Promise<Result<GistReadResult>>;
  update: (gistId: string, content: string, description?: string) => Promise<Result<GistCreateResult>>;
  exists: (gistId: string) => Promise<Result<boolean>>;
  findByFilename: (filename: string) => Promise<Result<GistReadResult | null>>;
}

const DEFAULT_FILENAME = 'bookmarks.md';

export const createGistClient = (config: GistConfig) => {
  const octokit = new Octokit({
    auth: config.accessToken,
  });

  return {
    create: async (description: string, content: string): Promise<Result<GistCreateResult>> => {
      try {
        const response = await octokit.rest.gists.create({
          description,
          files: {
            [config.filename || DEFAULT_FILENAME]: {
              content,
            },
          },
          public: config.isPublic ?? false,
        });

        return success({
          id: response.data.id || '',
          updatedAt: response.data.updated_at || '',
        });
      } catch (error) {
        return failure(new Error(`Failed to create gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    read: async (gistId: string): Promise<Result<GistContent>> => {
      try {
        const response = await octokit.rest.gists.get({
          gist_id: gistId,
        });

        const filename = config.filename || DEFAULT_FILENAME;
        const file = response.data.files?.[filename];

        if (!file) {
          return failure(new Error(`File '${filename}' not found in gist`));
        }

        return success({
          id: response.data.id || '',
          content: file.content || '',
          updatedAt: response.data.updated_at || '',
          createdAt: response.data.created_at || '',
        });
      } catch (error) {
        return failure(new Error(`Failed to read gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    update: async (gistId: string, content: string, description?: string): Promise<Result<GistCreateResult>> => {
      try {
        const updateData: { gist_id: string; files: Record<string, { content: string }>; description?: string } = {
          gist_id: gistId,
          files: {
            [config.filename || DEFAULT_FILENAME]: {
              content,
            },
          },
        };

        if (description) {
          updateData.description = description;
        }

        const response = await octokit.rest.gists.update(updateData);

        return success({
          id: response.data.id || '',
          updatedAt: response.data.updated_at || '',
        });
      } catch (error) {
        return failure(new Error(`Failed to update gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    delete: async (gistId: string): Promise<Result<void>> => {
      try {
        await octokit.rest.gists.delete({
          gist_id: gistId,
        });
        return success(undefined);
      } catch (error) {
        return failure(new Error(`Failed to delete gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    exists: async (gistId: string): Promise<Result<boolean>> => {
      try {
        await octokit.rest.gists.get({
          gist_id: gistId,
        });
        return success(true);
      } catch {
        return success(false);
      }
    },

    findByFilename: async (filename: string): Promise<Result<GistReadResult | null>> => {
      try {
        // List all gists for the authenticated user
        const response = await octokit.rest.gists.list({
          per_page: 100, // Max allowed by GitHub API
        });

        // Search for a gist containing the specified filename
        for (const gist of response.data) {
          if (gist.files && gist.files[filename]) {
            // Found a gist with the target filename
            // For the list endpoint, we need to fetch the full gist to get content
            const fullGistResult = await octokit.rest.gists.get({
              gist_id: gist.id,
            });
            
            const fullFile = fullGistResult.data.files?.[filename];
            if (!fullFile || !fullFile.content) {
              continue; // Skip if content is not available
            }

            return success({
              id: gist.id,
              content: fullFile.content,
              updatedAt: gist.updated_at || '',
            });
          }
        }

        // No gist found with the specified filename
        return success(null);
      } catch (error) {
        return failure(new Error(`Failed to search gists: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },
  };
};