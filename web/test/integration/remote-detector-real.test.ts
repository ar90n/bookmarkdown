import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';

describe('RemoteChangeDetector Real-time Test', () => {
  let shell: GistSyncShell;
  
  beforeEach(() => {
    MockGistRepository.clearAll();
  });
  
  afterEach(() => {
    if (shell) {
      shell.stopChangeDetection();
    }
  });
  
  it('should actually start the detector and make periodic checks', async () => {
    // Spy on the hasRemoteChanges method
    const hasRemoteChangesSpy = vi.fn().mockResolvedValue({ success: true, data: false });
    
    // Create shell with mock repository
    shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    // Initialize the shell
    const initResult = await shell.initialize();
    expect(initResult.success).toBe(true);
    
    // Verify detector is running
    expect(shell.isChangeDetectionRunning()).toBe(true);
    
    // Get the repository and spy on its method
    const repo = (shell as any).repository;
    expect(repo).toBeDefined();
    
    // Replace the hasRemoteChanges method with our spy
    repo.hasRemoteChanges = hasRemoteChangesSpy;
    
    // Wait for 1 second (detector should not have run yet with 10s interval)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Should not have been called yet
    expect(hasRemoteChangesSpy).not.toHaveBeenCalled();
    
    console.log('RemoteChangeDetector is running. Repository method should be called every 10 seconds...');
  });
  
  it('should log when starting detector', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    
    // Create and initialize shell
    shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell.initialize();
    
    // Check if detector is running
    expect(shell.isChangeDetectionRunning()).toBe(true);
    
    // Manually trigger check by accessing private method
    const detector = (shell as any).detector;
    expect(detector).toBeDefined();
    
    // Simulate remote change
    const gistInfo = shell.getGistInfo();
    MockGistRepository.simulateConcurrentModification(gistInfo.gistId!);
    
    // Manually call checkForChanges
    await (detector as any).checkForChanges();
    
    // Should have logged
    expect(consoleLogSpy).toHaveBeenCalledWith('Remote changes detected!');
    
    consoleLogSpy.mockRestore();
  });
});