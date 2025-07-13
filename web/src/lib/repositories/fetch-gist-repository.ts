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
    try {
      // Validate parameters
      if (!gistId || gistId.trim() === '') {
        return failure(new Error('Gist ID is required'));
      }
      
      // Make API request
      const response = await fetch(
        `${this.apiBaseUrl}${this.endpoints.gist(gistId)}`,
        {
          method: 'GET',
          headers: this.getHeaders()
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
      
      // Find the file content
      const file = gistData.files?.[this.filename];
      if (!file || !file.content) {
        return failure(new Error(`File ${this.filename} not found in gist`));
      }
      
      return success({
        id: gistData.id,
        content: file.content,
        etag: etag
      });
    } catch (error) {
      return failure(new Error(`Failed to read gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async update(params: GistUpdateParams): Promise<Result<GistUpdateResult>> {
    try {
      // Validate parameters
      if (!params.gistId || params.gistId.trim() === '') {
        return failure(new Error('Gist ID is required'));
      }
      
      if (!params.content || params.content.trim() === '') {
        return failure(new Error('Content is required'));
      }
      
      if (!params.etag || params.etag.trim() === '') {
        return failure(new Error('Etag is required for updates'));
      }
      
      // Prepare request body
      const requestBody: any = {
        files: {
          [this.filename]: {
            content: params.content
          }
        }
      };
      
      // Add description if provided
      if (params.description !== undefined) {
        requestBody.description = params.description;
      }
      
      // Make API request with If-Match header for etag validation
      const response = await fetch(
        `${this.apiBaseUrl}${this.endpoints.gist(params.gistId)}`,
        {
          method: 'PATCH',
          headers: this.getHeaders({
            'Content-Type': 'application/json',
            'If-Match': params.etag
          }),
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        const error = await this.handleApiError(response);
        return failure(error);
      }
      
      // Extract new etag from headers
      const newEtag = response.headers.get('etag');
      if (!newEtag) {
        return failure(new Error('No etag received from API'));
      }
      
      return success({
        etag: newEtag
      });
    } catch (error) {
      return failure(new Error(`Failed to update gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async exists(gistId: string): Promise<Result<boolean>> {
    try {
      if (!gistId || gistId.trim() === '') {
        return success(false);
      }
      
      const response = await fetch(
        `${this.apiBaseUrl}${this.endpoints.gist(gistId)}`,
        {
          method: 'HEAD',
          headers: this.getHeaders()
        }
      );
      
      return success(response.ok);
    } catch (error) {
      return failure(new Error(`Failed to check gist existence: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async findByFilename(filename: string): Promise<Result<GistReadResult | null>> {
    try {
      if (!filename || filename.trim() === '') {
        return success(null);
      }
      
      // List user's gists
      const response = await fetch(
        `${this.apiBaseUrl}${this.endpoints.gists}?per_page=100`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );
      
      if (!response.ok) {
        const error = await this.handleApiError(response);
        return failure(error);
      }
      
      const gists = await response.json();
      
      // Find gist containing the filename
      for (const gist of gists) {
        if (gist.files && gist.files[filename]) {
          // Found a gist with the file, now read it to get full content
          return this.read(gist.id);
        }
      }
      
      return success(null);
    } catch (error) {
      return failure(new Error(`Failed to find gist by filename: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async getCommits(gistId: string): Promise<Result<GistCommit[]>> {
    try {
      if (!gistId || gistId.trim() === '') {
        return failure(new Error('Gist ID is required'));
      }
      
      const response = await fetch(
        `${this.apiBaseUrl}${this.endpoints.commits(gistId)}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );
      
      if (!response.ok) {
        const error = await this.handleApiError(response);
        return failure(error);
      }
      
      const commits = await response.json();
      
      // Map API response to our GistCommit interface
      const mappedCommits: GistCommit[] = commits.map((commit: any) => ({
        version: commit.version,
        committedAt: commit.committed_at,
        changeStatus: {
          additions: commit.change_status?.additions || 0,
          deletions: commit.change_status?.deletions || 0,
          total: commit.change_status?.total || 0
        }
      }));
      
      return success(mappedCommits);
    } catch (error) {
      return failure(new Error(`Failed to get commits: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
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
   * Make an API request and handle common errors
   */
  private async makeRequest(
    url: string, 
    options: RequestInit
  ): Promise<{ response: Response; etag: string }> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await this.handleApiError(response);
      throw error;
    }
    
    const etag = response.headers.get('etag');
    if (!etag) {
      throw new Error('No etag received from API');
    }
    
    return { response, etag };
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
        case 412:
          return new Error(`Precondition Failed: ${message}`);
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