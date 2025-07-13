import { Result } from '../types/result.js';

/**
 * Represents a Gist with content and version information
 */
export interface GistContent {
  readonly id: string;
  readonly content: string;
  readonly etag: string;
}

/**
 * Parameters for creating a new Gist
 */
export interface GistCreateParams {
  readonly description: string;
  readonly content: string;
  readonly filename: string;
  readonly isPublic?: boolean;
}

/**
 * Result of creating a new Gist
 */
export interface GistCreateResult {
  readonly id: string;
  readonly etag: string;
}

/**
 * Parameters for updating an existing Gist
 */
export interface GistUpdateParams {
  readonly gistId: string;
  readonly content: string;
  readonly etag: string;
  readonly description?: string;
}

/**
 * Result of updating a Gist
 */
export interface GistUpdateResult {
  readonly etag: string;
}

/**
 * Result of reading a Gist
 */
export interface GistReadResult extends GistContent {}

/**
 * Represents a commit in the Gist history
 */
export interface GistCommit {
  readonly version: string;
  readonly committedAt: string;
  readonly changeStatus: {
    readonly additions: number;
    readonly deletions: number;
    readonly total: number;
  };
}

/**
 * Repository interface for Gist operations
 * Provides version-safe operations using etags
 */
export interface GistRepository {
  /**
   * Creates a new Gist
   */
  create(params: GistCreateParams): Promise<Result<GistCreateResult>>;
  
  /**
   * Reads an existing Gist
   */
  read(gistId: string): Promise<Result<GistReadResult>>;
  
  /**
   * Updates an existing Gist with etag validation
   */
  update(params: GistUpdateParams): Promise<Result<GistUpdateResult>>;
  
  /**
   * Checks if a Gist exists
   */
  exists(gistId: string): Promise<Result<boolean>>;
  
  /**
   * Finds a Gist by filename
   */
  findByFilename(filename: string): Promise<Result<GistReadResult | null>>;
  
  /**
   * Gets the commit history for a Gist
   */
  getCommits(gistId: string): Promise<Result<GistCommit[]>>;
}