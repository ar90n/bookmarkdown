import { Result, success, failure } from '../types/result.js';
import { Root } from '../types/bookmark.js';
import { RootEntity } from '../entities/root-entity.js';
import { MarkdownParser } from '../parsers/markdown-to-json.js';
import { MarkdownGenerator } from '../parsers/json-to-markdown.js';
import type {
  GistRepository,
  GistRepositoryConfig,
  CreateRepositoryParams
} from './gist-repository.js';

/**
 * Gist commit information from API
 */
interface GistCommit {
  version: string;
  committed_at: string;
  change_status?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

/**
 * GitHub Gist repository implementation using Fetch API
 * Bound to a specific Gist instance
 */
export class FetchGistRepository implements GistRepository {
  public readonly gistId: string;
  private _etag: string;
  private readonly parser: MarkdownParser;
  private readonly generator: MarkdownGenerator;
  
  get etag(): string {
    return this._etag;
  }
  
  private constructor(
    private readonly config: GistRepositoryConfig,
    gistId: string,
    etag: string
  ) {
    this.gistId = gistId;
    this._etag = etag;
    this.parser = new MarkdownParser();
    this.generator = new MarkdownGenerator();
  }
  
  /**
   * Create a repository instance
   * - If gistId is provided, binds to existing Gist
   * - Otherwise creates a new Gist
   */
  static async create(
    config: GistRepositoryConfig,
    params: CreateRepositoryParams
  ): Promise<Result<FetchGistRepository>> {
    // Validate config
    const configError = validateConfig(config);
    if (configError) {
      return failure(configError);
    }
    
    const apiBaseUrl = config.apiBaseUrl || 'https://api.github.com';
    
    if (params.gistId) {
      return FetchGistRepository.bindToExisting(config, params.gistId, apiBaseUrl);
    } else {
      return FetchGistRepository.createNew(config, params, apiBaseUrl);
    }
  }
  
