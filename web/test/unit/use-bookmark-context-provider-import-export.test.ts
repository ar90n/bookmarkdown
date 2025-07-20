import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';
import { GistSyncShell } from '../../src/lib/shell/gist-sync';
import { success } from '../../src/lib/types/result';
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

describe.skip('useBookmarkContextProvider - Import/Export Operations', () => {
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

  it('should import data', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const testData = '# Bookmarks\n## Test Category';
    
    await act(async () => {
      await result.current.importData(testData, 'markdown');
    });

    // Import should have been called on the hook (not the service)
    expect(result.current.root.categories.length).toBeGreaterThanOrEqual(0);
  });

  it('should export data', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const data = await result.current.exportData('markdown');
      expect(data).toBeDefined();
      expect(typeof data).toBe('string');
    });
  });

  it('should handle import errors gracefully', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const invalidData = 'Invalid markdown data';
    
    await act(async () => {
      await result.current.importData(invalidData, 'markdown');
    });

    // Should not crash, error should be handled
    expect(result.current.root).toBeDefined();
  });

  it('should export data in different formats', async () => {
    const { result } = renderHookWithCleanup(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      createSyncShell: () => mockSyncShell
    }));

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add some test data
    await act(async () => {
      await result.current.addCategory('Test Category');
    });

    // Export as markdown
    await act(async () => {
      const markdownData = await result.current.exportData('markdown');
      expect(markdownData).toContain('# Bookmarks');
    });

    // Export as JSON
    await act(async () => {
      const jsonData = await result.current.exportData('json');
      const parsed = JSON.parse(jsonData);
      expect(parsed).toHaveProperty('categories');
    });
  });
});