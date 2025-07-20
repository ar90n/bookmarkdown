import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { success } from '../../src/lib/types/result';
import { createRoot } from '../../src/lib/core';

// Mock modules
vi.mock('../../src/lib/adapters/bookmark-service', () => ({
  createBookmarkService: vi.fn(() => ({
    getRoot: vi.fn(() => createRoot()),
    addCategory: vi.fn(() => success(undefined)),
    removeCategory: vi.fn(() => success(undefined)),
    renameCategory: vi.fn(() => success(undefined)),
    addBundle: vi.fn(() => success(undefined)),
    removeBundle: vi.fn(() => success(undefined)),
    renameBundle: vi.fn(() => success(undefined)),
    addBookmark: vi.fn(() => success(undefined)),
    updateBookmark: vi.fn(() => success(undefined)),
    removeBookmark: vi.fn(() => success(undefined)),
    moveBookmark: vi.fn(() => success(undefined)),
    moveBundle: vi.fn(() => success(undefined)),
    searchBookmarks: vi.fn(() => []),
    getStats: vi.fn(() => ({ totalCategories: 0, totalBundles: 0, totalBookmarks: 0 })),
    isDirty: vi.fn(() => false),
    getGistInfo: vi.fn(() => null)
  }))
}));

vi.mock('../../src/lib/shell/gist-sync');
vi.mock('../../src/lib/hooks/useDebounce', () => ({
  useDebounce: (fn: any) => fn
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// BroadcastChannel removed - no mock needed

describe('useBookmarkContextProvider - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    expect(result.current.root.categories).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('should add category', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    await act(async () => {
      await result.current.addCategory('Test Category');
    });
    
    expect(result.current.isDirty).toBe(true);
  });

  it('should add bundle', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    await act(async () => {
      await result.current.addBundle('Category', 'Bundle');
    });
    
    expect(result.current.isDirty).toBe(true);
  });

  it('should add bookmark', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    await act(async () => {
      await result.current.addBookmark('Category', 'Bundle', {
        title: 'Test Bookmark',
        url: 'https://example.com'
      });
    });
    
    expect(result.current.isDirty).toBe(true);
  });

  it('should handle errors', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
  });

  it('should manage gist ID', () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    act(() => {
      result.current.saveGistId('test-gist-id');
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id', 'test-gist-id');
    expect(result.current.currentGistId).toBe('test-gist-id');
    
    act(() => {
      result.current.clearGistId();
    });
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('bookmarkdown_data_gist_id');
    expect(result.current.currentGistId).toBeUndefined();
  });

  it('should export data as JSON', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    const exported = await result.current.exportData('json');
    
    expect(typeof exported).toBe('string');
    expect(() => JSON.parse(exported)).not.toThrow();
  });

  it('should export data as markdown', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    const exported = await result.current.exportData('markdown');
    
    expect(typeof exported).toBe('string');
  });

  it('should check if has categories', () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    expect(result.current.hasCategories()).toBe(false);
  });

  it('should get categories', () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    const categories = result.current.getCategories();
    
    expect(Array.isArray(categories)).toBe(true);
    expect(categories).toEqual([]);
  });

  it('should check if sync is configured', () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    expect(result.current.isSyncConfigured()).toBe(false);
  });

  it('should manage auto-sync setting', () => {
    const { result } = renderHook(() => useBookmarkContextProvider({}));
    
    expect(result.current.isAutoSyncEnabled()).toBe(true); // Default
    
    act(() => {
      result.current.setAutoSync(false);
    });
    
    expect(result.current.isAutoSyncEnabled()).toBe(false);
  });
});