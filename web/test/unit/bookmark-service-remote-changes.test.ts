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
});