  /**
   * Bind to an existing Gist
   */
  private static async bindToExisting(
    config: GistRepositoryConfig,
    gistId: string,
    apiBaseUrl: string
  ): Promise<Result<FetchGistRepository>> {
    try {
      const response = await fetch(
        `${apiBaseUrl}/gists/${gistId}`,
        {
          method: 'GET',
          headers: buildGistHeaders(config.accessToken)
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return failure(new Error(`Gist ${gistId} not found`));
        }
        const error = await handleApiError(response);
        return failure(error);
      }
      
      const etag = response.headers.get('etag');
      if (!etag) {
        return failure(new Error('No etag received from API'));
      }
      
      return success(new FetchGistRepository(config, gistId, etag));
    } catch (error) {
      return failure(new Error(`Failed to connect to existing gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Create a new Gist
   */
  private static async createNew(
    config: GistRepositoryConfig,
    params: CreateRepositoryParams,
    apiBaseUrl: string
  ): Promise<Result<FetchGistRepository>> {
    try {
      const root = params.root || RootEntity.create().toRoot();
      const generator = new MarkdownGenerator();
      const content = generator.generate(root);
      
      const requestBody = {
        description: params.description || 'BookMarkDown',
        public: params.isPublic ?? false,
        files: {
          [config.filename]: {
            content
          }
        }
      };
      
      const response = await fetch(
        `${apiBaseUrl}/gists`,
        {
          method: 'POST',
          headers: {
            ...buildGistHeaders(config.accessToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        const error = await handleApiError(response);
        return failure(error);
      }
      
      const etag = response.headers.get('etag');
      if (!etag) {
        return failure(new Error('No etag received from API'));
      }
      
      const gistData = await response.json();
      return success(new FetchGistRepository(config, gistData.id, etag));
    } catch (error) {
      return failure(new Error(`Failed to create gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Check if a Gist exists
   */
  static async exists(
    config: GistRepositoryConfig,
    gistId: string
  ): Promise<Result<boolean>> {
    if (!gistId || gistId.trim() === '') {
      return success(false);
    }
    
    const apiBaseUrl = config.apiBaseUrl || 'https://api.github.com';
    
    try {
      const response = await fetch(
        `${apiBaseUrl}/gists/${gistId}`,
        {
          method: 'HEAD',
          headers: buildGistHeaders(config.accessToken)
        }
      );
      
      return success(response.ok);
    } catch (error) {
      return failure(new Error(`Failed to check gist existence: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Find Gist ID by filename
   */
  static async findByFilename(
    config: GistRepositoryConfig,
    filename: string
  ): Promise<Result<string | null>> {
    if (!filename || filename.trim() === '') {
      return success(null);
    }
    
    const apiBaseUrl = config.apiBaseUrl || 'https://api.github.com';
    
    try {
      const response = await fetch(
        `${apiBaseUrl}/gists?per_page=100`,
        {
          method: 'GET',
          headers: buildGistHeaders(config.accessToken)
        }
      );
      
      if (!response.ok) {
        const error = await handleApiError(response);
        return failure(error);
      }
      
      const gists = await response.json();
      
      // Find gist containing the filename
      for (const gist of gists) {
        if (gist.files && gist.files[filename]) {
          return success(gist.id);
        }
      }
      
      return success(null);
    } catch (error) {
      return failure(new Error(`Failed to find gist by filename: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Read the latest Root from Gist
   */
  async read(): Promise<Result<Root>> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || 'https://api.github.com';
      
      const response = await fetch(
        `${apiBaseUrl}/gists/${this.gistId}`,
        {
          method: 'GET',
          headers: buildGistHeaders(this.config.accessToken)
        }
      );
      
      if (!response.ok) {
        const error = await handleApiError(response);
        return failure(error);
      }
      
      // Update etag
      const etag = response.headers.get('etag');
      if (!etag) {
        return failure(new Error('No etag received from API'));
      }
      this._etag = etag;
      
      // Parse content
      const gistData = await response.json();
      const file = gistData.files?.[this.config.filename];
      if (!file || !file.content) {
        return failure(new Error(`File ${this.config.filename} not found in gist`));
      }
      
      const root = this.parser.parse(file.content);
      return success(root);
    } catch (error) {
      return failure(new Error(`Failed to read gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Update Gist with new Root data
   * Performs commit hash verification to detect concurrent modifications
   */
  async update(root: Root, description?: string): Promise<Result<Root>> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || 'https://api.github.com';
      
      // Step 1: Get current state with commit info
      const beforeResponse = await fetch(
        `${apiBaseUrl}/gists/${this.gistId}`,
        {
          method: 'GET',
          headers: buildGistHeaders(this.config.accessToken)
        }
      );
      
      if (!beforeResponse.ok) {
        const error = await handleApiError(beforeResponse);
        return failure(error);
      }
      
      const beforeData = await beforeResponse.json();
      const beforeCommitHash = beforeData.history?.[0]?.version;
      console.log('[FetchGistRepository.update] Step 1 - Before commit hash:', beforeCommitHash);
      console.log('[FetchGistRepository.update] Step 1 - History data:', beforeData.history);
      if (!beforeCommitHash) {
        return failure(new Error('Could not get current commit hash'));
      }
      
      // Step 2: Perform update
      const content = this.generator.generate(root);
      const requestBody: {
        files: Record<string, { content: string }>;
        description?: string;
      } = {
        files: {
          [this.config.filename]: {
            content
          }
        }
      };
      
      if (description !== undefined) {
        requestBody.description = description;
      }
      
      const updateResponse = await fetch(
        `${apiBaseUrl}/gists/${this.gistId}`,
        {
          method: 'PATCH',
          headers: {
            ...buildGistHeaders(this.config.accessToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!updateResponse.ok) {
        const error = await handleApiError(updateResponse);
        return failure(error);
      }
      
      // Update etag
      const newEtag = updateResponse.headers.get('etag');
      if (!newEtag) {
        return failure(new Error('No etag received from API'));
      }
      this._etag = newEtag;
      
      // Step 3: Get updated state with new commit hash
      const afterData = await updateResponse.json();
      const afterCommitHash = afterData.history?.[0]?.version;
      console.log('[FetchGistRepository.update] Step 3 - After commit hash:', afterCommitHash);
      console.log('[FetchGistRepository.update] Step 3 - History data:', afterData.history);
      console.log('[FetchGistRepository.update] Step 3 - Commits are same?', beforeCommitHash === afterCommitHash);
      if (!afterCommitHash) {
        return failure(new Error('Could not get new commit hash'));
      }
      
      // Check if commit actually changed
      if (beforeCommitHash === afterCommitHash) {
        console.log('[FetchGistRepository.update] Step 3 - WARNING: Commit hash did not change after update');
        return failure(new Error(
          'Update did not create a new commit. ' +
          'This may indicate a concurrent modification or API issue.'
        ));
      }
      
      // Step 4: Verify commit order (simplified)
      // Only verify if the new commit exists in the history
      const commits = await this.getCommits();
      if (!commits.success) {
        console.log('[FetchGistRepository.update] Step 4 - WARNING: Could not verify commits, but update succeeded with new etag');
        // If we can't verify commits but got a new etag, consider it successful
        return success(root);
      }
      
      console.log('[FetchGistRepository.update] Step 4 - Commits from API:', commits.data.map(c => c.version).slice(0, 5));
      
      // Check if our new commit is in the recent history
      const recentCommits = commits.data.slice(0, 10); // Check only recent commits
      const hasNewCommit = recentCommits.some(c => c.version === afterCommitHash);
      
      console.log('[FetchGistRepository.update] Step 4 - New commit found in recent history:', hasNewCommit);
      
      if (!hasNewCommit) {
        console.log('[FetchGistRepository.update] Step 4 - WARNING: New commit not found in recent history, but update succeeded with new etag');
        // The commit API might be eventually consistent, so if we got a new etag, trust it
        return success(root);
      }
      
      return success(root);
    } catch (error) {
      return failure(new Error(`Failed to update gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Check if the Gist has remote changes since last read/update
   */
  async hasRemoteChanges(): Promise<Result<boolean>> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || 'https://api.github.com';
      
      const response = await fetch(
        `${apiBaseUrl}/gists/${this.gistId}`,
        {
          method: 'HEAD',
          headers: {
            ...buildGistHeaders(this.config.accessToken),
            'If-None-Match': this._etag
          }
        }
      );
      
      if (response.status === 304) {
        // Not Modified - no updates
        return success(false);
      }
      
      if (response.ok) {
        // Modified - has updates
        return success(true);
      }
      
      const error = await handleApiError(response);
      return failure(error);
    } catch (error) {
      return failure(new Error(`Failed to check if gist is updated: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Get commit history (private method)
   */
  private async getCommits(): Promise<Result<GistCommit[]>> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || 'https://api.github.com';
      
      const response = await fetch(
        `${apiBaseUrl}/gists/${this.gistId}/commits`,
        {
          method: 'GET',
          headers: buildGistHeaders(this.config.accessToken)
        }
      );
      
      if (!response.ok) {
        const error = await handleApiError(response);
        return failure(error);
      }
      
      const commits = await response.json();
      return success(commits);
    } catch (error) {
      return failure(new Error(`Failed to get commits: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}

/**
 * Validate repository configuration
 */
function validateConfig(config: GistRepositoryConfig): Error | null {
  if (!config.accessToken || config.accessToken.trim() === '') {
    return new Error('Access token is required');
  }
  
  if (!config.filename || config.filename.trim() === '') {
    return new Error('Filename is required');
  }
  
  return null;
}

/**
 * Build common Gist API headers
 */
function buildGistHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/**
 * Handle API errors consistently
 */
async function handleApiError(response: Response): Promise<Error> {
  try {
    const errorData = await response.json();
    const message = errorData.message || `API error: ${response.status}`;
    
    switch (response.status) {
      case 401:
        return new Error(`Authentication failed: ${message}`);
      case 403:
        return new Error(`Permission denied: ${message}`);
      case 404:
        return new Error(`Not found: ${message}`);
      case 422:
        return new Error(`Invalid request: ${message}`);
      default:
        return new Error(message);
    }
  } catch {
    return new Error(`API error: ${response.status} ${response.statusText}`);
  }
}