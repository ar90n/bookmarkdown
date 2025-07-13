import { Result, success, failure } from '../types/result.js';
import type {
  GistRepository,
  GistCreateParams,
  GistCreateResult,
  GistReadResult,
  GistUpdateParams,
  GistUpdateResult,
  GistCommit
} from './gist-repository.js';

export interface FetchGistRepositoryConfig {
  accessToken: string;
  filename: string;
  apiBaseUrl?: string;
}

/**
 * GitHub Gist repository implementation using Fetch API
 * Provides etag-based version control for safe concurrent updates
 */
export class FetchGistRepository implements GistRepository {
  private readonly accessToken: string;
  private readonly filename: string;
  private readonly apiBaseUrl: string;
  
  // API endpoints
  private readonly endpoints = {
    gists: '/gists',
    gist: (id: string) => `/gists/${id}`,
    commits: (id: string) => `/gists/${id}/commits`
  };
  
  constructor(config: FetchGistRepositoryConfig) {
    // Validate configuration
    this.validateConfig(config);
    
    this.accessToken = config.accessToken;
    this.filename = config.filename;
    this.apiBaseUrl = config.apiBaseUrl || 'https://api.github.com';
  }
  
  private validateConfig(config: FetchGistRepositoryConfig): void {
    if (!config.accessToken || config.accessToken.trim() === '') {
      throw new Error('Access token is required');
    }
    
    if (!config.filename || config.filename.trim() === '') {
      throw new Error('Filename is required');
    }
  }
  
  async create(params: GistCreateParams): Promise<Result<GistCreateResult>> {
    try {
      // Validate parameters
      if (!params.content || params.content.trim() === '') {
        return failure(new Error('Content is required'));
      }
      
      if (!params.description || params.description.trim() === '') {
        return failure(new Error('Description is required'));
      }
      
      // Prepare request body
      const requestBody = {
        description: params.description,
        public: params.isPublic ?? false,
        files: {
          [params.filename]: {
            content: params.content
          }
        }
      };
      
      // Make API request
      const response = await fetch(
        `${this.apiBaseUrl}${this.endpoints.gists}`,
        {
          method: 'POST',
          headers: this.getHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        const error = await this.handleApiError(response);
        return failure(error);
      }
      
      // Extract etag from headers
      const etag = response.headers.get('etag');
      if (!etag) {
        return failure(new Error('No etag received from API'));
      }
      
      // Parse response
      const gistData = await response.json();
      
      return success({
        id: gistData.id,
        etag: etag
      });
    } catch (error) {
      return failure(new Error(`Failed to create gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async read(gistId: string): Promise<Result<GistReadResult>> {
    // Implementation in next cycle
    return failure(new Error('Not implemented'));
  }
  
  async update(params: GistUpdateParams): Promise<Result<GistUpdateResult>> {
    // Implementation in next cycle
    return failure(new Error('Not implemented'));
  }
  
  async exists(gistId: string): Promise<Result<boolean>> {
    // Implementation in next cycle
    return failure(new Error('Not implemented'));
  }
  
  async findByFilename(filename: string): Promise<Result<GistReadResult | null>> {
    // Implementation in next cycle
    return failure(new Error('Not implemented'));
  }
  
  async getCommits(gistId: string): Promise<Result<GistCommit[]>> {
    // Implementation in next cycle
    return failure(new Error('Not implemented'));
  }
  
  /**
   * Create common headers for API requests
   */
  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...additionalHeaders
    };
  }
  
  /**
   * Handle API errors consistently
   */
  private async handleApiError(response: Response): Promise<Error> {
    try {
      const errorData = await response.json();
      const message = errorData.message || `API error: ${response.status}`;
      
      // Add specific error context
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
}