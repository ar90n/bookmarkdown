import { describe, it, expect, beforeEach } from 'vitest';
import { createBookmarkServiceV2 } from '../../src/lib/adapters/bookmark-service-v2.js';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import type { Root } from '../../src/lib/types/index.js';

describe('BookmarkServiceV2', () => {
  let service: ReturnType<typeof createBookmarkServiceV2>;
  let repository: MockGistRepository;
  let syncShell: GistSyncShell;
  
  beforeEach(() => {
    repository = new MockGistRepository();
    syncShell = new GistSyncShell({ repository });
    service = createBookmarkServiceV2(syncShell);
  });
  
  describe('Local operations', () => {
    describe('Category operations', () => {
      it('should add a category', () => {
        const result = service.addCategory('Development');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories).toHaveLength(1);
          expect(result.data.categories[0].name).toBe('Development');
        }
      });
      
      it('should not add duplicate category', () => {
        service.addCategory('Development');
        const result = service.addCategory('Development');
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('already exists');
        }
      });
      
      it('should trim category names', () => {
        const result = service.addCategory('  Development  ');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].name).toBe('Development');
        }
      });
      
      it('should remove a category', () => {
        service.addCategory('Development');
        const result = service.removeCategory('Development');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories).toHaveLength(0);
        }
      });
      
      it('should rename a category', () => {
        service.addCategory('Dev');
        const result = service.renameCategory('Dev', 'Development');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].name).toBe('Development');
        }
      });
    });
    
    describe('Bundle operations', () => {
      beforeEach(() => {
        service.addCategory('Development');
      });
      
      it('should add a bundle to category', () => {
        const result = service.addBundle('Development', 'TypeScript');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].bundles).toHaveLength(1);
          expect(result.data.categories[0].bundles[0].name).toBe('TypeScript');
        }
      });
      
      it('should not add bundle to non-existent category', () => {
        const result = service.addBundle('NonExistent', 'TypeScript');
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('not found');
        }
      });
      
      it('should remove a bundle', () => {
        service.addBundle('Development', 'TypeScript');
        const result = service.removeBundle('Development', 'TypeScript');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].bundles).toHaveLength(0);
        }
      });
      
      it('should rename a bundle', () => {
        service.addBundle('Development', 'TS');
        const result = service.renameBundle('Development', 'TS', 'TypeScript');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].bundles[0].name).toBe('TypeScript');
        }
      });
    });
    
    describe('Bookmark operations', () => {
      beforeEach(() => {
        service.addCategory('Development');
        service.addBundle('Development', 'TypeScript');
      });
      
      it('should add a bookmark', () => {
        const result = service.addBookmark('Development', 'TypeScript', {
          title: 'TypeScript Docs',
          url: 'https://www.typescriptlang.org/',
          tags: ['docs', 'typescript']
        });
        
        expect(result.success).toBe(true);
        if (result.success) {
          const bookmark = result.data.categories[0].bundles[0].bookmarks[0];
          expect(bookmark.title).toBe('TypeScript Docs');
          expect(bookmark.url).toBe('https://www.typescriptlang.org/');
          expect(bookmark.tags).toEqual(['docs', 'typescript']);
        }
      });
      
      it('should add multiple bookmarks in batch', () => {
        const bookmarks = [
          { title: 'TypeScript Docs', url: 'https://www.typescriptlang.org/' },
          { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/' }
        ];
        
        const result = service.addBookmarksBatch('Development', 'TypeScript', bookmarks);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].bundles[0].bookmarks).toHaveLength(2);
        }
      });
      
      it('should update a bookmark', () => {
        const addResult = service.addBookmark('Development', 'TypeScript', {
          title: 'Old Title',
          url: 'https://example.com/'
        });
        
        expect(addResult.success).toBe(true);
        if (!addResult.success) return;
        
        const bookmarkId = addResult.data.categories[0].bundles[0].bookmarks[0].id;
        
        const updateResult = service.updateBookmark('Development', 'TypeScript', bookmarkId, {
          title: 'New Title',
          tags: ['updated']
        });
        
        expect(updateResult.success).toBe(true);
        if (updateResult.success) {
          const bookmark = updateResult.data.categories[0].bundles[0].bookmarks[0];
          expect(bookmark.title).toBe('New Title');
          expect(bookmark.tags).toEqual(['updated']);
        }
      });
      
      it('should remove a bookmark', () => {
        const addResult = service.addBookmark('Development', 'TypeScript', {
          title: 'TypeScript Docs',
          url: 'https://www.typescriptlang.org/'
        });
        
        expect(addResult.success).toBe(true);
        if (!addResult.success) return;
        
        const bookmarkId = addResult.data.categories[0].bundles[0].bookmarks[0].id;
        
        const removeResult = service.removeBookmark('Development', 'TypeScript', bookmarkId);
        
        expect(removeResult.success).toBe(true);
        if (removeResult.success) {
          expect(removeResult.data.categories[0].bundles[0].bookmarks).toHaveLength(0);
        }
      });
    });
    
    describe('Query operations', () => {
      beforeEach(() => {
        service.addCategory('Development');
        service.addBundle('Development', 'TypeScript');
        service.addBookmark('Development', 'TypeScript', {
          title: 'TypeScript Docs',
          url: 'https://www.typescriptlang.org/',
          tags: ['docs', 'typescript']
        });
        
        service.addCategory('Resources');
        service.addBundle('Resources', 'Learning');
        service.addBookmark('Resources', 'Learning', {
          title: 'MDN Web Docs',
          url: 'https://developer.mozilla.org/',
          tags: ['docs', 'web']
        });
      });
      
      it('should search bookmarks by query', () => {
        const results = service.searchBookmarks({ searchTerm: 'typescript' });
        
        expect(results).toHaveLength(1);
        expect(results[0].bookmark.title).toBe('TypeScript Docs');
      });
      
      it('should search bookmarks by tag', () => {
        const results = service.searchBookmarks({ tags: ['docs'] });
        
        expect(results).toHaveLength(2);
      });
      
      it('should get stats', () => {
        const stats = service.getStats();
        
        expect(stats.categoriesCount).toBe(2);
        expect(stats.bundlesCount).toBe(2);
        expect(stats.bookmarksCount).toBe(2);
        expect(stats.tagsCount).toBe(3); // docs, typescript, web
      });
    });
    
    describe('Move operations', () => {
      beforeEach(() => {
        service.addCategory('Development');
        service.addBundle('Development', 'TypeScript');
        service.addBookmark('Development', 'TypeScript', {
          title: 'TypeScript Docs',
          url: 'https://www.typescriptlang.org/'
        });
        
        service.addCategory('Resources');
        service.addBundle('Resources', 'Documentation');
      });
      
      it('should move bookmark to another bundle', () => {
        const root = service.getRoot();
        const bookmarkId = root.categories[0].bundles[0].bookmarks[0].id;
        
        const result = service.moveBookmark(
          'Development', 'TypeScript',
          'Resources', 'Documentation',
          bookmarkId
        );
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].bundles[0].bookmarks).toHaveLength(0);
          expect(result.data.categories[1].bundles[0].bookmarks).toHaveLength(1);
        }
      });
      
      it('should move bundle to another category', () => {
        const result = service.moveBundle('Development', 'Resources', 'TypeScript');
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.categories[0].bundles).toHaveLength(0);
          expect(result.data.categories[1].bundles).toHaveLength(2);
          expect(result.data.categories[1].bundles[1].name).toBe('TypeScript');
        }
      });
    });
  });
  
  describe('Remote sync operations', () => {
    it('should load from remote', async () => {
      // First save some data
      service.addCategory('Development');
      await service.saveToRemote('Initial save');
      
      // Create a new service instance
      const newService = createBookmarkServiceV2(syncShell);
      
      // Load from remote
      const result = await newService.loadFromRemote();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toHaveLength(1);
        expect(result.data.categories[0].name).toBe('Development');
      }
    });
    
    it('should save to remote', async () => {
      service.addCategory('Development');
      
      const result = await service.saveToRemote('Test save');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gistId).toBeDefined();
        expect(result.data.etag).toBeDefined();
      }
    });
    
    it('should detect remote changes', async () => {
      // Save initial state
      service.addCategory('Development');
      await service.saveToRemote();
      
      // Simulate external change
      const gistInfo = service.getGistInfo();
      await repository.update({
        gistId: gistInfo.gistId!,
        content: '# External Change',
        etag: gistInfo.etag!
      });
      
      // Check for changes
      const hasChanges = await service.hasRemoteChanges();
      
      expect(hasChanges.success).toBe(true);
      if (hasChanges.success) {
        expect(hasChanges.data).toBe(true);
      }
    });
    
    it('should force reload from remote', async () => {
      // Save initial state
      service.addCategory('Development');
      await service.saveToRemote();
      
      // Make local changes
      service.addCategory('Local Change');
      
      // Force reload should discard local changes
      const result = await service.forceReload();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toHaveLength(1);
        expect(result.data.categories[0].name).toBe('Development');
      }
    });
    
    it('should handle sync not configured', async () => {
      const serviceWithoutSync = createBookmarkServiceV2();
      
      const loadResult = await serviceWithoutSync.loadFromRemote();
      expect(loadResult.success).toBe(false);
      if (!loadResult.success) {
        expect(loadResult.error.message).toContain('Sync not configured');
      }
      
      const saveResult = await serviceWithoutSync.saveToRemote();
      expect(saveResult.success).toBe(false);
      
      const hasChanges = await serviceWithoutSync.hasRemoteChanges();
      expect(hasChanges.success).toBe(true);
      if (hasChanges.success) {
        expect(hasChanges.data).toBe(false);
      }
    });
  });
});