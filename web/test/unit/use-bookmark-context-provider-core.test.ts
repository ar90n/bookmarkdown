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

describe('useBookmarkContextProvider - Core', () => {
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

  describe('Gist ID Management', () => {
    it('should save gist ID to localStorage', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      act(() => {
        result.current.saveGistId('new-gist-id');
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id', 'new-gist-id');
      expect(result.current.currentGistId).toBe('new-gist-id');
    });

    it('should clear gist ID from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('existing-gist-id');
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.currentGistId).toBe('existing-gist-id');
      
      act(() => {
        result.current.clearGistId();
      });
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id');
      expect(result.current.currentGistId).toBeUndefined();
    });
  });

  describe('Business Logic', () => {
    it('should determine if bundle can be dropped into category', () => {
      const root = createRoot();
      root.categories.push({
        id: '1',
        name: 'Category 1',
        bundles: [{
          id: 'bundle-1',
          name: 'Bundle 1',
          bookmarks: [],
          metadata: { isDeleted: false }
        }],
        metadata: { isDeleted: false }
      });
      root.categories.push({
        id: '2',
        name: 'Category 2',
        bundles: [],
        metadata: { isDeleted: false }
      });
      
      mockService.getRoot.mockReturnValue(root);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      // Can drop into different category
      expect(result.current.canDropBundle('Category 1', 'Category 2')).toBe(true);
      
      // Cannot drop into same category
      expect(result.current.canDropBundle('Category 1', 'Category 1')).toBe(false);
      
      // Cannot drop into non-existent category
      expect(result.current.canDropBundle('Category 1', 'Non-existent')).toBe(false);
    });

    it('should determine if bookmark can be dragged', () => {
      const root = createRoot();
      root.categories.push({
        id: '1',
        name: 'Category 1',
        bundles: [{
          id: 'bundle-1',
          name: 'Bundle 1',
          bookmarks: [{
            id: 'bookmark-1',
            url: 'https://example.com',
            title: 'Example',
            created: new Date().toISOString(),
            tags: [],
            metadata: { isDeleted: false }
          }],
          metadata: { isDeleted: false }
        }],
        metadata: { isDeleted: false }
      });
      
      mockService.getRoot.mockReturnValue(root);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      // Can drag existing bookmark
      expect(result.current.canDragBookmark('bookmark-1')).toBe(true);
      
      // Cannot drag non-existent bookmark
      expect(result.current.canDragBookmark('non-existent')).toBe(false);
    });

    it('should determine if bookmark can be dropped', () => {
      const root = createRoot();
      root.categories.push({
        id: '1',
        name: 'Category 1',
        bundles: [{
          id: 'bundle-1',
          name: 'Bundle 1',
          bookmarks: [],
          metadata: { isDeleted: false }
        }],
        metadata: { isDeleted: false }
      });
      
      mockService.getRoot.mockReturnValue(root);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      // Can drop into existing bundle
      expect(result.current.canDropBookmark('Category 1', 'Bundle 1')).toBe(true);
      
      // Cannot drop into non-existent bundle
      expect(result.current.canDropBookmark('Category 1', 'Non-existent')).toBe(false);
    });

    it('should get source bundle for bookmark', () => {
      const root = createRoot();
      root.categories.push({
        id: '1',
        name: 'Category 1',
        bundles: [{
          id: 'bundle-1',
          name: 'Bundle 1',
          bookmarks: [{
            id: 'bookmark-1',
            url: 'https://example.com',
            title: 'Example',
            created: new Date().toISOString(),
            tags: [],
            metadata: { isDeleted: false }
          }],
          metadata: { isDeleted: false }
        }],
        metadata: { isDeleted: false }
      });
      
      mockService.getRoot.mockReturnValue(root);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const sourceBundle = result.current.getSourceBundle('bookmark-1');
      
      expect(sourceBundle).toEqual({
        category: 'Category 1',
        bundle: 'Bundle 1'
      });
    });

    it('should check if has categories', () => {
      const root = createRoot();
      
      mockService.getRoot.mockReturnValue(root);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.hasCategories()).toBe(false);
      
      // Add a category
      root.categories.push({
        id: '1',
        name: 'Category 1',
        bundles: [],
        metadata: { isDeleted: false }
      });
      
      expect(result.current.hasCategories()).toBe(true);
    });

    it('should get categories list', () => {
      const root = createRoot();
      root.categories.push({
        id: '1',
        name: 'Category 1',
        bundles: [],
        metadata: { isDeleted: false }
      });
      root.categories.push({
        id: '2',
        name: 'Category 2',
        bundles: [],
        metadata: { isDeleted: false }
      });
      
      mockService.getRoot.mockReturnValue(root);
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      const categories = result.current.getCategories();
      
      expect(categories).toEqual(['Category 1', 'Category 2']);
    });
  });

  describe('BroadcastChannel Communication', () => {
    it('should post messages on state changes', async () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      await act(async () => {
        await result.current.addCategory('Test Category');
      });
      
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'state-changed'
      });
    });

    it('should handle incoming broadcast messages', () => {
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      // Simulate incoming message
      act(() => {
        mockBroadcastChannel.onmessage?.({ data: { type: 'state-changed' } });
      });
      
      // Should reload from service
      expect(mockService.getRoot).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle and display service errors', async () => {
      mockService.addCategory.mockReturnValue(failure(new Error('Service error')));
      
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      await act(async () => {
        await result.current.addCategory('Test Category');
      });
      
      expect(result.current.error).toBe('Service error');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({}));
      
      expect(result.current.currentGistId).toBeUndefined();
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token'
      }));
      
      unmount();
      
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });
  });

  describe('Custom Sync Shell', () => {
    it('should use custom sync shell creator if provided', async () => {
      const customSyncShell = {
        initialize: vi.fn(() => success(undefined)),
        save: vi.fn(() => success({ updated: true, gistId: '123' })),
        load: vi.fn(() => success(createRoot())),
        isRemoteUpdated: vi.fn(() => Promise.resolve(false)),
        getGistInfo: vi.fn(() => ({ gistId: undefined })),
        startRemoteChangeDetector: vi.fn(),
        stopRemoteChangeDetector: vi.fn()
      };
      
      const createSyncShell = vi.fn(() => customSyncShell);
      
      renderHookWithCleanup(() => useBookmarkContextProvider({
        accessToken: 'test-token',
        createSyncShell
      }));
      
      await waitFor(() => {
        expect(createSyncShell).toHaveBeenCalled();
        expect(customSyncShell.initialize).toHaveBeenCalled();
      });
    });
  });
});