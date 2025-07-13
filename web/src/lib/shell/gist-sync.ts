import { Root } from '../types/index.js';
import { Result, success, failure } from '../types/result.js';
import { GistRepository } from '../repositories/gist-repository.js';
import { MarkdownParser, MarkdownGenerator } from '../parsers/index.js';

export interface GistSyncConfig {
  readonly repository: GistRepository;
  readonly gistId?: string;
  readonly description?: string;
}

export interface GistSyncResult {
  readonly gistId: string;
  readonly etag: string;
  readonly root: Root;
}

/**
 * New sync shell using GistRepository with remote-first approach
 * No merge processing - remote is always the source of truth
 */
export class GistSyncShell {
  private readonly repository: GistRepository;
  private readonly parser = new MarkdownParser();
  private readonly generator = new MarkdownGenerator();
  private currentGistId?: string;
  private currentEtag?: string;
  
  constructor(config: GistSyncConfig) {
    this.repository = config.repository;
    this.currentGistId = config.gistId;
  }
  
  /**
   * Load data from remote gist
   */
  async load(gistId?: string): Promise<Result<Root>> {
    try {
      const targetGistId = gistId || this.currentGistId;
      
      if (!targetGistId) {
        // No gist ID - try to find by filename
        const findResult = await this.repository.findByFilename('bookmarks.md');
        
        if (!findResult.success) {
          return failure(findResult.error);
        }
        
        if (!findResult.data) {
          return failure(new Error('No bookmarks gist found'));
        }
        
        // Found a gist, use it
        this.currentGistId = findResult.data.id;
        this.currentEtag = findResult.data.etag;
        
        const root = this.parser.parse(findResult.data.content);
        return success(root);
      }
      
      // Load specific gist
      const readResult = await this.repository.read(targetGistId);
      
      if (!readResult.success) {
        return failure(readResult.error);
      }
      
      this.currentGistId = readResult.data.id;
      this.currentEtag = readResult.data.etag;
      
      const root = this.parser.parse(readResult.data.content);
      return success(root);
    } catch (error) {
      return failure(new Error(`Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Save data to remote gist
   * Creates new gist if needed
   */
  async save(root: Root, description?: string): Promise<Result<GistSyncResult>> {
    try {
      const content = this.generator.generate(root);
      
      if (this.currentGistId && this.currentEtag) {
        // Update existing gist
        const updateResult = await this.repository.update({
          gistId: this.currentGistId,
          content,
          etag: this.currentEtag,
          description
        });
        
        if (!updateResult.success) {
          // Handle etag mismatch
          if (updateResult.error.message.includes('Precondition Failed') || 
              updateResult.error.message.includes('Etag mismatch')) {
            return failure(new Error('Remote has been modified. Please reload before saving.'));
          }
          return failure(updateResult.error);
        }
        
        this.currentEtag = updateResult.data.etag;
        
        return success({
          gistId: this.currentGistId,
          etag: this.currentEtag,
          root
        });
      } else {
        // Create new gist
        const createResult = await this.repository.create({
          description: description || 'BookMarkDown - Bookmark Collection',
          content,
          filename: 'bookmarks.md',
          isPublic: false
        });
        
        if (!createResult.success) {
          return failure(createResult.error);
        }
        
        this.currentGistId = createResult.data.id;
        this.currentEtag = createResult.data.etag;
        
        return success({
          gistId: this.currentGistId,
          etag: this.currentEtag,
          root
        });
      }
    } catch (error) {
      return failure(new Error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  /**
   * Force reload from remote (discards local changes)
   */
  async forceReload(): Promise<Result<Root>> {
    if (!this.currentGistId) {
      return failure(new Error('No gist ID available for reload'));
    }
    
    // Clear etag to force fresh load
    this.currentEtag = undefined;
    return this.load(this.currentGistId);
  }
  
  /**
   * Check if remote has changes
   */
  async hasRemoteChanges(): Promise<Result<boolean>> {
    if (!this.currentGistId || !this.currentEtag) {
      return success(false);
    }
    
    const readResult = await this.repository.read(this.currentGistId);
    
    if (!readResult.success) {
      return failure(readResult.error);
    }
    
    return success(readResult.data.etag !== this.currentEtag);
  }
  
  /**
   * Get current gist info
   */
  getGistInfo(): { gistId?: string; etag?: string } {
    return {
      gistId: this.currentGistId,
      etag: this.currentEtag
    };
  }
}