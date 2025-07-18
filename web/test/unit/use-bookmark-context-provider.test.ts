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

describe('useBookmarkContextProvider', () => {
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
      getStats: vi.fn(() => ({ totalCategories: 0, totalBundles: 0, totalBookmarks: 0 })),
      loadFromRemote: vi.fn(() => success(undefined)),
      saveToRemote: vi.fn(() => success({ gistId: 'test-gist-id' })),
      hasRemoteChanges: vi.fn(() => success(false)),
      isDirty: vi.fn(() => false),
      getGistInfo: vi.fn(() => ({ gistId: 'test-gist-id', filename: 'bookmarks.md' })),
      checkConflicts: vi.fn(() => success([]))
    };
    
    // Setup mock sync shell
    mockSyncShell = {
      initialize: vi.fn(() => success(undefined)),
      read: vi.fn(() => success({ content: '# Bookmarks', etag: 'test-etag' })),
      save: vi.fn(() => success({ gistId: 'test-gist-id' })),
      hasRemoteChanges: vi.fn(() => success(false))
    };
    
    // Mock createBookmarkService to return our mock
    vi.mocked(createBookmarkService).mockReturnValue(mockService);
    
    // Mock GistSyncShell constructor
    vi.mocked(GistSyncShell).mockImplementation(() => mockSyncShell);
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
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.root.categories).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastSyncAt).toBe(null);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.initialSyncCompleted).toBe(false);
      expect(result.current.isSyncing).toBe(false);
    });

    it('should initialize service without sync shell when no access token', () => {
      renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(createBookmarkService).toHaveBeenCalledWith(undefined);
    });

    it('should initialize sync shell when access token is provided', async () => {
      const config = {
        accessToken: 'test-token',
        filename: 'test.md',
        gistId: 'test-gist-id'
      };
      
      renderHookWithCleanup(() => useBookmarkContextProvider(config));
      
      await waitFor(() => {
        expect(GistSyncShell).toHaveBeenCalledWith({
          repositoryConfig: {
            accessToken: 'test-token',
            filename: 'test.md'
          },
          gistId: 'test-gist-id',
          useMock: false,
          onRemoteChangeDetected: expect.any(Function),
          isConflictDialogOpen: expect.any(Function),
          hasUnresolvedConflict: expect.any(Function)
        });
      });
    });

    it('should handle sync shell initialization failure', async () => {
      mockSyncShell.initialize.mockReturnValue(failure(new Error('Init failed')));
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await waitFor(() => {
        expect(result.current.error).toContain('Failed to connect to Gist: Init failed');
      });
    });

    it('should load gist ID from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('stored-gist-id');
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id');
      expect(result.current.currentGistId).toBe('stored-gist-id');
    });

    it('should use provided gist ID if localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        gistId: 'config-gist-id'
      }));
      
      expect(result.current.currentGistId).toBe('config-gist-id');
    });

    it('should initialize BroadcastChannel', () => {
      renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(BroadcastChannelMock).toHaveBeenCalledWith('bookmarkdown_sync');
    });

    it('should perform initial sync when gist ID and token exist', async () => {
      localStorageMock.getItem.mockReturnValue('stored-gist-id');
      
      renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await waitFor(() => {
        expect(mockService.loadFromRemote).toHaveBeenCalled();
      });
    });
  });

  describe('Category Operations', () => {
    it('should add category successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addCategory('Test Category');
      });
      
      expect(mockService.addCategory).toHaveBeenCalledWith('Test Category');
      expect(result.current.isDirty).toBe(true);
    });

    it('should handle add category error', async () => {
      mockService.addCategory.mockReturnValue(failure(new Error('Category exists')));
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addCategory('Test Category');
      });
      
      expect(result.current.error).toBe('Category exists');
    });

    it('should remove category successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.removeCategory('Test Category');
      });
      
      expect(mockService.removeCategory).toHaveBeenCalledWith('Test Category');
      expect(result.current.isDirty).toBe(true);
    });

    it('should rename category successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.renameCategory('Old Name', 'New Name');
      });
      
      expect(mockService.renameCategory).toHaveBeenCalledWith('Old Name', 'New Name');
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Bundle Operations', () => {
    it('should add bundle successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addBundle('Category', 'Bundle');
      });
      
      expect(mockService.addBundle).toHaveBeenCalledWith('Category', 'Bundle');
      expect(result.current.isDirty).toBe(true);
    });

    it('should remove bundle successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.removeBundle('Category', 'Bundle');
      });
      
      expect(mockService.removeBundle).toHaveBeenCalledWith('Category', 'Bundle');
      expect(result.current.isDirty).toBe(true);
    });

    it('should rename bundle successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.renameBundle('Category', 'Old Bundle', 'New Bundle');
      });
      
      expect(mockService.renameBundle).toHaveBeenCalledWith('Category', 'Old Bundle', 'New Bundle');
      expect(result.current.isDirty).toBe(true);
    });

    it('should move bundle successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.moveBundle('Source Category', 'Bundle', 'Target Category');
      });
      
      expect(mockService.moveBundle).toHaveBeenCalledWith('Source Category', 'Bundle', 'Target Category');
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Bookmark Operations', () => {
    const testBookmark: BookmarkInput = {
      title: 'Test Bookmark',
      url: 'https://example.com',
      note: 'Test note'
    };

    it('should add bookmark successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addBookmark('Category', 'Bundle', testBookmark);
      });
      
      expect(mockService.addBookmark).toHaveBeenCalledWith('Category', 'Bundle', testBookmark);
      expect(result.current.isDirty).toBe(true);
    });

    it('should add bookmarks batch successfully', async () => {
      const bookmarks = [testBookmark, { ...testBookmark, title: 'Another' }];
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addBookmarksBatch('Category', 'Bundle', bookmarks);
      });
      
      expect(mockService.addBookmarksBatch).toHaveBeenCalledWith('Category', 'Bundle', bookmarks);
      expect(result.current.isDirty).toBe(true);
    });

    it('should update bookmark successfully', async () => {
      const updates = { title: 'Updated Title' };
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.updateBookmark('Category', 'Bundle', 'bookmark-id', updates);
      });
      
      expect(mockService.updateBookmark).toHaveBeenCalledWith('Category', 'Bundle', 'bookmark-id', updates);
      expect(result.current.isDirty).toBe(true);
    });

    it('should remove bookmark successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.removeBookmark('Category', 'Bundle', 'bookmark-id');
      });
      
      expect(mockService.removeBookmark).toHaveBeenCalledWith('Category', 'Bundle', 'bookmark-id');
      expect(result.current.isDirty).toBe(true);
    });

    it('should move bookmark successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.moveBookmark('Source Cat', 'Source Bundle', 'Target Cat', 'Target Bundle', 'bookmark-id');
      });
      
      expect(mockService.moveBookmark).toHaveBeenCalledWith(
        'Source Cat', 'Source Bundle', 'Target Cat', 'Target Bundle', 'bookmark-id'
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('should search bookmarks', () => {
      const searchResults = [{ bookmarkId: 'id1', categoryName: 'cat1', bundleName: 'bundle1' }];
      mockService.searchBookmarks.mockReturnValue(searchResults);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const results = result.current.searchBookmarks({ query: 'test' });
      
      expect(mockService.searchBookmarks).toHaveBeenCalledWith({ query: 'test' });
      expect(results).toEqual(searchResults);
    });
  });

  describe('Sync Operations', () => {
    beforeEach(() => {
      // Setup for sync tests
      localStorageMock.getItem.mockReturnValue(null);
    });

    it('should load from remote successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      // Wait for service to be initialized
      await waitFor(() => {
        expect(createBookmarkService).toHaveBeenCalled();
      });
      
      await act(async () => {
        await result.current.loadFromRemote();
      });
      
      expect(mockService.loadFromRemote).toHaveBeenCalled();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSyncAt).toBeInstanceOf(Date);
      expect(result.current.initialSyncCompleted).toBe(true);
    });

    it('should save to remote successfully', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      // Wait for service to be initialized
      await waitFor(() => {
        expect(createBookmarkService).toHaveBeenCalled();
      });
      
      await act(async () => {
        await result.current.saveToRemote();
      });
      
      expect(mockService.saveToRemote).toHaveBeenCalled();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSyncAt).toBeInstanceOf(Date);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id', 'test-gist-id');
    });

    it.skip('should handle sync conflicts when local is dirty - covered by E2E tests', async () => {
      mockService.hasRemoteChanges.mockReturnValue(success(true));
      mockService.isDirty.mockReturnValue(true);
      
      const onConflict = vi.fn();
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      // Make it dirty
      await act(async () => {
        await result.current.addCategory('Test');
      });
      
      await act(async () => {
        await result.current.syncWithRemote({ onConflict });
      });
      
      expect(onConflict).toHaveBeenCalledWith({
        onLoadRemote: expect.any(Function),
        onSaveLocal: expect.any(Function)
      });
    });

    it.skip('should auto-sync when enabled and dirty - covered by E2E tests', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'autoSyncEnabled') return 'true';
        return null;
      });
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token',
        autoSync: true
      }));
      
      // Make a change to trigger auto-sync
      await act(async () => {
        await result.current.addCategory('Test');
      });
      
      // Auto-sync should be triggered (debounced)
      await waitFor(() => {
        expect(mockService.hasRemoteChanges).toHaveBeenCalled();
      });
    });

    it.skip('should handle remote change detection - covered by E2E tests', async () => {
      const onConflictDuringAutoSync = vi.fn();
      mockService.isDirty.mockReturnValue(true);
      
      renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token',
        onConflictDuringAutoSync
      }));
      
      // Simulate remote change detection
      const remoteChangeHandler = vi.mocked(GistSyncShell).mock.calls[0][0].onRemoteChangeDetected;
      
      await act(async () => {
        await remoteChangeHandler();
      });
      
      expect(onConflictDuringAutoSync).toHaveBeenCalled();
    });

    it.skip('should auto-load remote changes when no local changes - covered by E2E tests', async () => {
      mockService.isDirty.mockReturnValue(false);
      
      renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      // Simulate remote change detection
      const remoteChangeHandler = vi.mocked(GistSyncShell).mock.calls[0][0].onRemoteChangeDetected;
      
      await act(async () => {
        await remoteChangeHandler();
      });
      
      expect(mockService.loadFromRemote).toHaveBeenCalled();
    });

    it.skip('should retry initialization on sync failure - covered by E2E tests', async () => {
      mockService.saveToRemote.mockReturnValueOnce(
        failure(new Error('Shell not initialized'))
      );
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await act(async () => {
        await result.current.saveToRemote();
      });
      
      expect(mockSyncShell.initialize).toHaveBeenCalledTimes(2); // Initial + retry
    });
  });

  describe('Import/Export Operations', () => {
    it('should import markdown data', async () => {
      const markdownData = '# Test\n## Category\n### Bundle\n- [Title](https://example.com)';
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.importData(markdownData, 'markdown');
      });
      
      expect(result.current.isDirty).toBe(true);
    });

    it('should import JSON data', async () => {
      const jsonData = JSON.stringify({
        categories: [{
          name: 'Test',
          bundles: [{
            name: 'Bundle',
            bookmarks: [{
              id: '1',
              title: 'Test',
              url: 'https://example.com'
            }]
          }]
        }]
      });
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.importData(jsonData, 'json');
      });
      
      expect(mockService.addCategory).toHaveBeenCalledWith('Test');
      expect(mockService.addBundle).toHaveBeenCalledWith('Test', 'Bundle');
      expect(result.current.isDirty).toBe(true);
    });

    it('should handle import errors', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.importData('invalid json', 'json');
      });
      
      expect(result.current.error).toContain('Import failed');
    });

    it('should export data as markdown', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const exported = await result.current.exportData('markdown');
      
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });

    it('should export data as JSON', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const exported = await result.current.exportData('json');
      
      expect(exported).toBeDefined();
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should clear error', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      // Set an error
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.error).toBe('Test error');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBe(null);
    });

    it('should reset state', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      // Make some changes
      await act(async () => {
        await result.current.addCategory('Test');
        result.current.setError('Test error');
      });
      
      // Reset
      act(() => {
        result.current.resetState();
      });
      
      expect(result.current.error).toBe(null);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSyncAt).toBe(null);
    });

    it('should manage auto-sync setting', () => {
      localStorageMock.getItem.mockReturnValue('false');
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.isAutoSyncEnabled()).toBe(false);
      
      act(() => {
        result.current.setAutoSync(true);
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('autoSyncEnabled', 'true');
      expect(result.current.isAutoSyncEnabled()).toBe(true);
    });
  });

  describe('Gist ID Management', () => {
    it('should save gist ID', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      act(() => {
        result.current.saveGistId('new-gist-id');
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id', 'new-gist-id');
      expect(result.current.currentGistId).toBe('new-gist-id');
    });

    it('should clear gist ID', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      act(() => {
        result.current.clearGistId();
      });
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id');
      expect(result.current.currentGistId).toBeUndefined();
    });

    it.skip('should handle localStorage errors gracefully - covered by E2E tests', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      // Should not throw
      act(() => {
        result.current.saveGistId('test-id');
      });
      
      // State should still update
      expect(result.current.currentGistId).toBe('test-id');
    });
  });

  describe('Business Logic', () => {
    it('should check if can drop bookmark', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const canDrop = result.current.canDropBookmark(
        { categoryName: 'Cat1', bundleName: 'Bundle1', bookmarkId: 'id1' },
        'Cat2',
        'Bundle2'
      );
      
      expect(canDrop).toBe(true);
    });

    it('should not allow dropping bookmark to same location', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const canDrop = result.current.canDropBookmark(
        { categoryName: 'Cat1', bundleName: 'Bundle1', bookmarkId: 'id1' },
        'Cat1',
        'Bundle1'
      );
      
      expect(canDrop).toBe(false);
    });

    it('should check if can drop bundle', () => {
      mockService.getRoot.mockReturnValue({
        categories: [
          { name: 'Cat1', bundles: [] },
          { name: 'Cat2', bundles: [] }
        ]
      });
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const canDrop = result.current.canDropBundle(
        { categoryName: 'Cat1', bundleName: 'Bundle1' },
        'Cat2'
      );
      
      expect(canDrop).toBe(true);
    });

    it('should get categories', () => {
      const mockRoot = {
        categories: [
          { name: 'Cat1', bundles: [] },
          { name: 'Cat2', bundles: [] }
        ]
      };
      mockService.getRoot.mockReturnValue(mockRoot);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const categories = result.current.getCategories();
      
      expect(categories).toEqual(mockRoot.categories);
    });

    it('should check if has categories', () => {
      mockService.getRoot.mockReturnValue({
        categories: [{ name: 'Cat1', bundles: [] }]
      });
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.hasCategories()).toBe(true);
    });

    it('should get source bundle', () => {
      const mockRoot: Root = {
        categories: [{
          id: '1',
          name: 'Cat1',
          bundles: [{
            id: '2',
            name: 'Bundle1',
            bookmarks: [{
              id: 'bookmark1',
              title: 'Test',
              url: 'https://example.com'
            }]
          }]
        }]
      };
      mockService.getRoot.mockReturnValue(mockRoot);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const source = result.current.getSourceBundle('Cat1', 'Bundle1');
      
      expect(source).toEqual({
        name: 'Bundle1',
        bookmarks: mockRoot.categories[0].bundles[0].bookmarks
      });
    });

    it('should get stats', () => {
      const stats = { totalCategories: 2, totalBundles: 4, totalBookmarks: 10 };
      mockService.getStats.mockReturnValue(stats);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.getStats()).toEqual(stats);
    });

    it('should get gist info', () => {
      const gistInfo = { gistId: 'test-id', filename: 'test.md' };
      mockService.getGistInfo.mockReturnValue(gistInfo);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.getGistInfo()).toEqual(gistInfo);
    });

    it('should check if sync is configured', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await waitFor(() => {
        expect(result.current.isSyncConfigured()).toBe(true);
      });
    });
  });

  describe('BroadcastChannel Communication', () => {
    it.skip('should broadcast updates to other tabs - covered by E2E tests', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addCategory('Test');
      });
      
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'bookmark_update',
        syncAt: undefined
      });
    });

    it('should receive updates from other tabs', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const messageHandler = mockBroadcastChannel.onmessage!;
      
      act(() => {
        messageHandler(new MessageEvent('message', {
          data: {
            type: 'bookmark_update',
            syncAt: new Date().toISOString()
          }
        }));
      });
      
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSyncAt).toBeInstanceOf(Date);
    });

    it('should close broadcast channel on unmount', () => {
      const { unmount } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      unmount();
      
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service not initialized errors', async () => {
      vi.mocked(createBookmarkService).mockReturnValue(null as any);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addCategory('Test');
      });
      
      // Should not throw, just not do anything
      expect(result.current.error).toBe(null);
    });

    it('should handle export error when service not initialized', async () => {
      vi.mocked(createBookmarkService).mockReturnValue(null as any);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await expect(result.current.exportData('json')).rejects.toThrow('Service not initialized');
    });

    it('should retry initialization', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await act(async () => {
        await result.current.retryInitialization();
      });
      
      expect(mockSyncShell.initialize).toHaveBeenCalled();
      expect(mockService.loadFromRemote).toHaveBeenCalled();
    });

    it('should handle retry initialization failure', async () => {
      mockService.loadFromRemote.mockReturnValue(failure(new Error('Load failed')));
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await act(async () => {
        await result.current.retryInitialization();
      });
      
      expect(result.current.error).toContain('Failed to reconnect: Load failed');
    });
  });

  describe('Custom Sync Shell', () => {
    it('should use custom sync shell factory for testing', () => {
      const customSyncShell = {
        initialize: vi.fn(() => success(undefined)),
        read: vi.fn(() => success({ content: '', etag: '' })),
        save: vi.fn(() => success({ gistId: 'custom-id' }))
      };
      
      const createSyncShell = vi.fn(() => customSyncShell);
      
      renderHookWithCleanup(() => useBookmarkContextProvider({
        createSyncShell
      }));
      
      expect(createSyncShell).toHaveBeenCalled();
      expect(createBookmarkService).toHaveBeenCalledWith(customSyncShell);
    });
  });
});