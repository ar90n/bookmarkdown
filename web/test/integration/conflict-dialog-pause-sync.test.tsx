import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';

describe('Conflict Dialog Pause Sync Integration', () => {
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  
  it('should not check for remote changes while conflict dialog is open', async () => {
    const onRemoteChangeDetected = vi.fn();
    const isConflictDialogOpen = vi.fn();
    
    // Create shell with dialog check
    const shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected,
      isConflictDialogOpen
    });
    
    await shell.initialize();
    
    // Start change detection
    shell.startChangeDetection();
    
    // Create another shell to make changes
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    await shell2.save({ categories: [{ name: 'Remote Change', bundles: [] }] });
    
    // Simulate dialog being open
    isConflictDialogOpen.mockReturnValue(true);
    
    // Advance time to trigger detection
    await vi.advanceTimersByTimeAsync(10000);
    
    // Should not detect changes while dialog is open
    expect(onRemoteChangeDetected).not.toHaveBeenCalled();
    expect(isConflictDialogOpen).toHaveBeenCalled();
    
    // Close dialog
    isConflictDialogOpen.mockReturnValue(false);
    
    // Advance time again
    await vi.advanceTimersByTimeAsync(10000);
    
    // Now should detect changes
    expect(onRemoteChangeDetected).toHaveBeenCalled();
    
    shell.stopChangeDetection();
  });
});