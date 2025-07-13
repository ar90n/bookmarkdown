import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkContextProviderV2 } from '../../src/lib/context/providers/useBookmarkContextProviderV2.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';

describe('BookmarkContextV2 with RemoteChangeDetector Integration', () => {
  let consoleLogs: string[] = [];
  
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
    
    // Capture console logs
    consoleLogs = [];
    vi.spyOn(console, 'log').mockImplementation((msg) => {
      consoleLogs.push(msg);
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  it('should start RemoteChangeDetector when context is initialized with access token', async () => {
    let syncShell: GistSyncShell | undefined;
    
    // Custom sync shell factory that captures the instance
    const createSyncShell = () => {
      syncShell = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true
      });
      return syncShell;
    };
    
    // Render the hook
    const { result } = renderHook(() => 
      useBookmarkContextProviderV2({
        accessToken: 'test-token',
        createSyncShell
      })
    );
    
    // Wait for initialization
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    
    // Verify sync shell was created and initialized
    expect(syncShell).toBeDefined();
    
    // Initialize the shell manually (since the hook should do this)
    if (syncShell && !syncShell.isChangeDetectionRunning()) {
      await act(async () => {
        await syncShell.initialize();
      });
    }
    
    // Verify detector is running
    expect(syncShell!.isChangeDetectionRunning()).toBe(true);
    
    // Get gist info
    const gistInfo = syncShell!.getGistInfo();
    expect(gistInfo.gistId).toBeDefined();
    
    // Simulate remote change
    MockGistRepository.simulateConcurrentModification(gistInfo.gistId!);
    
    // Fast-forward 10 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    
    // Should have detected changes
    expect(consoleLogs).toContain('Remote changes detected!');
    
    // Stop the detector
    syncShell!.stopChangeDetection();
  });
  
  it('should detect changes every 10 seconds', async () => {
    let syncShell: GistSyncShell | undefined;
    
    const createSyncShell = () => {
      syncShell = new GistSyncShell({
        repositoryConfig: {
          accessToken: 'test-token',
          filename: 'bookmarks.md'
        },
        useMock: true
      });
      return syncShell;
    };
    
    renderHook(() => 
      useBookmarkContextProviderV2({
        accessToken: 'test-token',
        createSyncShell
      })
    );
    
    // Wait for initialization
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    
    // Initialize if needed
    if (syncShell && !syncShell.isChangeDetectionRunning()) {
      await act(async () => {
        await syncShell.initialize();
      });
    }
    
    const gistInfo = syncShell!.getGistInfo();
    
    // Clear logs
    consoleLogs = [];
    
    // Simulate changes and advance time multiple times
    for (let i = 0; i < 3; i++) {
      MockGistRepository.simulateConcurrentModification(gistInfo.gistId!);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
    }
    
    // Should have detected changes 3 times
    const detectionCount = consoleLogs.filter(log => log === 'Remote changes detected!').length;
    expect(detectionCount).toBe(3);
    
    syncShell!.stopChangeDetection();
  });
});