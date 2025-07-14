import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider.js';
import { MockGistRepository } from '../../src/lib/repositories/mock-gist-repository.js';
import { GistSyncShell } from '../../src/lib/shell/gist-sync.js';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';

describe('BookmarkContext - Remote Change Detection', () => {
  beforeEach(() => {
    MockGistRepository.clearAll();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  
  it('should wire onRemoteChangeDetected callback through the system', async () => {
    const onRemoteChangeDetected = vi.fn();
    
    // Create and initialize a shell with the callback
    const shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected
    });
    
    // Initialize the shell
    const initResult = await shell.initialize();
    expect(initResult.success).toBe(true);
    
    // Create a service with the shell
    const service = createBookmarkService(shell);
    
    // Create another shell to make changes
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    
    // Make a change from service2
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Fast forward time to trigger detection
    await vi.advanceTimersByTimeAsync(10000);
    
    // Should have detected the change
    expect(onRemoteChangeDetected).toHaveBeenCalledTimes(1);
  });
  
  it('should implement auto-load on remote change detection', async () => {
    let service: any;
    
    // Create a shell with auto-load logic
    const shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected: async () => {
        // Auto-load if not dirty
        if (!service.isDirty()) {
          await service.loadFromRemote();
        }
      }
    });
    
    await shell.initialize();
    service = createBookmarkService(shell);
    
    // Create another shell to make changes
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    
    // Make a change from service2
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Fast forward time to trigger detection and auto-load
    await vi.advanceTimersByTimeAsync(10000);
    
    // Should have auto-loaded the remote changes
    const root = service.getRoot();
    expect(root.categories).toHaveLength(1);
    expect(root.categories[0].name).toBe('Remote Category');
  });
  
  it('should handle conflict detection during auto-load', async () => {
    const conflictHandler = vi.fn();
    let service: any;
    
    // Create a shell with conflict detection
    const shell = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true,
      onRemoteChangeDetected: async () => {
        // Check for conflicts
        if (service.isDirty()) {
          conflictHandler({
            onLoadRemote: async () => {
              await service.loadFromRemote();
            },
            onSaveLocal: async () => {
              await service.saveToRemote();
            }
          });
        } else {
          await service.loadFromRemote();
        }
      }
    });
    
    await shell.initialize();
    service = createBookmarkService(shell);
    
    // Make local changes
    service.addCategory('Local Category');
    expect(service.isDirty()).toBe(true);
    
    // Create another shell to make changes
    const shell2 = new GistSyncShell({
      repositoryConfig: {
        accessToken: 'test-token',
        filename: 'bookmarks.md'
      },
      useMock: true
    });
    
    await shell2.initialize();
    const service2 = createBookmarkService(shell2);
    
    // Make remote changes
    service2.addCategory('Remote Category');
    await service2.saveToRemote();
    
    // Fast forward time to trigger detection
    await vi.advanceTimersByTimeAsync(10000);
    
    // Should have called conflict handler
    expect(conflictHandler).toHaveBeenCalledTimes(1);
    
    // Test resolving conflict by loading remote
    const { onLoadRemote } = conflictHandler.mock.calls[0][0];
    await onLoadRemote();
    
    // Should have loaded remote data
    expect(service.isDirty()).toBe(false);
    const root = service.getRoot();
    expect(root.categories).toHaveLength(1);
    expect(root.categories[0].name).toBe('Remote Category');
  });
});