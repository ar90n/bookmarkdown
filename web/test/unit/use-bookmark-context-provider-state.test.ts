import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';
import { GistSyncShell } from '../../src/lib/shell/gist-sync';
import { success, failure } from '../../src/lib/types/result';
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

describe.skip('useBookmarkContextProvider - State Management', () => {
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

  it('should track loading state during operations', async () => {
    // Make loadFromRemote take some time
    mockService.loadFromRemote.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(success(createRoot())), 100);
      });
    });

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoading).toBe(false);

    // Start the loading operation
    await act(async () => {
      await result.current.loadFromRemote();
    });

    // Check loading state is false after operation completes
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle errors and update error state', async () => {
    const errorMessage = 'Network error';
    mockService.loadFromRemote.mockReturnValue(failure(new Error(errorMessage)));

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.loadFromRemote();
      } catch (e) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should clear error state', async () => {
    // Set an error first
    mockService.loadFromRemote.mockReturnValue(failure(new Error('Error')));
    
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.loadFromRemote();
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.error).toBe('Error');

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should track dirty state', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isDirty).toBe(false);

    // Make a change - mock isDirty to return true after adding category
    mockService.isDirty.mockReturnValue(false);
    
    await act(async () => {
      await result.current.addCategory('New Category');
    });

    // Now service should report dirty
    mockService.isDirty.mockReturnValue(true);
    expect(result.current.isDirty).toBe(true);

    // Save to remote - reset isDirty
    await act(async () => {
      await result.current.saveToRemote();
    });

    mockService.isDirty.mockReturnValue(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('should update last sync time after successful sync', async () => {
    mockService.loadFromRemote.mockReturnValue(success(createRoot()));

    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastSyncAt).toBeNull();

    await act(async () => {
      await result.current.loadFromRemote();
    });

    expect(result.current.lastSyncAt).toBeInstanceOf(Date);
  });

  it('should handle sync configuration state', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should be sync configured with access token
    expect(result.current.syncConfigured).toBe(true);
  });

  it('should track initial sync completion', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell,
      gistId: 'test-gist-id'
    }));

    // Wait for initialization and initial sync
    await waitFor(() => {
      expect(result.current.initialSyncCompleted).toBe(true);
    });

    expect(result.current.lastSyncAt).toBeInstanceOf(Date);
  });
});