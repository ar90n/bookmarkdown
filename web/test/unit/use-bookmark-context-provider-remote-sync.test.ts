import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';
import { GistSyncShell } from '../../src/lib/shell/gist-sync';
import { success, failure } from '../../src/lib/types/result';
import { Root } from '../../src/lib/types';
import { createRoot } from '../../src/lib/core';

// Mock dependencies
vi.mock('../../src/lib/adapters/bookmark-service');
vi.mock('../../src/lib/shell/gist-sync');
vi.mock('../../src/lib/hooks/useDebounce', () => ({
  useDebounce: (fn: any) => fn
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe.skip('useBookmarkContextProvider - Remote Sync Operations', () => {
  let mockService: any;
  let mockSyncShell: any;
  const renderedHooks: Array<{ unmount: () => void }> = [];

  // Helper to render hook with automatic cleanup
  const renderHookWithCleanup = <T,>(callback: () => T) => {
    const result = renderHook(callback);
    renderedHooks.push(result);
    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock service
    mockService = {
      getRoot: vi.fn(() => createRoot()),
      addCategory: vi.fn(() => success(undefined)),
      removeCategory: vi.fn(() => success(undefined)),
      renameCategory: vi.fn(() => success(undefined)),
      addBundle: vi.fn(() => success(undefined)),
      removeBundle: vi.fn(() => success(undefined)),
      renameBundle: vi.fn(() => success(undefined)),
      addBookmark: vi.fn(() => success(undefined)),
      addBookmarksBatch: vi.fn(() => success(undefined)),
      updateBookmark: vi.fn(() => success(undefined)),
      removeBookmark: vi.fn(() => success(undefined)),
      moveBookmark: vi.fn(() => success(undefined)),
      moveBundle: vi.fn(() => success(undefined)),
      searchBookmarks: vi.fn(() => []),
      getStats: vi.fn(() => ({ categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 })),
      loadFromRemote: vi.fn(() => success(createRoot())),
      saveToRemote: vi.fn(() => success({ updated: true, gistId: '123' })),
      hasRemoteChanges: vi.fn(() => success(false)),
      checkRemoteUpdate: vi.fn(() => Promise.resolve(false)),
      forceReload: vi.fn(() => success(createRoot())),
      syncWithConflictResolution: vi.fn(() => success({ root: createRoot(), updated: false })),
      checkConflicts: vi.fn(() => Promise.resolve([])),
      importData: vi.fn(() => success(undefined)),
      exportData: vi.fn(() => ''),
      getGistInfo: vi.fn(() => ({ gistId: undefined })),
      isDirty: vi.fn(() => false)
    };
    
    // Setup sync shell mock
    mockSyncShell = {
      initialize: vi.fn(() => success(undefined)),
      save: vi.fn(() => success({ updated: true, gistId: '123' })),
      load: vi.fn(() => success(createRoot())),
      isRemoteUpdated: vi.fn(() => Promise.resolve(false)),
      getGistInfo: vi.fn(() => ({ gistId: undefined })),
      startRemoteChangeDetector: vi.fn(),
      stopRemoteChangeDetector: vi.fn()
    };
    
    (createBookmarkService as any).mockReturnValue(mockService);
    (GistSyncShell as any).mockImplementation(() => mockSyncShell);
    
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    // Unmount all rendered hooks
    renderedHooks.forEach(hook => hook.unmount());
    renderedHooks.length = 0;
    
    // Clear all timers
    vi.clearAllTimers();
    vi.clearAllMocks();
    
    // Clear mock implementations to free memory
    mockService = null as any;
    mockSyncShell = null as any;
    vi.restoreAllMocks();
  });

  it('should load from remote', async () => {
    const remoteRoot = createRoot();
    remoteRoot.categories.push({
      id: '1',
      name: 'Remote Category',
      bundles: [],
      metadata: { isDeleted: false }
    });
    mockService.loadFromRemote.mockReturnValue(success(remoteRoot));

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loadFromRemote();
    });

    expect(mockService.loadFromRemote).toHaveBeenCalled();
  });

  it('should save to remote', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.saveToRemote();
    });

    expect(mockService.saveToRemote).toHaveBeenCalled();
  });

  it('should sync with remote', async () => {
    mockService.hasRemoteChanges.mockReturnValue(success(false));

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.syncWithRemote();
    });

    // Should check for remote changes
    expect(mockService.hasRemoteChanges).toHaveBeenCalled();
  });

  it('should handle sync conflicts', async () => {
    mockService.hasRemoteChanges.mockReturnValue(success(true));
    mockService.isDirty.mockReturnValue(true);

    const onConflict = vi.fn();

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Should detect conflict and call onConflict callback
    expect(mockService.hasRemoteChanges).toHaveBeenCalled();
    expect(onConflict).toHaveBeenCalled();
  });

  it('should handle conflict resolution', async () => {
    mockService.hasRemoteChanges.mockReturnValue(success(true));
    mockService.isDirty.mockReturnValue(true);

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let conflictHandlers: any = null;
    const onConflict = vi.fn((handlers) => {
      conflictHandlers = handlers;
    });

    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    expect(onConflict).toHaveBeenCalled();
    expect(conflictHandlers).toHaveProperty('onLoadRemote');
    expect(conflictHandlers).toHaveProperty('onSaveLocal');

    // Test loading remote version
    await act(async () => {
      await conflictHandlers.onLoadRemote();
    });

    expect(mockService.loadFromRemote).toHaveBeenCalled();
  });
});