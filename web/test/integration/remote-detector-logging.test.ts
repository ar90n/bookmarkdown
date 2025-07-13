import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import type { GistRepositoryConfig } from '../../src/lib/repositories/gist-repository.js';

describe('RemoteChangeDetector Logging Integration', () => {
  const mockConfig: GistRepositoryConfig = {
    accessToken: 'test-token',
    filename: 'bookmarks.md'
  };
  
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should log "Remote changes detected!" when remote changes occur', async () => {
    // Spy on console.log
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a sync shell with mock repository
    const shell = new GistSyncShell({
      repositoryConfig: mockConfig,
      useMock: true
    });
    
    // Initialize the shell
    const initResult = await shell.initialize();
    expect(initResult.success).toBe(true);
    
    // Verify detector is running
    expect(shell.isChangeDetectionRunning()).toBe(true);
    
    // Get the gist ID
    const gistInfo = shell.getGistInfo();
    expect(gistInfo.gistId).toBeDefined();
    
    // Advance time to trigger first check (no changes yet)
    await vi.advanceTimersByTimeAsync(10000);
    
    // Console.log should not have been called yet
    expect(consoleLogSpy).not.toHaveBeenCalledWith('Remote changes detected!');
    
    // Simulate a remote change
    MockGistRepository.simulateConcurrentModification(gistInfo.gistId!);
    
    // Advance time to trigger next check (should detect changes)
    await vi.advanceTimersByTimeAsync(10000);
    
    // Now it should have logged
    expect(consoleLogSpy).toHaveBeenCalledWith('Remote changes detected!');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    
    // Stop the detector
    shell.stopChangeDetection();
    expect(shell.isChangeDetectionRunning()).toBe(false);
    
    // Restore console.log
    consoleLogSpy.mockRestore();
  });
  
  it('should start detector automatically when creating new shell', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a new shell with initial data
    const createResult = await GistSyncShell.createNew(
      mockConfig,
      { version: 1, categories: [] },
      'Test Gist',
      false,
      true // use mock
    );
    
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;
    
    const shell = createResult.data;
    
    // Verify detector is running
    expect(shell.isChangeDetectionRunning()).toBe(true);
    
    // Get gist info
    const gistInfo = shell.getGistInfo();
    
    // Simulate remote change
    MockGistRepository.simulateConcurrentModification(gistInfo.gistId!);
    
    // Advance time past the 10 second interval
    await vi.advanceTimersByTimeAsync(11000);
    
    // Should have logged
    expect(consoleLogSpy).toHaveBeenCalledWith('Remote changes detected!');
    
    shell.stopChangeDetection();
    consoleLogSpy.mockRestore();
  });
});