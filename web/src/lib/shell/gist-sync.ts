import { Root } from '../types/index.js';
import { Result, success, failure } from '../types/result.js';
import { 
  GistRepository, 
  GistRepositoryConfig,
  CreateRepositoryParams
} from '../repositories/gist-repository.js';
import { FetchGistRepository } from '../repositories/fetch-gist-repository.js';
import { MockGistRepository } from '../repositories/mock-gist-repository.js';

export interface GistSyncConfig {
  readonly repositoryConfig: GistRepositoryConfig;
  readonly gistId?: string;
  readonly useMock?: boolean;
}

export interface GistSyncResult {
  readonly gistId: string;
  readonly etag: string;
  readonly root: Root;
}

/**
 * Sync shell using new Repository design
 * Manages Repository instances and provides high-level sync operations
 */
export class GistSyncShell {
  private repository?: GistRepository;
  private readonly repositoryConfig: GistRepositoryConfig;
  private readonly useMock: boolean;
  
  constructor(config: GistSyncConfig) {
    this.repositoryConfig = config.repositoryConfig;
    this.useMock = config.useMock ?? false;
  }
  
  /**
   * Initialize repository (create or connect to existing Gist)
   */
  async initialize(gistId?: string): Promise<Result<void>> {
    try {
      const RepositoryClass = this.useMock ? MockGistRepository : FetchGistRepository;
      
      const params: CreateRepositoryParams = {
        gistId
      };
      
      // If no gistId provided, try to find by filename
      if (!gistId) {
        const findResult = await RepositoryClass.findByFilename(
          this.repositoryConfig, 
          this.repositoryConfig.filename
        );
        
        if (!findResult.success) {
          return failure(findResult.error);
        }
        
        if (findResult.data) {
          params.gistId = findResult.data;
        }
      }
      
      // Create repository instance
      const repoResult = await RepositoryClass.create(
        this.repositoryConfig,
        params
      );
      
      if (!repoResult.success) {
        return failure(repoResult.error);
      }
      
      this.repository = repoResult.data;
      return success(undefined);
    } catch (error) {
      return failure(new Error(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Load data from remote gist
   */
  async load(): Promise<Result<Root>> {
    if (!this.repository) {
      return failure(new Error('Repository not initialized. Call initialize() first.'));
    }
    
    try {
      return await this.repository.read();
    } catch (error) {
      return failure(new Error(`Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Save data to remote gist
   */
  async save(root: Root, description?: string): Promise<Result<GistSyncResult>> {
    if (!this.repository) {
      return failure(new Error('Repository not initialized. Call initialize() first.'));
    }
    
    try {
      const updateResult = await this.repository.update(root, description);
      
      if (!updateResult.success) {
        return failure(updateResult.error);
      }
      
      return success({
        gistId: this.repository.gistId,
        etag: this.repository.etag,
        root: updateResult.data
      });
    } catch (error) {
      return failure(new Error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Check if remote has been updated
   */
  async isRemoteUpdated(): Promise<Result<boolean>> {
    if (!this.repository) {
      return failure(new Error('Repository not initialized. Call initialize() first.'));
    }
    
    try {
      return await this.repository.hasRemoteUpdate();
    } catch (error) {
      return failure(new Error(`Failed to check remote: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Get current Gist info
   */
  getGistInfo(): { gistId?: string; etag?: string } {
    if (!this.repository) {
      return {};
    }
    
    return {
      gistId: this.repository.gistId,
      etag: this.repository.etag
    };
  }
  
  /**
   * Create a new Gist with initial data
   */
  static async createNew(
    config: GistRepositoryConfig,
    root: Root,
    description?: string,
    isPublic?: boolean,
    useMock?: boolean
  ): Promise<Result<GistSyncShell>> {
    try {
      const RepositoryClass = useMock ? MockGistRepository : FetchGistRepository;
      
      const repoResult = await RepositoryClass.create(config, {
        root,
        description,
        isPublic
      });
      
      if (!repoResult.success) {
        return failure(repoResult.error);
      }
      
      const shell = new GistSyncShell({
        repositoryConfig: config,
        useMock
      });
      
      shell.repository = repoResult.data;
      
      return success(shell);
    } catch (error) {
      return failure(new Error(`Failed to create new gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}