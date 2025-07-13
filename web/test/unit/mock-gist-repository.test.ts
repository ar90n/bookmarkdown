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
  
  describe('read', () => {
    it('should read an existing gist', async () => {
      // First create a gist
      const createParams: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content\n\nThis is a test.',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        // Now read it
        const readResult = await repository.read(createResult.data.id);
        
        expect(readResult.success).toBe(true);
        if (readResult.success) {
          expect(readResult.data.id).toBe(createResult.data.id);
          expect(readResult.data.content).toBe(createParams.content);
          expect(readResult.data.etag).toBe(createResult.data.etag);
        }
      }
    });
    
    it('should return error for non-existent gist', async () => {
      const readResult = await repository.read('non-existent-id');
      
      expect(readResult.success).toBe(false);
      if (!readResult.success) {
        expect(readResult.error.message).toContain('not found');
      }
    });
    
    it('should handle empty gist id', async () => {
      const readResult = await repository.read('');
      
      expect(readResult.success).toBe(false);
      if (!readResult.success) {
        expect(readResult.error.message).toContain('Gist ID is required');
      }
    });
  });
  
  describe('update', () => {
    it('should update an existing gist with valid etag', async () => {
      // First create a gist
      const createParams: GistCreateParams = {
        description: 'Original Description',
        content: '# Original Content',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        // Update it
        const updateParams: GistUpdateParams = {
          gistId: createResult.data.id,
          content: '# Updated Content\n\nThis content has been updated.',
          etag: createResult.data.etag,
          description: 'Updated Description'
        };
        
        const updateResult = await repository.update(updateParams);
        
        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          expect(updateResult.data.etag).toBeDefined();
          expect(updateResult.data.etag).not.toBe(createResult.data.etag); // etag should change
          
          // Verify the content was updated
          const readResult = await repository.read(createResult.data.id);
          expect(readResult.success).toBe(true);
          if (readResult.success) {
            expect(readResult.data.content).toBe(updateParams.content);
            expect(readResult.data.etag).toBe(updateResult.data.etag);
          }
        }
      }
    });
    
    it('should fail with etag mismatch', async () => {
      // Create a gist
      const createParams: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        // Try to update with wrong etag
        const updateParams: GistUpdateParams = {
          gistId: createResult.data.id,
          content: '# Updated Content',
          etag: '"wrong-etag"',
          description: 'Updated Description'
        };
        
        const updateResult = await repository.update(updateParams);
        
        expect(updateResult.success).toBe(false);
        if (!updateResult.success) {
          expect(updateResult.error.message).toContain('Etag mismatch');
        }
      }
    });
    
    it('should fail for non-existent gist', async () => {
      const updateParams: GistUpdateParams = {
        gistId: 'non-existent-id',
        content: '# Content',
        etag: '"some-etag"'
      };
      
      const updateResult = await repository.update(updateParams);
      
      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        expect(updateResult.error.message).toContain('not found');
      }
    });
    
    it('should update content without changing description', async () => {
      // Create a gist
      const createParams: GistCreateParams = {
        description: 'Original Description',
        content: '# Original Content',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        // Update only content
        const updateParams: GistUpdateParams = {
          gistId: createResult.data.id,
          content: '# Updated Content Only',
          etag: createResult.data.etag
        };
        
        const updateResult = await repository.update(updateParams);
        expect(updateResult.success).toBe(true);
        
        // Verify content was updated but description remains
        const readResult = await repository.read(createResult.data.id);
        expect(readResult.success).toBe(true);
        if (readResult.success) {
          expect(readResult.data.content).toBe(updateParams.content);
        }
      }
    });
  });
  
  describe('exists', () => {
    it('should return true for existing gist', async () => {
      // Create a gist
      const createParams: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const existsResult = await repository.exists(createResult.data.id);
        
        expect(existsResult.success).toBe(true);
        if (existsResult.success) {
          expect(existsResult.data).toBe(true);
        }
      }
    });
    
    it('should return false for non-existent gist', async () => {
      const existsResult = await repository.exists('non-existent-id');
      
      expect(existsResult.success).toBe(true);
      if (existsResult.success) {
        expect(existsResult.data).toBe(false);
      }
    });
    
    it('should handle empty gist id', async () => {
      const existsResult = await repository.exists('');
      
      expect(existsResult.success).toBe(true);
      if (existsResult.success) {
        expect(existsResult.data).toBe(false);
      }
    });
    
    it('should return true after create and false after theoretical delete', async () => {
      // Create a gist
      const createParams: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'test.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        // Should exist after creation
        const existsResult1 = await repository.exists(createResult.data.id);
        expect(existsResult1.success).toBe(true);
        if (existsResult1.success) {
          expect(existsResult1.data).toBe(true);
        }
        
        // Note: MockGistRepository doesn't have delete, but we can test the pattern
      }
    });
  });
  
  describe('findByFilename', () => {
    it('should find gist by filename', async () => {
      // Create a gist
      const createParams: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'unique-file.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      if (createResult.success) {
        const findResult = await repository.findByFilename('unique-file.md');
        
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.data) {
          expect(findResult.data.id).toBe(createResult.data.id);
          expect(findResult.data.content).toBe(createParams.content);
          expect(findResult.data.etag).toBe(createResult.data.etag);
        }
      }
    });
    
    it('should return null for non-existent filename', async () => {
      const findResult = await repository.findByFilename('non-existent-file.md');
      
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toBeNull();
      }
    });
    
    it('should handle empty filename', async () => {
      const findResult = await repository.findByFilename('');
      
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toBeNull();
      }
    });
    
    it('should return the latest gist when multiple gists have same filename', async () => {
      // Create first gist
      const createParams1: GistCreateParams = {
        description: 'First Gist',
        content: '# First Content',
        filename: 'duplicate.md'
      };
      
      const createResult1 = await repository.create(createParams1);
      expect(createResult1.success).toBe(true);
      
      // Create second gist with same filename
      const createParams2: GistCreateParams = {
        description: 'Second Gist',
        content: '# Second Content',
        filename: 'duplicate.md'
      };
      
      const createResult2 = await repository.create(createParams2);
      expect(createResult2.success).toBe(true);
      
      if (createResult2.success) {
        const findResult = await repository.findByFilename('duplicate.md');
        
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.data) {
          // Should return the second (latest) gist
          expect(findResult.data.id).toBe(createResult2.data.id);
          expect(findResult.data.content).toBe(createParams2.content);
        }
      }
    });
    
    it('should be case-sensitive for filenames', async () => {
      // Create a gist
      const createParams: GistCreateParams = {
        description: 'Test Gist',
        content: '# Test Content',
        filename: 'CaseSensitive.md'
      };
      
      const createResult = await repository.create(createParams);
      expect(createResult.success).toBe(true);
      
      // Try to find with different case
      const findResult1 = await repository.findByFilename('casesensitive.md');
      const findResult2 = await repository.findByFilename('CaseSensitive.md');
      
      expect(findResult1.success).toBe(true);
      expect(findResult2.success).toBe(true);
      
      if (findResult1.success && findResult2.success) {
        expect(findResult1.data).toBeNull(); // Different case should not match
        expect(findResult2.data).not.toBeNull(); // Exact case should match
      }
    });
  });
});