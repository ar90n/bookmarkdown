import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import type { GistRepository, GistRepositoryConfig } from '../../src/lib/repositories/gist-repository.js';
import { Root } from '../../src/lib/types/bookmark.js';
import { RootEntity } from '../../src/lib/entities/root-entity.js';

describe('MockGistRepository', () => {
  const config: GistRepositoryConfig = {
    accessToken: 'mock-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(() => {
    MockGistRepository.clearAll();
  });
  
  afterEach(() => {
    MockGistRepository.clearAll();
  });
  
  describe('create', () => {
    it('should create a new repository with new gist', async () => {
      const root = RootEntity.create().toRoot();
      
      const result = await MockGistRepository.create(config, {
        root,
        description: 'Test Bookmarks'
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gistId).toBeDefined();
        expect(result.data.gistId).toMatch(/^mock_gist_/);
        expect(result.data.etag).toBeDefined();
        expect(result.data.etag).toMatch(/^"/);
      }
    });
    
    it('should bind to existing gist', async () => {
      // First create a gist
      const createResult = await MockGistRepository.create(config, {
        root: RootEntity.create().toRoot()
      });
      
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const gistId = createResult.data.gistId;
      
      // Now bind to it
      const bindResult = await MockGistRepository.create(config, {
        gistId
      });
      
      expect(bindResult.success).toBe(true);
      if (bindResult.success) {
        expect(bindResult.data.gistId).toBe(gistId);
        expect(bindResult.data.etag).toBe(createResult.data.etag);
      }
    });
    
    it('should fail to bind to non-existent gist', async () => {
      const result = await MockGistRepository.create(config, {
        gistId: 'non-existent'
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });
  });
  
  describe('exists', () => {
    it('should return true for existing gist', async () => {
      const createResult = await MockGistRepository.create(config, {});
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const existsResult = await MockGistRepository.exists(config, createResult.data.gistId);
      expect(existsResult.success).toBe(true);
      if (existsResult.success) {
        expect(existsResult.data).toBe(true);
      }
    });
    
    it('should return false for non-existent gist', async () => {
      const result = await MockGistRepository.exists(config, 'non-existent');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
    
    it('should handle empty gist id', async () => {
      const result = await MockGistRepository.exists(config, '');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });
  
  describe('findByFilename', () => {
    it('should find gist by filename', async () => {
      const createResult = await MockGistRepository.create(config, {});
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const findResult = await MockGistRepository.findByFilename(config, 'bookmarks.md');
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toBe(createResult.data.gistId);
      }
    });
    
    it('should return null for non-existent filename', async () => {
      const result = await MockGistRepository.findByFilename(config, 'other.md');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(null);
      }
    });
    
    it('should handle empty filename', async () => {
      const result = await MockGistRepository.findByFilename(config, '');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(null);
      }
    });
  });
  
  describe('instance methods', () => {
    let repository: GistRepository;
    let initialRoot: Root;
    
    beforeEach(async () => {
      initialRoot = RootEntity.create()
        .addCategory('Test Category')
        .toRoot();
      
      const result = await MockGistRepository.create(config, {
        root: initialRoot
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        repository = result.data;
      }
    });
    
    describe('read', () => {
      it('should read the current root', async () => {
        const result = await repository.read();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.version).toBe(1);
          expect(result.data.categories).toHaveLength(1);
          expect(result.data.categories[0].name).toBe('Test Category');
        }
      });
    });
    
    describe('update', () => {
      it('should update with new root', async () => {
        const newRoot = RootEntity.fromRoot(initialRoot)
          .addCategory('Another Category')
          .toRoot();
        
        const result = await repository.update(newRoot);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(newRoot);
        }
        
        // Verify the update persisted
        const readResult = await repository.read();
        expect(readResult.success).toBe(true);
        if (readResult.success) {
          expect(readResult.data.categories).toHaveLength(2);
        }
      });
      
      it('should update etag after successful update', async () => {
        const oldEtag = repository.etag;
        
        const newRoot = RootEntity.fromRoot(initialRoot)
          .addCategory('Another Category')
          .toRoot();
        
        await repository.update(newRoot);
        
        expect(repository.etag).not.toBe(oldEtag);
      });
      
      it('should simulate commit hash verification', async () => {
        // Normal update should succeed
        const result = await repository.update(initialRoot);
        expect(result.success).toBe(true);
      });
    });
    
    describe('hasRemoteChanges', () => {
      it('should return false when no updates', async () => {
        const result = await repository.hasRemoteChanges();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(false);
        }
      });
      
      it('should return true after concurrent modification', async () => {
        // Simulate concurrent modification
        MockGistRepository.simulateConcurrentModification(repository.gistId);
        
        const result = await repository.hasRemoteChanges();
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(true);
        }
      });
    });
  });
  
  describe('concurrent modification simulation', () => {
    it('should detect concurrent modifications', async () => {
      const createResult = await MockGistRepository.create(config, {});
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const repo1 = createResult.data;
      const repo2Result = await MockGistRepository.create(config, {
        gistId: repo1.gistId
      });
      expect(repo2Result.success).toBe(true);
      if (!repo2Result.success) return;
      
      const repo2 = repo2Result.data;
      
      // Update from repo1
      await repo1.update(RootEntity.create().addCategory('Cat1').toRoot());
      
      // repo2 should detect the update
      const hasRemoteChanges = await repo2.hasRemoteChanges();
      expect(hasRemoteChanges.success).toBe(true);
      if (hasRemoteChanges.success) {
        expect(hasRemoteChanges.data).toBe(true);
      }
    });
  });
});