import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';

describe('Conflict Detection Auto-sync Integration', () => {
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  
  it('should pause auto-sync when conflict is detected', async () => {
    const onRemoteChangeDetected = vi.fn();
    const hasUnresolvedConflict = vi.fn(() => false);
    
    // Create first service
    const shell1 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected,
      hasUnresolvedConflict
    });
    
    await shell1.initialize();
    const service1 = createBookmarkService(shell1);
    
    // Make local changes
    service1.addCategory('Local Category');
    expect(service1.isDirty()).toBe(true);
    
    // Create second service and make remote changes
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Simulate conflict detected - hasUnresolvedConflict returns true
    hasUnresolvedConflict.mockReturnValue(true);
    
    // Start change detection
    shell1.startChangeDetection();
    
    // Advance time multiple times
    await vi.advanceTimersByTimeAsync(10000);
    await vi.advanceTimersByTimeAsync(10000);
    
    // Should not detect changes due to conflict
    expect(onRemoteChangeDetected).not.toHaveBeenCalled();
    
    shell1.stopChangeDetection();
  });
  
  it('should resume auto-sync after conflict is resolved via Load Remote', async () => {
    const onRemoteChangeDetected = vi.fn();
    const hasUnresolvedConflict = vi.fn();
    
    // Create services
    const shell1 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected,
      hasUnresolvedConflict
    });
    
    await shell1.initialize();
    const service1 = createBookmarkService(shell1);
    service1.addCategory('Local Category');
    
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Start with conflict
    hasUnresolvedConflict.mockReturnValue(true);
    shell1.startChangeDetection();
    
    // Should not detect changes while conflict exists
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemoteChangeDetected).not.toHaveBeenCalled();
    
    // Simulate Load Remote (conflict resolved)
    hasUnresolvedConflict.mockReturnValue(false);
    await service1.loadFromRemote();
    expect(service1.isDirty()).toBe(false);
    
    // Make another remote change
    service2.addBundle('Remote Category', 'New Bundle');
    await service2.saveToRemote();
    
    // Now should detect changes
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemoteChangeDetected).toHaveBeenCalled();
    
    shell1.stopChangeDetection();
  });
  
  it('should resume auto-sync after conflict is resolved via Save Your Version', async () => {
    const onRemoteChangeDetected = vi.fn();
    const hasUnresolvedConflict = vi.fn();
    
    // Create services with separate gists to simulate actual conflict scenario
    const shell1 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected,
      hasUnresolvedConflict
    });
    
    await shell1.initialize();
    const service1 = createBookmarkService(shell1);
    
    // Make local changes first
    service1.addCategory('Local Category');
    
    // Create a second service with the same gist ID
    const gistInfo = service1.getGistInfo();
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      gistId: gistInfo.gistId,
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    
    // Make remote changes and save
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Start with conflict
    hasUnresolvedConflict.mockReturnValue(true);
    shell1.startChangeDetection();
    
    // Should not detect changes while conflict exists
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemoteChangeDetected).not.toHaveBeenCalled();
    
    // Simulate Save Your Version (conflict resolved)
    // First, we need to reload to get the latest etag
    await service1.loadFromRemote();
    
    // Now make our local changes again on top of the remote state
    service1.addCategory('Local Category');
    
    // Mark conflict as resolved and save
    hasUnresolvedConflict.mockReturnValue(false);
    const saveResult = await service1.saveToRemote();
    expect(saveResult.success).toBe(true);
    expect(service1.isDirty()).toBe(false);
    
    // Make another remote change
    // First reload service2 to get latest state
    await service2.loadFromRemote();
    service2.addBundle('Local Category', 'New Bundle');
    await service2.saveToRemote();
    
    // Now should detect changes
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemoteChangeDetected).toHaveBeenCalled();
    
    shell1.stopChangeDetection();
  });
  
  it('should remain paused after Continue Editing', async () => {
    const onRemoteChangeDetected = vi.fn();
    const hasUnresolvedConflict = vi.fn();
    
    // Create services
    const shell1 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected,
      hasUnresolvedConflict
    });
    
    await shell1.initialize();
    const service1 = createBookmarkService(shell1);
    service1.addCategory('Local Category');
    
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Start with conflict
    hasUnresolvedConflict.mockReturnValue(true);
    shell1.startChangeDetection();
    
    // Should not detect changes while conflict exists
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemoteChangeDetected).not.toHaveBeenCalled();
    
    // Simulate Continue Editing - conflict still exists
    // (hasUnresolvedConflict still returns true)
    
    // Make more local changes
    service1.addCategory('Another Local Category');
    expect(service1.isDirty()).toBe(true);
    
    // Make another remote change
    service2.addBundle('Remote Category', 'New Bundle');
    await service2.saveToRemote();
    
    // Should still not detect changes
    await vi.advanceTimersByTimeAsync(10000);
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRemoteChangeDetected).not.toHaveBeenCalled();
    
    shell1.stopChangeDetection();
  });
});