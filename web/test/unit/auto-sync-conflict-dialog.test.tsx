import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dialogCallbackRef } from '../../src/lib/context/providers/dialog-state-ref.js';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider.js';
import { renderHook, act } from '@testing-library/react';

// Mock the GistSyncShell and related modules
vi.mock('../../src/lib/shell/gist-sync.js', () => ({
  GistSyncShell: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue({ success: true }),
    load: vi.fn().mockResolvedValue({ success: true, data: { categories: [] } }),
    save: vi.fn().mockResolvedValue({ success: true, data: { gistId: 'test-gist', etag: 'test-etag', root: { categories: [] } } }),
    isRemoteUpdated: vi.fn().mockResolvedValue({ success: true, data: false }),
    getGistInfo: vi.fn().mockReturnValue({ gistId: 'test-gist', etag: 'test-etag' })
  }))
}));

vi.mock('../../src/lib/adapters/bookmark-service.js', () => ({
  createBookmarkService: vi.fn().mockImplementation((shell) => ({
    getRoot: vi.fn().mockReturnValue({ categories: [] }),
    isDirty: vi.fn().mockReturnValue(true),
    hasRemoteChanges: vi.fn().mockResolvedValue({ success: true, data: true }),
    loadFromRemote: vi.fn().mockResolvedValue({ success: true, data: { categories: [] } }),
    saveToRemote: vi.fn().mockResolvedValue({ success: true, data: { gistId: 'test-gist' } }),
    addCategory: vi.fn().mockReturnValue({ success: true }),
    removeCategory: vi.fn().mockReturnValue({ success: true }),
    getGistInfo: vi.fn().mockReturnValue({ gistId: 'test-gist', etag: 'test-etag' })
  }))
}));

describe('Auto-sync Conflict Dialog', () => {
  beforeEach(() => {
    // Reset mocks and refs
    vi.clearAllMocks();
    dialogCallbackRef.openSyncConflictDialog = null;
  });

  it('should call dialogCallbackRef when auto-sync detects conflict', async () => {
    const mockOpenDialog = vi.fn();
    dialogCallbackRef.openSyncConflictDialog = mockOpenDialog;

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: (handlers) => {
        if (dialogCallbackRef.openSyncConflictDialog) {
          dialogCallbackRef.openSyncConflictDialog(handlers);
        }
      }
    }));

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    // Check that dialog was called
    expect(mockOpenDialog).toHaveBeenCalled();
    const callArgs = mockOpenDialog.mock.calls[0][0];
    expect(callArgs).toHaveProperty('onLoadRemote');
    expect(callArgs).toHaveProperty('onSaveLocal');
  });

  it('should show error when onConflictDuringAutoSync is not provided', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true
      // No onConflictDuringAutoSync callback
    }));

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    // Should have error since no conflict handler was provided
    expect(result.current.error).toBe('Auto-sync failed: Remote has changes');
  });

  it('should set hasUnresolvedConflict when conflict detected', async () => {
    const mockOpenDialog = vi.fn();
    dialogCallbackRef.openSyncConflictDialog = mockOpenDialog;

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: (handlers) => {
        if (dialogCallbackRef.openSyncConflictDialog) {
          dialogCallbackRef.openSyncConflictDialog(handlers);
        }
      }
    }));

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Import dialogStateRef to check the flag
    const { dialogStateRef } = await import('../../src/lib/context/providers/dialog-state-ref.js');
    
    // Reset the flag
    dialogStateRef.hasUnresolvedConflict = false;

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    // Check that hasUnresolvedConflict was set
    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
  });

  it('should clear hasUnresolvedConflict when Load Remote is chosen', async () => {
    const mockOpenDialog = vi.fn();
    let capturedHandlers: any = null;
    
    dialogCallbackRef.openSyncConflictDialog = mockOpenDialog.mockImplementation((handlers) => {
      capturedHandlers = handlers;
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: (handlers) => {
        if (dialogCallbackRef.openSyncConflictDialog) {
          dialogCallbackRef.openSyncConflictDialog(handlers);
        }
      }
    }));

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const { dialogStateRef } = await import('../../src/lib/context/providers/dialog-state-ref.js');

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
    
    // Simulate choosing Load Remote
    await act(async () => {
      await capturedHandlers.onLoadRemote();
    });

    // Flag should be cleared
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false);
  });

  it('should clear hasUnresolvedConflict when Save Your Version is chosen', async () => {
    const mockOpenDialog = vi.fn();
    let capturedHandlers: any = null;
    
    dialogCallbackRef.openSyncConflictDialog = mockOpenDialog.mockImplementation((handlers) => {
      capturedHandlers = handlers;
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: (handlers) => {
        if (dialogCallbackRef.openSyncConflictDialog) {
          dialogCallbackRef.openSyncConflictDialog(handlers);
        }
      }
    }));

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const { dialogStateRef } = await import('../../src/lib/context/providers/dialog-state-ref.js');

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
    
    // Simulate choosing Save Your Version
    await act(async () => {
      await capturedHandlers.onSaveLocal();
    });

    // Flag should be cleared
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false);
  });
});