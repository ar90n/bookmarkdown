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

interface StoredGist {
  id: string;
  content: string;
  description: string;
  filename: string;
  isPublic: boolean;
  etag: string;
  createdAt: string;
  updatedAt: string;
}

export class MockGistRepository implements GistRepository {
  private gists: Map<string, StoredGist> = new Map();
  private gistsByFilename: Map<string, string> = new Map(); // filename -> gistId
  
  async create(params: GistCreateParams): Promise<Result<GistCreateResult>> {
    try {
      // Validate parameters
      if (!params.filename || params.filename.trim() === '') {
        return failure(new Error('Filename is required'));
      }
      
      if (!params.content) {
        return failure(new Error('Content is required'));
      }
      
      const id = this.generateId();
      const etag = this.generateEtag();
      const now = new Date().toISOString();
      
      const gist: StoredGist = {
        id,
        content: params.content,
        description: params.description,
        filename: params.filename,
        isPublic: params.isPublic ?? false,
        etag,
        createdAt: now,
        updatedAt: now
      };
      
      this.gists.set(id, gist);
      this.gistsByFilename.set(params.filename, id);
      
      return success({
        id,
        etag
      });
    } catch (error) {
      return failure(new Error(`Failed to create gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async read(gistId: string): Promise<Result<GistReadResult>> {
    try {
      if (!gistId || gistId.trim() === '') {
        return failure(new Error('Gist ID is required'));
      }
      
      const gist = this.gists.get(gistId);
      
      if (!gist) {
        return failure(new Error(`Gist ${gistId} not found`));
      }
      
      return success({
        id: gist.id,
        content: gist.content,
        etag: gist.etag
      });
    } catch (error) {
      return failure(new Error(`Failed to read gist: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async update(params: GistUpdateParams): Promise<Result<GistUpdateResult>> {
    const gist = this.gists.get(params.gistId);
    
    if (!gist) {
      return failure(new Error(`Gist ${params.gistId} not found`));
    }
    
    if (gist.etag !== params.etag) {
      return failure(new Error('Etag mismatch - gist has been modified'));
    }
    
    const newEtag = this.generateEtag();
    
    this.gists.set(params.gistId, {
      ...gist,
      content: params.content,
      description: params.description ?? gist.description,
      etag: newEtag,
      updatedAt: new Date().toISOString()
    });
    
    return success({
      etag: newEtag
    });
  }
  
  async exists(gistId: string): Promise<Result<boolean>> {
    return success(this.gists.has(gistId));
  }
  
  async findByFilename(filename: string): Promise<Result<GistReadResult | null>> {
    const gistId = this.gistsByFilename.get(filename);
    
    if (!gistId) {
      return success(null);
    }
    
    return this.read(gistId);
  }
  
  async getCommits(gistId: string): Promise<Result<GistCommit[]>> {
    const gist = this.gists.get(gistId);
    
    if (!gist) {
      return failure(new Error(`Gist ${gistId} not found`));
    }
    
    // Mock commit history
    return success([
      {
        version: gist.etag.replace(/"/g, ''),
        committedAt: gist.updatedAt,
        changeStatus: {
          additions: 0,
          deletions: 0,
          total: 0
        }
      }
    ]);
  }
  
  private generateId(): string {
    return Math.random().toString(16).substring(2);
  }
  
  private generateEtag(): string {
    return `"${Math.random().toString(16).substring(2)}"`;
  }
}