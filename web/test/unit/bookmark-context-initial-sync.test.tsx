import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '../test-utils';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { 
  value: mockLocalStorage,
  configurable: true 
});

// Create fresh mocks for each test
let mockLoadFromRemote: any;
let mockSaveToRemote: any;
let mockGetGistInfo: any;
let mockIsDirty: any;
let mockGetRoot: any;

vi.mock('../../src/lib/adapters/bookmark-service.js', () => ({
  createBookmarkService: vi.fn()
}));

vi.mock('../../src/lib/shell/gist-sync.js', () => ({
  GistSyncShell: vi.fn()
}));

describe('BookmarkContext Initial Sync', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    cleanup(); // Clean up React Testing Library
    
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockReset();
    mockLocalStorage.removeItem.mockReset();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Create fresh mocks for each test
    mockLoadFromRemote = vi.fn();
    mockSaveToRemote = vi.fn();
    mockGetGistInfo = vi.fn();
    mockIsDirty = vi.fn();
    mockGetRoot = vi.fn();
    
    // Set default mock implementations
    mockLoadFromRemote.mockResolvedValue({ 
      success: true, 
      data: { categories: [{ name: 'Synced Category', bundles: [] }] } 
    });
    mockSaveToRemote.mockResolvedValue({ 
      success: true, 
      data: { gistId: 'test-gist-123' } 
    });
    mockGetGistInfo.mockReturnValue({ gistId: 'test-gist-123', etag: 'test-etag' });
    mockIsDirty.mockReturnValue(false);
    mockGetRoot.mockReturnValue({ categories: [] });
    
    // Setup service mock implementation
    const { createBookmarkService } = vi.mocked(await import('../../src/lib/adapters/bookmark-service.js'));
    createBookmarkService.mockImplementation(() => {
      // Create a service instance that updates its internal state
      let currentRoot = { categories: [] };
      
      const serviceInstance = {
        getRoot: () => currentRoot,
        isDirty: mockIsDirty,
        hasRemoteChanges: vi.fn().mockResolvedValue({ success: true, data: false }),
        loadFromRemote: vi.fn().mockImplementation(async () => {
          const result = await mockLoadFromRemote();
          if (result.success) {
            currentRoot = result.data;
          }
          return result;
        }),
        saveToRemote: mockSaveToRemote,
        addCategory: vi.fn().mockReturnValue({ success: true }),
        removeCategory: vi.fn().mockReturnValue({ success: true }),
        getGistInfo: mockGetGistInfo,
        isSyncConfigured: vi.fn().mockReturnValue(true),
        addBundle: vi.fn(),
        removeBundle: vi.fn(),
        renameBundle: vi.fn(),
        addBookmark: vi.fn(),
        addBookmarksBatch: vi.fn(),
        updateBookmark: vi.fn(),
        removeBookmark: vi.fn(),
        moveBookmark: vi.fn(),
        moveBundle: vi.fn(),
        searchBookmarks: vi.fn().mockReturnValue([]),
        getStats: vi.fn().mockReturnValue({ categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 }),
        renameCategory: vi.fn(),
        forceReload: vi.fn()
      };
      
      return serviceInstance as any;
    });
    
    // Setup GistSyncShell mock implementation
    const { GistSyncShell } = vi.mocked(await import('../../src/lib/shell/gist-sync.js'));
    GistSyncShell.mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue({ success: true }),
      getGistInfo: vi.fn().mockReturnValue({ gistId: 'test-gist-123', etag: 'test-etag' }),
      load: vi.fn(),
      save: vi.fn(),
      isRemoteUpdated: vi.fn()
    } as any));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('should immediately sync when Gist ID exists in localStorage and access token is provided', async () => {
    // Setup: Gist ID in localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'bookmarkdown_data_gist_id') return 'test-gist-123';
      return null;
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md'
    }));

    // Wait for initialization and async operations
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    
    // Wait for loadFromRemote promise to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // loadFromRemote should have been called
    expect(mockLoadFromRemote).toHaveBeenCalled();
    
    // Should have synced data
    expect(result.current.root.categories).toHaveLength(1);
    expect(result.current.root.categories[0].name).toBe('Synced Category');
    expect(result.current.lastSyncAt).not.toBeNull();
    expect(result.current.initialSyncCompleted).toBe(true);
  });

  it('should not sync when no Gist ID in localStorage', async () => {
    // Setup: No Gist ID in localStorage
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md'
    }));

    // Wait for initialization
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // loadFromRemote should NOT have been called
    expect(mockLoadFromRemote).not.toHaveBeenCalled();
    
    // Should have empty data
    expect(result.current.root.categories).toHaveLength(0);
    expect(result.current.lastSyncAt).toBeNull();
  });

  it('should not sync when no access token is provided', async () => {
    // Setup: Gist ID in localStorage but no access token
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'bookmarkdown_data_gist_id') return 'test-gist-123';
      if (key === 'bookmarkdown_data_lastSyncAt') return null;
      return null;
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      // No access token
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md'
    }));

    // Wait for initialization
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // loadFromRemote should NOT have been called
    expect(mockLoadFromRemote).not.toHaveBeenCalled();
    
    // Should have empty data
    expect(result.current.root.categories).toHaveLength(0);
    expect(result.current.lastSyncAt).toBeNull();
    expect(result.current.initialSyncCompleted).toBe(false);
  });

  it('should handle sync errors gracefully', async () => {
    // Setup: Gist ID in localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'bookmarkdown_data_gist_id') return 'test-gist-123';
      return null;
    });

    // Mock load failure
    mockLoadFromRemote.mockResolvedValue({ 
      success: false, 
      error: new Error('Network error') 
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md'
    }));

    // Wait for initialization
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // loadFromRemote should have been called
    expect(mockLoadFromRemote).toHaveBeenCalled();
    
    // Should have error
    expect(result.current.error).toBe('Network error');
    expect(result.current.initialSyncCompleted).toBe(true); // Still marked as completed
  });

  it('should set loading state during initial sync', async () => {
    // Setup: Gist ID in localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'bookmarkdown_data_gist_id') return 'test-gist-123';
      return null;
    });

    // Mock slow load
    let resolveLoad: any;
    mockLoadFromRemote.mockImplementation(() => new Promise(resolve => {
      resolveLoad = resolve;
    }));

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md'
    }));

    // Wait for initialization to start
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSyncing).toBe(true);

    // Resolve the load
    await act(async () => {
      resolveLoad({ 
        success: true, 
        data: { categories: [] } 
      });
      await vi.advanceTimersByTimeAsync(50);
    });

    // Should no longer be loading
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSyncing).toBe(false);
  });
});