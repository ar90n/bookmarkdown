import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { RootEntity } from '../../src/lib/entities/root-entity.js';

describe('BookmarkService - Remote Change Detection', () => {
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should accept onRemoteChangeDetected callback', async () => {
    const onRemoteChangeDetected = vi.fn();
    
    const syncShell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected
    });
    
    await syncShell.initialize();
    
    const service = createBookmarkService(syncShell, {
      onRemoteChangeDetected
    });
    
    expect(service).toBeDefined();
    expect((service as any).onRemoteChangeDetected).toBe(onRemoteChangeDetected);
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
    const syncShell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await syncShell.initialize();
    
    // Should not throw when creating service without callback
    const service = createBookmarkService(syncShell);
    expect(service).toBeDefined();
  });
  
  describe('Auto-load with conflict detection', () => {
    it('should auto-load when remote changes detected and no local changes', async () => {
      // Create service with auto-load callback
      const loadFromRemoteSpy = vi.fn();
      
      const syncShell = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true,
        onRemoteChangeDetected: async () => {
          // Auto-load logic
          if (!service.isDirty()) {
            await loadFromRemoteSpy();
          }
        }
      });
      
      await syncShell.initialize();
      const service = createBookmarkService(syncShell);
      
      // Wrap loadFromRemote to track calls
      const originalLoad = service.loadFromRemote;
      service.loadFromRemote = async () => {
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
      
      const syncShell = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true,
        onRemoteChangeDetected: async () => {
          // Check for conflicts
          if ((service as any).isDirty()) {
            conflictHandler({
              onLoadRemote: async () => {
                await service.loadFromRemote();
              },
              onSaveLocal: async () => {
                await service.saveToRemote();
              }
            });
          }
        }
      });
      
      await syncShell.initialize();
      const service = createBookmarkService(syncShell);
      
      // Make local changes
      service.addCategory('Local Category');
      expect(service.isDirty()).toBe(true);
      
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
      
      const syncShell = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true,
        onRemoteChangeDetected: async () => {
          // Do nothing - auto-load disabled
        }
      });
      
      await syncShell.initialize();
      const service = createBookmarkService(syncShell);
      
      // Wrap loadFromRemote to track calls
      const originalLoad = service.loadFromRemote;
      service.loadFromRemote = async () => {
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