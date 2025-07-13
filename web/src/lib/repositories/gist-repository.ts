import { Result } from '../types/result.js';
import { Root } from '../types/bookmark.js';

/**
 * Configuration for Repository
 */
export interface GistRepositoryConfig {
  readonly accessToken: string;
  readonly filename: string;
  readonly apiBaseUrl?: string;
}

/**
 * Parameters for creating a Repository instance
 */
export interface CreateRepositoryParams {
  readonly gistId?: string;      // If provided, use existing Gist
  readonly root?: Root;           // Initial data for new Gist
  readonly description?: string;  // Description for new Gist
  readonly isPublic?: boolean;    // Public/private for new Gist
}

/**
 * Repository instance bound to a specific Gist
 */
export interface GistRepository {
  /**
   * The Gist ID this repository is bound to
   */
  readonly gistId: string;
  
  /**
   * Current etag (version identifier)
   */
  readonly etag: string;
  
  /**
   * Read the latest Root from Gist
   */
  read(): Promise<Result<Root>>;
  
  /**
   * Update Gist with new Root data
   * Performs commit hash verification to detect concurrent modifications
   */
  update(root: Root, description?: string): Promise<Result<Root>>;
  
  /**
   * Check if the Gist has remote changes since last read/update
   */
  hasRemoteChanges(): Promise<Result<boolean>>;
}

/**
 * Factory interface for creating Repository instances
 */
export interface GistRepositoryFactory {
  /**
   * Create a Repository instance
   * - If gistId is provided, binds to existing Gist
   * - Otherwise creates a new Gist
   */
  create(config: GistRepositoryConfig, params: CreateRepositoryParams): Promise<Result<GistRepository>>;
  
  /**
   * Check if a Gist exists
   */
  exists(config: GistRepositoryConfig, gistId: string): Promise<Result<boolean>>;
  
  /**
   * Find Gist ID by filename
   */
  findByFilename(config: GistRepositoryConfig, filename: string): Promise<Result<string | null>>;
}