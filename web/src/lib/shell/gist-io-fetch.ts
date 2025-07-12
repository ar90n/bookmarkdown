import { Result, success, failure } from '../types/result.js';
import { GistConfig, GistContent, GistCreateResult, GistReadResult, GistClient } from './gist-io.js';

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_FILENAME = 'bookmarks.md';

interface GitHubError {
  message?: string;
  documentation_url?: string;
}

const fetchWithAuth = async (
  url: string, 
  accessToken: string,
  options: RequestInit = {}
): Promise<any> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
    try {
      const errorData: GitHubError = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const createGistClient = (config: GistConfig): GistClient => {
  const filename = config.filename || DEFAULT_FILENAME;

  return {
    create: async (description: string, content: string): Promise<Result<GistCreateResult>> => {
      try {
        const data = await fetchWithAuth(`${GITHUB_API_BASE}/gists`, config.accessToken, {
          method: 'POST',
          body: JSON.stringify({
            description,
            public: config.isPublic ?? false,
            files: {
              [filename]: {
                content,
              },
            },
          }),
        });

        return success({
          id: data.id || '',
          updatedAt: data.updated_at || '',
        });
      } catch (error) {
        return failure(new Error(`Failed to create gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    read: async (gistId: string): Promise<Result<GistContent>> => {
      try {
        const data = await fetchWithAuth(
          `${GITHUB_API_BASE}/gists/${gistId}`,
          config.accessToken
        );

        const file = data.files?.[filename];

        if (!file) {
          return failure(new Error(`File '${filename}' not found in gist`));
        }

        return success({
          id: data.id || '',
          content: file.content || '',
          updatedAt: data.updated_at || '',
          createdAt: data.created_at || '',
        });
      } catch (error) {
        return failure(new Error(`Failed to read gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    update: async (gistId: string, content: string, description?: string): Promise<Result<GistCreateResult>> => {
      try {
        const body: any = {
          files: {
            [filename]: {
              content,
            },
          },
        };

        if (description) {
          body.description = description;
        }

        const data = await fetchWithAuth(
          `${GITHUB_API_BASE}/gists/${gistId}`,
          config.accessToken,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          }
        );

        return success({
          id: data.id || '',
          updatedAt: data.updated_at || '',
        });
      } catch (error) {
        return failure(new Error(`Failed to update gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    exists: async (gistId: string): Promise<Result<boolean>> => {
      try {
        await fetchWithAuth(
          `${GITHUB_API_BASE}/gists/${gistId}`,
          config.accessToken
        );
        return success(true);
      } catch (error) {
        // Check if it's a 404 error (gist not found)
        if (error instanceof Error && error.message.includes('404')) {
          return success(false);
        }
        // For other errors, return failure
        return failure(new Error(`Failed to check gist existence: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },

    findByFilename: async (filename: string): Promise<Result<GistReadResult | null>> => {
      try {
        // List all gists for the authenticated user
        const data = await fetchWithAuth(
          `${GITHUB_API_BASE}/gists?per_page=100`,
          config.accessToken
        );

        // Search for a gist containing the specified filename
        for (const gist of data) {
          if (gist.files && gist.files[filename]) {
            // Found a gist with the target filename
            // For the list endpoint, we need to fetch the full gist to get content
            const fullGistData = await fetchWithAuth(
              `${GITHUB_API_BASE}/gists/${gist.id}`,
              config.accessToken
            );

            const file = fullGistData.files?.[filename];
            if (file) {
              return success({
                id: gist.id,
                content: file.content || '',
                updatedAt: fullGistData.updated_at || '',
              });
            }
          }
        }

        // No gist found with the specified filename
        return success(null);
      } catch (error) {
        return failure(new Error(`Failed to find gist by filename: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    },
  };
};