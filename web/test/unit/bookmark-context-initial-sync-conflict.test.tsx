import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider.js';
import { dialogCallbackRef, dialogStateRef } from '../../src/lib/context/providers/dialog-state-ref.js';

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
const mockHasRemoteChanges = vi.fn();

vi.mock('../../src/lib/adapters/bookmark-service.js', () => ({
  createBookmarkService: vi.fn().mockImplementation(() => ({
    getRoot: vi.fn().mockReturnValue({ categories: [] }),
    isDirty: mockIsDirty,
    hasRemoteChanges: mockHasRemoteChanges,
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

describe('BookmarkContext Initial Sync Conflict Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    dialogStateRef.hasUnresolvedConflict = false;
    dialogStateRef.isConflictDialogOpen = false;
    dialogCallbackRef.openSyncConflictDialog = null;
    
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'bookmarkdown_data_gist_id') return 'test-gist-123';
      return null;
    });
    
    mockLoadFromRemote.mockResolvedValue({ 
      success: true, 
      data: { categories: [{ name: 'Remote Category', bundles: [] }] } 
    });
    mockSaveToRemote.mockResolvedValue({ 
      success: true, 
      data: { gistId: 'test-gist-123' } 
    });
    mockGetGistInfo.mockReturnValue({ gistId: 'test-gist-123', etag: 'test-etag' });
    mockHasRemoteChanges.mockResolvedValue({ success: true, data: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle conflicts during initial sync when local has changes', async () => {
    // Setup: Local has changes (dirty)
    mockIsDirty.mockReturnValue(true);
    mockHasRemoteChanges.mockResolvedValue({ success: true, data: true });
    
    const mockOpenDialog = vi.fn();
    dialogCallbackRef.openSyncConflictDialog = mockOpenDialog;

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md',
      onConflictDuringAutoSync: (handlers) => {
        if (dialogCallbackRef.openSyncConflictDialog) {
          dialogCallbackRef.openSyncConflictDialog(handlers);
        }
      }
    }));

    // Make a local change before initial sync
    await act(async () => {
      result.current.addCategory('Local Category');
      await vi.advanceTimersByTimeAsync(50);
    });

    // Wait for initial sync attempt
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Conflict should be detected but initial sync should not happen
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false); // Initial sync doesn't trigger conflict detection
    expect(mockLoadFromRemote).toHaveBeenCalled(); // But it should try to load
    expect(result.current.initialSyncCompleted).toBe(true);
  });

  it('should sync successfully when no local changes during initial sync', async () => {
    // Setup: No local changes
    mockIsDirty.mockReturnValue(false);
    mockHasRemoteChanges.mockResolvedValue({ success: true, data: false });

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md'
    }));

    // Wait for initial sync
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Should have synced successfully
    expect(mockLoadFromRemote).toHaveBeenCalled();
    expect(result.current.root.categories).toHaveLength(1);
    expect(result.current.root.categories[0].name).toBe('Remote Category');
    expect(result.current.initialSyncCompleted).toBe(true);
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false);
  });

  it('should not trigger conflict dialog during initial sync', async () => {
    // Setup: Simulate scenario where there would be a conflict
    mockIsDirty.mockReturnValue(true);
    mockHasRemoteChanges.mockResolvedValue({ success: true, data: true });
    
    const mockOpenDialog = vi.fn();
    dialogCallbackRef.openSyncConflictDialog = mockOpenDialog;

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      storageKey: 'bookmarkdown_data',
      filename: 'bookmarks.md',
      onConflictDuringAutoSync: (handlers) => {
        if (dialogCallbackRef.openSyncConflictDialog) {
          dialogCallbackRef.openSyncConflictDialog(handlers);
        }
      }
    }));

    // Wait for initial sync
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Initial sync should complete without showing conflict dialog
    expect(mockOpenDialog).not.toHaveBeenCalled();
    expect(result.current.initialSyncCompleted).toBe(true);
    
    // The initial sync just loads, doesn't check for conflicts
    expect(mockLoadFromRemote).toHaveBeenCalled();
  });

});