import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import type { Root } from '../../src/lib/types/index.js';

describe('GistSyncShell', () => {
  let repository: MockGistRepository;
  let syncShell: GistSyncShell;
  
  const createTestRoot = (): Root => ({
    version: 1,
    categories: [
      {
        name: 'Test Category',
        bundles: [
          {
            name: 'Test Bundle',
            bookmarks: [
              {
                id: 'test-id',
                title: 'Test Bookmark',
                url: 'https://example.com'
              }
            ]
          }
        ]
      }
    ]
  });
  
  beforeEach(() => {
    repository = new MockGistRepository();
    syncShell = new GistSyncShell({ repository });
  });
  
  describe('load', () => {
    it('should load existing gist by ID', async () => {
      // First create a gist
      const createResult = await repository.create({
        description: 'Test Gist',
        content: '# Test Category\n\n## Test Bundle\n\n- [Test Bookmark](https://example.com)',
        filename: 'bookmarks.md'
      });
      
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      
      // Load it
      const loadResult = await syncShell.load(createResult.data.id);
      
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.categories).toHaveLength(1);
        expect(loadResult.data.categories[0].name).toBe('Test Category');
      }
    });
    
    it('should find gist by filename when no ID provided', async () => {
      // Create a gist
      await repository.create({
        description: 'Test Gist',
        content: '# Found Category',
        filename: 'bookmarks.md'
      });
      
      // Load without ID
      const loadResult = await syncShell.load();
      
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.categories).toHaveLength(1);
        expect(loadResult.data.categories[0].name).toBe('Found Category');
      }
    });
    
    it('should return error when no gist found', async () => {
      const loadResult = await syncShell.load();
      
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.message).toContain('No bookmarks gist found');
      }
    });
  });
  
  describe('save', () => {
    it('should create new gist when none exists', async () => {
      const root = createTestRoot();
      
      const saveResult = await syncShell.save(root, 'My Bookmarks');
      
      expect(saveResult.success).toBe(true);
      if (saveResult.success) {
        expect(saveResult.data.gistId).toBeDefined();
        expect(saveResult.data.etag).toBeDefined();
        expect(saveResult.data.root).toBe(root);
        
        // Verify gist was created
        const existsResult = await repository.exists(saveResult.data.gistId);
        expect(existsResult.success).toBe(true);
        if (existsResult.success) {
          expect(existsResult.data).toBe(true);
        }
      }
    });
    
    it('should update existing gist with etag', async () => {
      const root1 = createTestRoot();
      
      // First save
      const saveResult1 = await syncShell.save(root1);
      expect(saveResult1.success).toBe(true);
      if (!saveResult1.success) return;
      
      // Modify and save again
      const root2: Root = {
        ...root1,
        categories: [
          ...root1.categories,
          { name: 'New Category', bundles: [] }
        ]
      };
      
      const saveResult2 = await syncShell.save(root2);
      
      expect(saveResult2.success).toBe(true);
      if (saveResult2.success) {
        expect(saveResult2.data.gistId).toBe(saveResult1.data.gistId);
        expect(saveResult2.data.etag).not.toBe(saveResult1.data.etag);
      }
    });
    
    it('should handle etag mismatch', async () => {
      const root = createTestRoot();
      
      // First save
      const saveResult1 = await syncShell.save(root);
      expect(saveResult1.success).toBe(true);
      if (!saveResult1.success) return;
      
      // Simulate external update
      await repository.update({
        gistId: saveResult1.data.gistId,
        content: '# Modified externally',
        etag: saveResult1.data.etag
      });
      
      // Try to save again - should fail
      const saveResult2 = await syncShell.save(root);
      
      expect(saveResult2.success).toBe(false);
      if (!saveResult2.success) {
        expect(saveResult2.error.message).toContain('Remote has been modified');
      }
    });
  });
  
  describe('hasRemoteChanges', () => {
    it('should detect remote changes', async () => {
      const root = createTestRoot();
      
      // Save initial version
      const saveResult = await syncShell.save(root);
      expect(saveResult.success).toBe(true);
      if (!saveResult.success) return;
      
      // Check - should be no changes
      const hasChanges1 = await syncShell.hasRemoteChanges();
      expect(hasChanges1.success).toBe(true);
      if (hasChanges1.success) {
        expect(hasChanges1.data).toBe(false);
      }
      
      // Simulate external update
      await repository.update({
        gistId: saveResult.data.gistId,
        content: '# Modified externally',
        etag: saveResult.data.etag
      });
      
      // Check again - should detect changes
      const hasChanges2 = await syncShell.hasRemoteChanges();
      expect(hasChanges2.success).toBe(true);
      if (hasChanges2.success) {
        expect(hasChanges2.data).toBe(true);
      }
    });
  });
  
  describe('forceReload', () => {
    it('should reload and discard local state', async () => {
      const root = createTestRoot();
      
      // Save initial version
      const saveResult = await syncShell.save(root);
      expect(saveResult.success).toBe(true);
      if (!saveResult.success) return;
      
      // Simulate external update
      await repository.update({
        gistId: saveResult.data.gistId,
        content: '# External Category',
        etag: saveResult.data.etag
      });
      
      // Force reload
      const reloadResult = await syncShell.forceReload();
      
      expect(reloadResult.success).toBe(true);
      if (reloadResult.success) {
        expect(reloadResult.data.categories).toHaveLength(1);
        expect(reloadResult.data.categories[0].name).toBe('External Category');
      }
    });
  });
});