import { describe, it, expect, beforeEach } from 'vitest';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { RootEntity } from '../../src/lib/entities/root-entity.js';
import type { GistRepositoryConfig } from '../../src/lib/repositories/gist-repository.js';

describe('GistRepository Integration', () => {
  const mockConfig: GistRepositoryConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(() => {
    // Clear all mock data before each test
    MockGistRepository.clearAll();
  });
  
  describe('Full workflow', () => {
    it('should create, read, update, and check for updates', async () => {
      // Step 1: Create a new repository with initial data
      const initialRoot = RootEntity.create()
        .addCategory('Work')
        .addCategory('Personal')
        .toRoot();
      
      const createResult = await MockGistRepository.create(mockConfig, {
        root: initialRoot,
        description: 'My Bookmarks',
        isPublic: false
      });
      
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const repository = createResult.data;
      
      // Step 2: Read the data back
      const readResult = await repository.read();
      expect(readResult.success).toBe(true);
      if (!readResult.success) return;
      
      // Check the core structure, ignoring metadata
      expect(readResult.data.version).toBe(initialRoot.version);
      expect(readResult.data.categories).toHaveLength(initialRoot.categories.length);
      expect(readResult.data.categories.map(c => c.name)).toEqual(
        initialRoot.categories.map(c => c.name)
      );
      
      // Step 3: Check if updated (should be false)
      const hasRemoteChangesResult1 = await repository.hasRemoteChanges();
      expect(hasRemoteChangesResult1.success).toBe(true);
      if (!hasRemoteChangesResult1.success) return;
      expect(hasRemoteChangesResult1.data).toBe(false);
      
      // Step 4: Update the data
      const updatedRoot = RootEntity.fromRoot(readResult.data)
        .addCategory('Study')
        .renameCategory('Personal', 'Private')
        .toRoot();
      
      const updateResult = await repository.update(updatedRoot, 'Added Study category');
      expect(updateResult.success).toBe(true);
      if (!updateResult.success) return;
      
      // Step 5: Read updated data
      const readResult2 = await repository.read();
      expect(readResult2.success).toBe(true);
      if (!readResult2.success) return;
      
      expect(readResult2.data.categories).toHaveLength(3);
      expect(readResult2.data.categories.map(c => c.name)).toEqual(['Work', 'Private', 'Study']);
      
      // Step 6: Simulate concurrent modification
      MockGistRepository.simulateConcurrentModification(repository.gistId);
      
      // Step 7: Check if updated (should be true)
      const hasRemoteChangesResult2 = await repository.hasRemoteChanges();
      expect(hasRemoteChangesResult2.success).toBe(true);
      if (!hasRemoteChangesResult2.success) return;
      expect(hasRemoteChangesResult2.data).toBe(true);
    });
    
    it('should find existing repository by filename', async () => {
      // Create a repository
      const createResult = await MockGistRepository.create(mockConfig, {
        description: 'Test Bookmarks'
      });
      
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const gistId = createResult.data.gistId;
      
      // Find by filename
      const findResult = await MockGistRepository.findByFilename(mockConfig, 'bookmarks.md');
      expect(findResult.success).toBe(true);
      if (!findResult.success) return;
      
      expect(findResult.data).toBe(gistId);
      
      // Check if exists
      const existsResult = await MockGistRepository.exists(mockConfig, gistId);
      expect(existsResult.success).toBe(true);
      if (!existsResult.success) return;
      expect(existsResult.data).toBe(true);
      
      // Bind to existing repository
      const bindResult = await MockGistRepository.create(mockConfig, { gistId });
      expect(bindResult.success).toBe(true);
      if (!bindResult.success) return;
      
      expect(bindResult.data.gistId).toBe(gistId);
    });
    
    it('should handle concurrent modifications correctly', async () => {
      // Create repository
      const createResult = await MockGistRepository.create(mockConfig, {});
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      const repo1 = createResult.data;
      
      // Create another instance bound to same gist
      const bindResult = await MockGistRepository.create(mockConfig, {
        gistId: repo1.gistId
      });
      expect(bindResult.success).toBe(true);
      if (!bindResult.success) return;
      
      const repo2 = bindResult.data;
      
      // Both read the same initial state
      const read1 = await repo1.read();
      const read2 = await repo2.read();
      
      expect(read1.success).toBe(true);
      expect(read2.success).toBe(true);
      if (!read1.success || !read2.success) return;
      
      // Check initial state - may have default category from empty markdown
      const initialCategories = read1.data.categories.length;
      
      // Repo1 updates
      const updated1 = RootEntity.fromRoot(read1.data)
        .addCategory('Category 1')
        .toRoot();
      
      const update1 = await repo1.update(updated1);
      expect(update1.success).toBe(true);
      
      // Repo2 should detect the update
      const hasRemoteChanges = await repo2.hasRemoteChanges();
      expect(hasRemoteChanges.success).toBe(true);
      if (!hasRemoteChanges.success) return;
      expect(hasRemoteChanges.data).toBe(true);
      
      // Repo2 reads the updated data
      const read2Updated = await repo2.read();
      expect(read2Updated.success).toBe(true);
      if (!read2Updated.success) return;
      
      // Should have one more category than initial
      expect(read2Updated.data.categories).toHaveLength(initialCategories + 1);
      // Find the newly added category
      const newCategory = read2Updated.data.categories.find(c => c.name === 'Category 1');
      expect(newCategory).toBeDefined();
    });
  });
  
  describe('Error handling', () => {
    it('should handle non-existent gist', async () => {
      const result = await MockGistRepository.create(mockConfig, {
        gistId: 'non-existent'
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });
    
    it('should handle empty filename search', async () => {
      const result = await MockGistRepository.findByFilename(mockConfig, '');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
    
    it('should handle empty gistId check', async () => {
      const result = await MockGistRepository.exists(mockConfig, '');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });
});