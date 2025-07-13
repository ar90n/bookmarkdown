import { describe, it, expect } from 'vitest';
import type { 
  GistRepository, 
  GistRepositoryFactory,
  GistRepositoryConfig,
  CreateRepositoryParams 
} from '../../src/lib/repositories/gist-repository.js';
import { Root } from '../../src/lib/types/bookmark.js';

describe('GistRepository Interface', () => {
  // Test that the instance interface is properly defined
  it('should define instance interface with all required methods', () => {
    class TestRepository implements GistRepository {
      readonly gistId = 'test-gist-id';
      readonly etag = 'test-etag';
      
      async read() {
        const root: Root = { version: 1, categories: [] };
        return { success: true as const, data: root };
      }
      
      async update(root: Root, description?: string) {
        return { success: true as const, data: root };
      }
      
      async hasRemoteUpdate() {
        return { success: true as const, data: false };
      }
    }
    
    const repository = new TestRepository();
    expect(repository.gistId).toBeDefined();
    expect(repository.etag).toBeDefined();
    expect(repository.read).toBeDefined();
    expect(repository.update).toBeDefined();
    expect(repository.hasRemoteUpdate).toBeDefined();
  });
  
  // Test that the factory interface is properly defined
  it('should define factory interface with all required static methods', () => {
    class TestRepositoryFactory implements GistRepositoryFactory {
      async create(config: GistRepositoryConfig, params: CreateRepositoryParams) {
        const repo: GistRepository = {
          gistId: params.gistId || 'new-gist-id',
          etag: 'new-etag',
          read: async () => ({ success: true as const, data: { version: 1, categories: [] } }),
          update: async (root: Root) => ({ success: true as const, data: root }),
          hasRemoteUpdate: async () => ({ success: true as const, data: false })
        };
        return { success: true as const, data: repo };
      }
      
      async exists(config: GistRepositoryConfig, gistId: string) {
        return { success: true as const, data: true };
      }
      
      async findByFilename(config: GistRepositoryConfig, filename: string) {
        return { success: true as const, data: null };
      }
    }
    
    const factory = new TestRepositoryFactory();
    expect(factory.create).toBeDefined();
    expect(factory.exists).toBeDefined();
    expect(factory.findByFilename).toBeDefined();
  });
});