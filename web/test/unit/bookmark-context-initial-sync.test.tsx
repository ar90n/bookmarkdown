import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock the bookmark service
const mockLoadFromRemote = vi.fn();
const mockSaveToRemote = vi.fn();
const mockGetGistInfo = vi.fn();
const mockIsDirty = vi.fn();

vi.mock('../../src/lib/adapters/bookmark-service.js', () => ({
  createBookmarkService: vi.fn().mockImplementation(() => ({
    getRoot: vi.fn().mockReturnValue({ categories: [] }),
    isDirty: mockIsDirty,
    hasRemoteChanges: vi.fn().mockResolvedValue({ success: true, data: false }),
    loadFromRemote: mockLoadFromRemote,
    saveToRemote: mockSaveToRemote,
    addCategory: vi.fn().mockReturnValue({ success: true }),
    removeCategory: vi.fn().mockReturnValue({ success: true }),
    getGistInfo: mockGetGistInfo
  }))
}));

// Mock the sync shell
vi.mock('../../src/lib/shell/gist-sync.js', () => ({
  GistSyncShell: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue({ success: true }),
    getGistInfo: vi.fn().mockReturnValue({ gistId: 'test-gist-123', etag: 'test-etag' })
  }))
}));

describe('BookmarkContext Initial Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockLocalStorage.getItem.mockReturnValue(null);
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
  });

  afterEach(() => {
    vi.useRealTimers();
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

    // Wait for initialization
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
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
      return null;
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      // No access token
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