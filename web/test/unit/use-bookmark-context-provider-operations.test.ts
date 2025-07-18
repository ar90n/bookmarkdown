import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';
import { GistSyncShell } from '../../src/lib/shell/gist-sync';
import { success, failure } from '../../src/lib/types/result';
import { Root, BookmarkInput } from '../../src/lib/types';
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

describe('useBookmarkContextProvider - Operations', () => {
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

  describe('Category Operations', () => {
    it('should add a category', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.addCategory('Test Category');
      });

      expect(mockService.addCategory).toHaveBeenCalledWith('Test Category');
    });

    it('should remove a category', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.removeCategory('Test Category');
      });

      expect(mockService.removeCategory).toHaveBeenCalledWith('Test Category');
    });

    it('should rename a category', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.renameCategory('Old Name', 'New Name');
      });

      expect(mockService.renameCategory).toHaveBeenCalledWith('Old Name', 'New Name');
    });
  });

  describe('Bundle Operations', () => {
    it('should add a bundle', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.addBundle('Category', 'Bundle');
      });

      expect(mockService.addBundle).toHaveBeenCalledWith('Category', 'Bundle');
    });

    it('should remove a bundle', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.removeBundle('Category', 'Bundle');
      });

      expect(mockService.removeBundle).toHaveBeenCalledWith('Category', 'Bundle');
    });

    it('should rename a bundle', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.renameBundle('Category', 'Old Bundle', 'New Bundle');
      });

      expect(mockService.renameBundle).toHaveBeenCalledWith('Category', 'Old Bundle', 'New Bundle');
    });
  });

  describe('Bookmark Operations', () => {
    const testBookmark: BookmarkInput = {
      url: 'https://example.com',
      title: 'Example',
      tags: []
    };

    it('should add a bookmark', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.addBookmark('Category', 'Bundle', testBookmark);
      });

      expect(mockService.addBookmark).toHaveBeenCalledWith('Category', 'Bundle', testBookmark);
    });

    it('should update a bookmark', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.updateBookmark('Category', 'Bundle', '123', { title: 'Updated' });
      });

      expect(mockService.updateBookmark).toHaveBeenCalledWith('Category', 'Bundle', '123', { title: 'Updated' });
    });

    it('should remove a bookmark', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.removeBookmark('Category', 'Bundle', '123');
      });

      expect(mockService.removeBookmark).toHaveBeenCalledWith('Category', 'Bundle', '123');
    });

    it('should move a bookmark', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.moveBookmark(
          'Source Category', 'Source Bundle', '123',
          'Target Category', 'Target Bundle'
        );
      });

      expect(mockService.moveBookmark).toHaveBeenCalledWith(
        'Source Category', 'Source Bundle', '123',
        'Target Category', 'Target Bundle'
      );
    });

    it('should add multiple bookmarks in batch', async () => {
      const bookmarks = [
        { url: 'https://example1.com', title: 'Example 1', tags: [] },
        { url: 'https://example2.com', title: 'Example 2', tags: [] }
      ];

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      await act(async () => {
        await result.current.addBookmarksBatch('Category', 'Bundle', bookmarks);
      });

      expect(mockService.addBookmarksBatch).toHaveBeenCalledWith('Category', 'Bundle', bookmarks);
    });

    it('should search bookmarks', async () => {
      const mockResults = [
        { bookmark: { id: '1', url: 'https://example.com', title: 'Example' }, path: ['Category', 'Bundle'] }
      ];
      mockService.searchBookmarks.mockReturnValue(mockResults);

      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));

      const searchResults = result.current.searchBookmarks({ query: 'example' });

      expect(mockService.searchBookmarks).toHaveBeenCalledWith({ query: 'example' });
      expect(searchResults).toEqual(mockResults);
    });
  });
});