import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';
import { GistSyncShell } from '../../src/lib/shell/gist-sync';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository';
import { RootEntity } from '../../src/lib/entities/root-entity';

describe('BookmarkService', () => {
  let service: ReturnType<typeof createBookmarkService>;
  let syncShell: GistSyncShell;

  beforeEach(async () => {
    MockGistRepository.clearAll();
    
    syncShell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await syncShell.initialize();
    service = createBookmarkService(syncShell);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Operations', () => {

    describe('Category operations', () => {
    it('should add a category', () => {
      const result = service.addCategory('Development');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const root = result.data;
        expect(root.categories).toHaveLength(1);
        expect(root.categories[0].name).toBe('Development');
      }
    });

    it('should fail on duplicate category', () => {
      service.addCategory('Development');
      const result = service.addCategory('Development');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('already exists');
      }
    });

    it('should remove a category', () => {
      service.addCategory('Development');
      const result = service.removeCategory('Development');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.categories).toHaveLength(0);
      }
    });
  });

    describe('Bundle operations', () => {
    beforeEach(() => {
      service.addCategory('Development');
    });

    it('should add a bundle', () => {
      const result = service.addBundle('Development', 'Frontend');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const category = result.data.categories[0];
        expect(category.bundles).toHaveLength(1);
        expect(category.bundles[0].name).toBe('Frontend');
      }
    });

    it('should fail on non-existent category', () => {
      const result = service.addBundle('NonExistent', 'Frontend');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });
  });

    describe('Bookmark operations', () => {
    beforeEach(() => {
      service.addCategory('Development');
      service.addBundle('Development', 'Frontend');
    });

    it('should add a bookmark', () => {
      const result = service.addBookmark('Development', 'Frontend', {
        title: 'React Docs',
        url: 'https://react.dev'
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const bundle = result.data.categories[0].bundles[0];
        expect(bundle.bookmarks).toHaveLength(1);
        expect(bundle.bookmarks[0].title).toBe('React Docs');
      }
    });

    it('should add multiple bookmarks', () => {
      const result = service.addBookmarksBatch('Development', 'Frontend', [
        { title: 'React', url: 'https://react.dev' },
        { title: 'Vue', url: 'https://vuejs.org' }
      ]);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const bundle = result.data.categories[0].bundles[0];
        expect(bundle.bookmarks).toHaveLength(2);
      }
    });
  });

    describe('Search and stats', () => {
    beforeEach(() => {
      service.addCategory('Development');
      service.addBundle('Development', 'Frontend');
      service.addBookmark('Development', 'Frontend', {
        title: 'React Documentation',
        url: 'https://react.dev',
        tags: ['react', 'docs']
      });
    });

    it('should search bookmarks', () => {
      const results = service.searchBookmarks({ query: 'react' });
      
      expect(results).toHaveLength(1);
      expect(results[0].bookmark.title).toBe('React Documentation');
    });

    it('should get stats', () => {
      const stats = service.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.categoriesCount).toBe(1);
      expect(stats.bundlesCount).toBe(1);
      expect(stats.bookmarksCount).toBe(1);
    });
  });

  }); // End of Basic Operations

  describe('Dirty Tracking', () => {
    it('should have isDirty method', () => {
      expect(typeof service.isDirty).toBe('function');
    });
    
    it('should start with isDirty false', () => {
      expect(service.isDirty()).toBe(false);
    });
    
    it('should set isDirty to true when adding category', () => {
      service.addCategory('Test Category');
      expect(service.isDirty()).toBe(true);
    });
    
    it('should set isDirty to true when removing category', async () => {
      service.addCategory('Test Category');
      await service.saveToRemote(); // Reset dirty flag
      
      service.removeCategory('Test Category');
      expect(service.isDirty()).toBe(true);
    });
    
    it('should set isDirty to true when renaming category', async () => {
      service.addCategory('Old Name');
      await service.saveToRemote(); // Reset dirty flag
      
      service.renameCategory('Old Name', 'New Name');
      expect(service.isDirty()).toBe(true);
    });
    
    it('should set isDirty to true when adding bundle', async () => {
      service.addCategory('Category');
      await service.saveToRemote(); // Reset dirty flag
      
      service.addBundle('Category', 'Bundle');
      expect(service.isDirty()).toBe(true);
    });
    
    it('should set isDirty to true when adding bookmark', async () => {
      service.addCategory('Category');
      service.addBundle('Category', 'Bundle');
      await service.saveToRemote(); // Reset dirty flag
      
      service.addBookmark('Category', 'Bundle', {
        title: 'Test',
        url: 'https://example.com'
      });
      expect(service.isDirty()).toBe(true);
    });
    
    it('should reset isDirty to false after successful save', async () => {
      service.addCategory('Test Category');
      expect(service.isDirty()).toBe(true);
      
      await service.saveToRemote();
      expect(service.isDirty()).toBe(false);
    });
    
    it('should reset isDirty to false after successful load', async () => {
      service.addCategory('Test Category');
      expect(service.isDirty()).toBe(true);
      
      await service.loadFromRemote();
      expect(service.isDirty()).toBe(false);
    });
    
    it('should not set isDirty on failed operations', () => {
      // Try to remove non-existent category
      const result = service.removeCategory('NonExistent');
      expect(result.success).toBe(false);
      expect(service.isDirty()).toBe(false);
    });
    
    it('should track isDirty across multiple operations', async () => {
      // Multiple operations
      service.addCategory('Cat1');
      service.addCategory('Cat2');
      service.addBundle('Cat1', 'Bundle1');
      
      expect(service.isDirty()).toBe(true);
      
      // Save resets
      await service.saveToRemote();
      expect(service.isDirty()).toBe(false);
      
      // More operations
      service.removeBundle('Cat1', 'Bundle1');
      expect(service.isDirty()).toBe(true);
    });
  });

  describe('Remote Changes', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      vi.useRealTimers();
    });
    
    it('should accept onRemoteChangeDetected callback', async () => {
      const onRemoteChangeDetected = vi.fn();
      
      const syncShellWithCallback = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true,
        onRemoteChangeDetected
      });
      
      await syncShellWithCallback.initialize();
      
      const serviceWithCallback = createBookmarkService(syncShellWithCallback, {
        onRemoteChangeDetected
      });
      
      expect(serviceWithCallback).toBeDefined();
      expect((serviceWithCallback as any).onRemoteChangeDetected).toBe(onRemoteChangeDetected);
    });
    
    it('should trigger callback when remote changes detected', async () => {
      const onRemoteChangeDetected = vi.fn();
      
      // Create first service with callback
      const syncShell1 = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true,
        onRemoteChangeDetected
      });
      
      await syncShell1.initialize();
      
      const service1 = createBookmarkService(syncShell1, {
        onRemoteChangeDetected
      });
      
      // Create second service to make changes
      const syncShell2 = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true
      });
      
      await syncShell2.initialize();
      const service2 = createBookmarkService(syncShell2);
      
      // Make a change from service2
      service2.addCategory('New Category');
      await service2.saveToRemote();
      
      // Fast forward time to trigger detection
      await vi.advanceTimersByTimeAsync(10000);
      
      // Callback should have been triggered
      expect(onRemoteChangeDetected).toHaveBeenCalledTimes(1);
    });
    
    it('should work without callback', async () => {
      const syncShellNoCallback = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true
      });
      
      await syncShellNoCallback.initialize();
      
      // Should not throw when creating service without callback
      const serviceNoCallback = createBookmarkService(syncShellNoCallback);
      expect(serviceNoCallback).toBeDefined();
    });
    
    describe('Auto-load with conflict detection', () => {
      it('should auto-load when remote changes detected and no local changes', async () => {
        // Create service with auto-load callback
        const loadFromRemoteSpy = vi.fn();
        
        const syncShellAutoLoad = new GistSyncShell({
          repositoryConfig: {
            accessToken: 'test-token',
            filename: 'bookmarks.md'
          },
          useMock: true,
          onRemoteChangeDetected: async () => {
            // Auto-load logic
            if (!serviceAutoLoad.isDirty()) {
              await loadFromRemoteSpy();
            }
          }
        });
        
        await syncShellAutoLoad.initialize();
        const serviceAutoLoad = createBookmarkService(syncShellAutoLoad);
        
        // Wrap loadFromRemote to track calls
        const originalLoad = serviceAutoLoad.loadFromRemote;
        serviceAutoLoad.loadFromRemote = async () => {
          loadFromRemoteSpy();
          return originalLoad();
        };
        
        // Create another service to make changes
        const syncShell2 = new GistSyncShell({
          repositoryConfig: {
            accessToken: 'test-token',
            filename: 'bookmarks.md'
          },
          useMock: true
        });
        
        await syncShell2.initialize();
        const service2 = createBookmarkService(syncShell2);
        
        // Make a change from service2
        service2.addCategory('Remote Category');
        await service2.saveToRemote();
        
        // Fast forward time to trigger detection
        await vi.advanceTimersByTimeAsync(10000);
        
        // Should have triggered auto-load
        expect(loadFromRemoteSpy).toHaveBeenCalledTimes(1);
      });
      
      it('should call conflict handler when remote changes detected with local changes', async () => {
        const conflictHandler = vi.fn();
        
        const syncShellConflict = new GistSyncShell({
          repositoryConfig: {
            accessToken: 'test-token',
            filename: 'bookmarks.md'
          },
          useMock: true,
          onRemoteChangeDetected: async () => {
            // Check for conflicts
            if ((serviceConflict as any).isDirty()) {
              conflictHandler({
                onLoadRemote: async () => {
                  await serviceConflict.loadFromRemote();
                },
                onSaveLocal: async () => {
                  await serviceConflict.saveToRemote();
                }
              });
            }
          }
        });
        
        await syncShellConflict.initialize();
        const serviceConflict = createBookmarkService(syncShellConflict);
        
        // Make local changes
        serviceConflict.addCategory('Local Category');
        expect(serviceConflict.isDirty()).toBe(true);
        
        // Create another service to make remote changes
        const syncShell2 = new GistSyncShell({
          repositoryConfig: {
            accessToken: 'test-token', 
            filename: 'bookmarks.md'
          },
          useMock: true
        });
        
        await syncShell2.initialize();
        const service2 = createBookmarkService(syncShell2);
        
        // Make a change from service2
        service2.addCategory('Remote Category');
        await service2.saveToRemote();
        
        // Fast forward time to trigger detection
        await vi.advanceTimersByTimeAsync(10000);
        
        // Should have called conflict handler
        expect(conflictHandler).toHaveBeenCalledTimes(1);
        expect(conflictHandler).toHaveBeenCalledWith({
          onLoadRemote: expect.any(Function),
          onSaveLocal: expect.any(Function)
        });
      });
      
      it('should not auto-load when service is not dirty but loading is disabled', async () => {
        const loadFromRemoteSpy = vi.fn();
        
        const syncShellNoAutoLoad = new GistSyncShell({
          repositoryConfig: {
            accessToken: 'test-token',
            filename: 'bookmarks.md'
          },
          useMock: true,
          onRemoteChangeDetected: async () => {
            // Do nothing - auto-load disabled
          }
        });
        
        await syncShellNoAutoLoad.initialize();
        const serviceNoAutoLoad = createBookmarkService(syncShellNoAutoLoad);
        
        // Wrap loadFromRemote to track calls
        const originalLoad = serviceNoAutoLoad.loadFromRemote;
        serviceNoAutoLoad.loadFromRemote = async () => {
          loadFromRemoteSpy();
          return originalLoad();
        };
        
        // Create another service to make changes
        const syncShell2 = new GistSyncShell({
          repositoryConfig: {
            accessToken: 'test-token',
            filename: 'bookmarks.md'
          },
          useMock: true
        });
        
        await syncShell2.initialize();
        const service2 = createBookmarkService(syncShell2);
        
        // Make a change from service2
        service2.addCategory('Remote Category');
        await service2.saveToRemote();
        
        // Fast forward time to trigger detection
        await vi.advanceTimersByTimeAsync(10000);
        
        // Should NOT have triggered auto-load
        expect(loadFromRemoteSpy).not.toHaveBeenCalled();
      });
    });
  });
});