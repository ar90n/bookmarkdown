import { describe, it, expect, beforeEach } from 'vitest';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import type { GistRepository, GistCreateParams } from '../../src/lib/repositories/gist-repository.js';

describe('MockGistRepository', () => {
  let repository: GistRepository;
  
  beforeEach(() => {
    repository = new MockGistRepository();
  });
  
  describe('create', () => {
    it('should create a new gist and return id with etag', async () => {
      const params: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'test.md',
        isPublic: false
      };
      
      const result = await repository.create(params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeDefined();
        expect(result.data.id).toMatch(/^[a-f0-9]+$/);
        expect(result.data.etag).toBeDefined();
        expect(result.data.etag).toMatch(/^"[a-f0-9]+"$/);
      }
    });
    
    it('should store the created gist internally', async () => {
      const params: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(params);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        // Verify the gist can be read
        const readResult = await repository.read(createResult.data.id);
        expect(readResult.success).toBe(true);
        
        if (readResult.success) {
          expect(readResult.data.id).toBe(createResult.data.id);
          expect(readResult.data.content).toBe(params.content);
          expect(readResult.data.etag).toBe(createResult.data.etag);
        }
      }
    });
    
    it('should generate unique ids for different gists', async () => {
      const params1: GistCreateParams = {
        description: 'Gist 1',
        content: 'Content 1',
        filename: 'test1.md'
      };
      
      const params2: GistCreateParams = {
        description: 'Gist 2',
        content: 'Content 2',
        filename: 'test2.md'
      };
      
      const result1 = await repository.create(params1);
      const result2 = await repository.create(params2);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      if (result1.success && result2.success) {
        expect(result1.data.id).not.toBe(result2.data.id);
      }
    });
  });
});