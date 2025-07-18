import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';
import { GistSyncShell } from '../../src/lib/shell/gist-sync';
import { success, failure } from '../../src/lib/types/result';
import { Root, MergeConflict } from '../../src/lib/types';
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

// Mock BroadcastChannel
const mockBroadcastChannel = {
  postMessage: vi.fn(),
  close: vi.fn(),
  onmessage: null as any,
  name: ''
};

const BroadcastChannelMock = vi.fn().mockImplementation((name: string) => {
  mockBroadcastChannel.name = name;
  return mockBroadcastChannel;
});

(global as any).BroadcastChannel = BroadcastChannelMock;

describe('useBookmarkContextProvider - Sync Operations', () => {
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
    
    // Reset BroadcastChannel mock
    mockBroadcastChannel.postMessage.mockClear();
    mockBroadcastChannel.close.mockClear();
    mockBroadcastChannel.onmessage = null;
    
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

  describe('Remote Sync Operations', () => {
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
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.loadFromRemote();
      });

      expect(mockService.loadFromRemote).toHaveBeenCalled();
    });

    it('should save to remote', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.saveToRemote('Test commit');
      });

      expect(mockService.saveToRemote).toHaveBeenCalledWith('Test commit');
    });

    it('should sync with remote', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.syncWithRemote();
      });

      expect(mockService.syncWithConflictResolution).toHaveBeenCalled();
    });

    it('should handle sync conflicts', async () => {
      const conflicts: MergeConflict[] = [{
        type: 'category-both-modified',
        local: { id: '1', name: 'Local Name', bundles: [], metadata: { isDeleted: false } },
        remote: { id: '1', name: 'Remote Name', bundles: [], metadata: { isDeleted: false } }
      }];
      
      mockService.checkConflicts.mockResolvedValue(conflicts);

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      const detectedConflicts = await result.current.checkConflicts();

      expect(mockService.checkConflicts).toHaveBeenCalled();
      expect(detectedConflicts).toEqual(conflicts);
    });

    it('should handle conflict resolution', async () => {
      const resolvedRoot = createRoot();
      mockService.syncWithConflictResolution.mockReturnValue(
        success({ root: resolvedRoot, updated: true })
      );

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.syncWithConflictResolution([{
          conflictId: 'conflict-1',
          resolution: 'local'
        }]);
      });

      expect(mockService.syncWithConflictResolution).toHaveBeenCalledWith([{
        conflictId: 'conflict-1',
        resolution: 'local'
      }]);
    });
  });

  describe('Auto-sync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should trigger auto-sync on changes when enabled', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token',
        autoSync: true
      }));

      // Make a change
      await act(async () => {
        await result.current.addCategory('Test Category');
      });

      // Fast-forward time to trigger debounced sync
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Wait for sync to be called
      await waitFor(() => {
        expect(mockService.saveToRemote).toHaveBeenCalled();
      });
    });

    it('should not trigger auto-sync when disabled', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token',
        autoSync: false
      }));

      // Make a change
      await act(async () => {
        await result.current.addCategory('Test Category');
      });

      // Fast-forward time
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should not trigger sync
      expect(mockService.saveToRemote).not.toHaveBeenCalled();
    });

    it('should handle auto-sync conflicts', async () => {
      const onConflictDuringAutoSync = vi.fn();
      const conflicts: MergeConflict[] = [{
        type: 'category-both-modified',
        local: { id: '1', name: 'Local', bundles: [], metadata: { isDeleted: false } },
        remote: { id: '1', name: 'Remote', bundles: [], metadata: { isDeleted: false } }
      }];

      // Setup service to return conflicts on first save, then success
      mockService.saveToRemote
        .mockReturnValueOnce(failure(new Error('Conflict detected')))
        .mockReturnValueOnce(success({ updated: true, gistId: '123' }));
      
      mockService.checkConflicts.mockResolvedValue(conflicts);

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token',
        autoSync: true,
        onConflictDuringAutoSync
      }));

      // Make a change
      await act(async () => {
        await result.current.addCategory('Test Category');
      });

      // Fast-forward time to trigger auto-sync
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Wait for conflict handler to be called
      await waitFor(() => {
        expect(onConflictDuringAutoSync).toHaveBeenCalled();
      });
    });
  });

  describe('Import/Export Operations', () => {
    it('should import data', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      const testData = '# Bookmarks\n## Test Category';
      
      await act(async () => {
        await result.current.importData(testData, 'markdown');
      });

      expect(mockService.importData).toHaveBeenCalledWith(testData, 'markdown');
    });

    it('should export data', () => {
      const exportedData = '# Bookmarks\n## Test Category';
      mockService.exportData.mockReturnValue(exportedData);

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      const data = result.current.exportData('markdown');

      expect(mockService.exportData).toHaveBeenCalledWith('markdown');
      expect(data).toBe(exportedData);
    });
  });

  describe('State Management', () => {
    it('should track loading state during operations', async () => {
      // Make loadFromRemote take some time
      mockService.loadFromRemote.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(success(createRoot())), 100);
        });
      });

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      expect(result.current.isLoading).toBe(false);

      const loadPromise = act(async () => {
        await result.current.loadFromRemote();
      });

      // Check loading state is true while operation is in progress
      expect(result.current.isLoading).toBe(true);

      await loadPromise;

      // Check loading state is false after operation completes
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors and update error state', async () => {
      const errorMessage = 'Network error';
      mockService.loadFromRemote.mockReturnValue(failure(new Error(errorMessage)));

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.loadFromRemote();
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should clear error state', async () => {
      // Set an error first
      mockService.loadFromRemote.mockReturnValue(failure(new Error('Error')));
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.loadFromRemote();
      });

      expect(result.current.error).toBe('Error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should track dirty state', () => {
      mockService.isDirty.mockReturnValue(true);

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      expect(result.current.isDirty).toBe(true);
    });

    it('should update last sync time after successful sync', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      expect(result.current.lastSyncAt).toBeNull();

      await act(async () => {
        await result.current.saveToRemote();
      });

      expect(result.current.lastSyncAt).toBeInstanceOf(Date);
    });
  });
});