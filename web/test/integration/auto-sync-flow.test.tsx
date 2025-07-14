import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';

describe('Auto-sync Integration Test', () => {
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  
  it('should integrate remote change detection with auto-load', async () => {
    let service1: any;
    
    // Create first service with auto-load
    const shell1 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected: async () => {
        if (!service1.isDirty()) {
          await service1.loadFromRemote();
        }
      }
    });
    
    await shell1.initialize();
    service1 = createBookmarkService(shell1);
    
    // Create second service
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    
    // Service 2 makes changes
    service2.addCategory('Remote Data');
    service2.addBundle('Remote Data', 'Bundle 1');
    await service2.saveToRemote();
    
    // Advance time to trigger detection
    await vi.advanceTimersByTimeAsync(10000);
    
    // Service 1 should have auto-loaded
    const root = service1.getRoot();
    expect(root.categories).toHaveLength(1);
    expect(root.categories[0].name).toBe('Remote Data');
    expect(root.categories[0].bundles).toHaveLength(1);
  });
  
  it('should handle conflict during auto-sync', async () => {
    const conflictHandler = vi.fn();
    let service1: any;
    
    // Create first service with conflict handling
    const shell1 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected: async () => {
        if (service1.isDirty()) {
          conflictHandler({
            onLoadRemote: () => service1.loadFromRemote(),
            onSaveLocal: () => service1.saveToRemote()
          });
        }
      }
    });
    
    await shell1.initialize();
    service1 = createBookmarkService(shell1);
    
    // Make local changes
    service1.addCategory('Local Data');
    expect(service1.isDirty()).toBe(true);
    
    // Create second service
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    
    // Service 2 makes changes
    service2.addCategory('Remote Data');
    await service2.saveToRemote();
    
    // Advance time to trigger detection
    await vi.advanceTimersByTimeAsync(10000);
    
    // Conflict handler should have been called
    expect(conflictHandler).toHaveBeenCalledTimes(1);
    expect(conflictHandler).toHaveBeenCalledWith({
      onLoadRemote: expect.any(Function),
      onSaveLocal: expect.any(Function)
    });
  });
  
  it('should properly wire isDirty through the system', async () => {
    const shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell.initialize();
    const service = createBookmarkService(shell);
    
    // Initially not dirty
    expect(service.isDirty()).toBe(false);
    
    // Make changes
    service.addCategory('Test Category');
    expect(service.isDirty()).toBe(true);
    
    // Save should reset dirty
    await service.saveToRemote();
    expect(service.isDirty()).toBe(false);
    
    // Make more changes
    service.addBundle('Test Category', 'Test Bundle');
    expect(service.isDirty()).toBe(true);
    
    // Load should reset dirty
    await service.loadFromRemote();
    expect(service.isDirty()).toBe(false);
  });
});