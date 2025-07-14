import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GistSyncShell, GistSyncConfig } from '../../src/lib/shell/gist-sync.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { RootEntity } from '../../src/lib/entities/root-entity.js';

describe('GistSyncShell - Remote Change Callback', () => {
  const mockConfig: GistSyncConfig = {
    repositoryConfig: {
      accessToken: 'test-token',
      filename: 'bookmarks.md'
    },
    useMock: true
  };
  
  beforeEach(() => {
    MockGistRepository.clearAll();
  });
  
  it('should accept onRemoteChangeDetected callback in config', async () => {
    const onRemoteChangeDetected = vi.fn();
    
    const configWithCallback: GistSyncConfig = {
      ...mockConfig,
      onRemoteChangeDetected
    };
    
    const shell = new GistSyncShell(configWithCallback);
    const result = await shell.initialize();
    
    expect(result.success).toBe(true);
    
    // The callback should be stored in the shell
    expect((shell as any).onRemoteChangeDetected).toBe(onRemoteChangeDetected);
  });
  
  it('should pass callback to RemoteChangeDetector during initialization', async () => {
    const onRemoteChangeDetected = vi.fn();
    
    const configWithCallback: GistSyncConfig = {
      ...mockConfig,
      onRemoteChangeDetected
    };
    
    const shell = new GistSyncShell(configWithCallback);
    await shell.initialize();
    
    // Get the detector and verify it has the callback
    const detector = (shell as any).detector;
    expect(detector).toBeDefined();
    expect((detector as any).onChangeDetected).toBe(onRemoteChangeDetected);
  });
  
  it('should pass callback when creating new Gist', async () => {
    const onRemoteChangeDetected = vi.fn();
    const root = RootEntity.create().toRoot();
    
    const result = await GistSyncShell.createNew(
      mockConfig.repositoryConfig,
      root,
      'Test Gist',
      false,
      true,
      onRemoteChangeDetected
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      const detector = (result.data as any).detector;
      expect(detector).toBeDefined();
      expect((detector as any).onChangeDetected).toBe(onRemoteChangeDetected);
    }
  });
});