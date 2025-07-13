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
    try {
      // Validate input
      if (!gistId || gistId.trim() === '') {
        return success(false);
      }
      
      // Check existence in internal storage
      return success(this.gists.has(gistId));
    } catch (error) {
      return failure(new Error(`Failed to check gist existence: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async findByFilename(filename: string): Promise<Result<GistReadResult | null>> {
    try {
      // Validate input
      if (!filename || filename.trim() === '') {
        return success(null);
      }
      
      const gistId = this.gistsByFilename.get(filename);
      
      if (!gistId) {
        return success(null);
      }
      
      // Use read method to get full gist data
      const readResult = await this.read(gistId);
      
      // If read fails, return null instead of propagating the error
      if (!readResult.success) {
        return success(null);
      }
      
      return readResult;
    } catch (error) {
      return failure(new Error(`Failed to find gist by filename: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  async getCommits(gistId: string): Promise<Result<GistCommit[]>> {
    try {
      // Validate input
      if (!gistId || gistId.trim() === '') {
        return failure(new Error('Gist ID is required'));
      }
      
      const gist = this.gists.get(gistId);
      
      if (!gist) {
        return failure(new Error(`Gist ${gistId} not found`));
      }
      
      // Mock commit history - in real implementation, this would track full history
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
    } catch (error) {
      return failure(new Error(`Failed to get commits: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  private generateId(): string {
    // Generate a more realistic gist-like ID
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
  
  private generateEtag(): string {
    // Generate etag based on content hash simulation
    const hash = Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `"${hash}"`;
  }
}