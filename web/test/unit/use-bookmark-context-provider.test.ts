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

  // Category Operations moved to use-bookmark-context-provider-operations.test.ts

  // Bundle Operations moved to use-bookmark-context-provider-operations.test.ts

  // Bookmark Operations moved to use-bookmark-context-provider-operations.test.ts

  // Sync Operations moved to use-bookmark-context-provider-sync.test.ts

  // Import/Export Operations moved to use-bookmark-context-provider-sync.test.ts

  // State Management moved to use-bookmark-context-provider-sync.test.ts

  // Gist ID Management moved to use-bookmark-context-provider-core.test.ts

  // Business Logic moved to use-bookmark-context-provider-core.test.ts

  // BroadcastChannel Communication moved to use-bookmark-context-provider-core.test.ts

  // Error Handling moved to use-bookmark-context-provider-core.test.ts

  // Custom Sync Shell moved to use-bookmark-context-provider-core.test.ts
});