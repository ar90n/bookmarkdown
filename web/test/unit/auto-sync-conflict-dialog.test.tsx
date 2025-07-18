import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '../test-utils';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';
import { dialogStateRef, dialogCallbackRef } from '../../src/lib/context/providers/dialog-state-ref.js';

// Mock the adapters
vi.mock('../../src/lib/adapters/bookmark-service.js', () => ({
  createBookmarkService: vi.fn()
}));

vi.mock('../../src/lib/shell/gist-sync.js', () => ({
  GistSyncShell: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve({ success: true }))
  }))
}));

describe('Auto-sync Conflict Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    dialogStateRef.hasUnresolvedConflict = false;
    dialogCallbackRef.openSyncConflictDialog = null;
    
    // Default mock setup
    vi.mocked(createBookmarkService).mockReturnValue({
      getRoot: vi.fn(() => ({ categories: [] })),
      addCategory: vi.fn(() => ({ success: true })),
      isDirty: vi.fn(() => true),
      hasRemoteChanges: vi.fn(() => Promise.resolve({ success: true, data: true })), // Remote has changes
      saveToRemote: vi.fn(() => Promise.resolve({ success: true, data: {} })),
      loadFromRemote: vi.fn(() => Promise.resolve({ success: true, data: { categories: [] } })),
      getGistInfo: vi.fn(() => ({}))
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call onConflictDuringAutoSync when remote has changes', async () => {
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
      await vi.runAllTimersAsync();
    });

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Check that dialog was called
    expect(mockOpenDialog).toHaveBeenCalled();
    const callArgs = mockOpenDialog.mock.calls[0][0];
    expect(callArgs).toHaveProperty('onLoadRemote');
    expect(callArgs).toHaveProperty('onSaveLocal');
  });

  it('should set hasUnresolvedConflict and show error when onConflictDuringAutoSync is not provided', async () => {
    const mockSaveToRemote = vi.fn(() => Promise.resolve({ success: true, data: {} }));
    vi.mocked(createBookmarkService).mockReturnValue({
      getRoot: vi.fn(() => ({ categories: [] })),
      addCategory: vi.fn(() => ({ success: true })),
      isDirty: vi.fn(() => true),
      hasRemoteChanges: vi.fn(() => Promise.resolve({ success: true, data: true })), // Remote has changes
      saveToRemote: mockSaveToRemote,
      loadFromRemote: vi.fn(() => Promise.resolve({ success: true, data: { categories: [] } })),
      getGistInfo: vi.fn(() => ({}))
    });

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true
      // No onConflictDuringAutoSync callback
    }));

    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Reset the flag
    dialogStateRef.hasUnresolvedConflict = false;

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should have set error and conflict flag
    expect(result.current.error).toBe('Auto-sync failed: Remote has changes');
    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
    
    // Additional operations should skip auto-sync
    await act(async () => {
      result.current.addCategory('Test Category 2');
    });
    
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    
    // Save should not be called due to conflict
    expect(mockSaveToRemote).not.toHaveBeenCalled();
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
      await vi.runAllTimersAsync();
    });
    
    // Reset the flag
    dialogStateRef.hasUnresolvedConflict = false;

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should have set conflict flag
    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
    
    // Should have called the dialog
    expect(mockOpenDialog).toHaveBeenCalled();
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
      await vi.runAllTimersAsync();
    });

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
    
    // Simulate choosing Load Remote
    await act(async () => {
      await capturedHandlers?.onLoadRemote();
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
      await vi.runAllTimersAsync();
    });

    // Trigger a change to start auto-sync
    await act(async () => {
      result.current.addCategory('Test Category');
    });

    // Wait for debounced auto-sync
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(dialogStateRef.hasUnresolvedConflict).toBe(true);
    
    // Simulate choosing Save Your Version
    await act(async () => {
      await capturedHandlers?.onSaveLocal();
    });

    // Flag should be cleared
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false);
  });
});