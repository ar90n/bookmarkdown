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

interface StoredGist {
  id: string;
  content: string;
  description: string;
  filename: string;
  isPublic: boolean;
  etag: string;
  createdAt: string;
  updatedAt: string;
  commits: Array<{
    version: string;
    committed_at: string;
  }>;
}

/**
 * Mock implementation of GistRepository for testing
 * Stores data in memory
 */
export class MockGistRepository implements GistRepository {
  public readonly gistId: string;
  private _etag: string;
  private readonly parser: MarkdownParser;
  private readonly generator: MarkdownGenerator;
  
  // Static storage shared between instances for testing
  private static gists: Map<string, StoredGist> = new Map();
  private static gistsByFilename: Map<string, string> = new Map();
  
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
   */
  static async create(
    config: GistRepositoryConfig,
    params: CreateRepositoryParams
  ): Promise<Result<MockGistRepository>> {
    if (params.gistId) {
      // Bind to existing Gist
      const gist = MockGistRepository.gists.get(params.gistId);
      if (!gist) {
        return failure(new Error(`Gist ${params.gistId} not found`));
      }
      
      return success(new MockGistRepository(config, params.gistId, gist.etag));
    } else {
      // Create new Gist
      const id = MockGistRepository.generateId();
      const etag = MockGistRepository.generateEtag();
      const now = new Date().toISOString();
      const commitHash = MockGistRepository.generateCommitHash();
      
      const root = params.root || RootEntity.create().toRoot();
      const generator = new MarkdownGenerator();
      const content = generator.generate(root);
      
      const gist: StoredGist = {
        id,
        content,
        description: params.description || 'BookMarkDown',
        filename: config.filename,
        isPublic: params.isPublic ?? false,
        etag,
        createdAt: now,
        updatedAt: now,
        commits: [{
          version: commitHash,
          committed_at: now
        }]
      };
      
      MockGistRepository.gists.set(id, gist);
      MockGistRepository.gistsByFilename.set(config.filename, id);
      
      return success(new MockGistRepository(config, id, etag));
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
    
    return success(MockGistRepository.gists.has(gistId));
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
    
    const gistId = MockGistRepository.gistsByFilename.get(filename);
    return success(gistId || null);
  }
  
  /**
   * Read the latest Root from Gist
   */
  async read(): Promise<Result<Root>> {
    const gist = MockGistRepository.gists.get(this.gistId);
    if (!gist) {
      return failure(new Error(`Gist ${this.gistId} not found`));
    }
    
    // Update etag
    this._etag = gist.etag;
    
    // Parse content
    const root = this.parser.parse(gist.content);
    return success(root);
  }
  
  /**
   * Update Gist with new Root data
   * Simulates commit hash verification
   */
  async update(root: Root, description?: string): Promise<Result<Root>> {
    const gist = MockGistRepository.gists.get(this.gistId);
    if (!gist) {
      return failure(new Error(`Gist ${this.gistId} not found`));
    }
    
    // Check if our etag matches the current gist's etag
    if (this._etag !== gist.etag) {
      return failure(new Error(
        'Concurrent modification detected. ' +
        'Another process modified the Gist during update. ' +
        'Please reload and try again.'
      ));
    }
    
    // Get current commit hash
    const beforeCommitHash = gist.commits[0].version;
    
    // Generate new values
    const newEtag = MockGistRepository.generateEtag();
    const newCommitHash = MockGistRepository.generateCommitHash();
    const now = new Date().toISOString();
    
    // Update gist
    const content = this.generator.generate(root);
    const updatedGist: StoredGist = {
      ...gist,
      content,
      etag: newEtag,
      updatedAt: now,
      commits: [
        {
          version: newCommitHash,
          committed_at: now
        },
        ...gist.commits
      ]
    };
    
    if (description !== undefined) {
      updatedGist.description = description;
    }
    
    MockGistRepository.gists.set(this.gistId, updatedGist);
    
    // Update instance etag
    this._etag = newEtag;
    
    // Simulate commit order verification
    // In mock, order is always correct since we control it
    const commits = updatedGist.commits;
    let foundNew = false;
    let foundBefore = false;
    let orderCorrect = false;
    
    // Commits are ordered newest first
    for (const commit of commits) {
      if (commit.version === newCommitHash) {
        foundNew = true;
      }
      if (commit.version === beforeCommitHash) {
        foundBefore = true;
        if (foundNew) {
          // Found new commit before old commit = correct order
          orderCorrect = true;
        }
        break;
      }
    }
    
    if (!orderCorrect) {
      // This shouldn't happen in mock, but included for completeness
      return failure(new Error(
        'Concurrent modification detected. ' +
        'Another process modified the Gist during update. ' +
        'Please reload and try again.'
      ));
    }
    
    return success(root);
  }
  
  /**
   * Check if the Gist has remote changes
   */
  async hasRemoteChanges(): Promise<Result<boolean>> {
    const gist = MockGistRepository.gists.get(this.gistId);
    if (!gist) {
      return failure(new Error(`Gist ${this.gistId} not found`));
    }
    
    return success(gist.etag !== this._etag);
  }
  
  /**
   * Clear all stored data (for testing)
   */
  static clearAll(): void {
    MockGistRepository.gists.clear();
    MockGistRepository.gistsByFilename.clear();
  }
  
  /**
   * Simulate concurrent modification (for testing)
   */
  static simulateConcurrentModification(gistId: string): void {
    const gist = MockGistRepository.gists.get(gistId);
    if (gist) {
      const newEtag = MockGistRepository.generateEtag();
      const newCommitHash = MockGistRepository.generateCommitHash();
      const now = new Date().toISOString();
      
      MockGistRepository.gists.set(gistId, {
        ...gist,
        etag: newEtag,
        updatedAt: now,
        commits: [
          {
            version: newCommitHash,
            committed_at: now
          },
          ...gist.commits
        ]
      });
    }
  }
  
  // Helper methods
  
  private static generateId(): string {
    return `mock_gist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private static generateEtag(): string {
    return `"${Date.now()}_${Math.random().toString(36).substr(2, 9)}"`;
  }
  
  private static generateCommitHash(): string {
    return `${Math.random().toString(16).substr(2, 8)}${Math.random().toString(16).substr(2, 8)}`;
  }
}