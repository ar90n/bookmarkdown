import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';
import { dialogStateRef } from '../../src/lib/context/providers/dialog-state-ref';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service.js';

// Mock the services and dependencies
vi.mock('../../src/lib/adapters/bookmark-service.js', () => ({
  createBookmarkService: vi.fn(() => ({
    getRoot: vi.fn(() => ({ categories: [] })),
    addCategory: vi.fn(() => ({ success: true })),
    isDirty: vi.fn(() => true),
    hasRemoteChanges: vi.fn(() => Promise.resolve({ success: true, data: false })),
    saveToRemote: vi.fn(() => Promise.resolve({ success: true, data: {} }))
  }))
}));

vi.mock('../../src/lib/shell/gist-sync.js', () => ({
  GistSyncShell: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(() => Promise.resolve({ success: true }))
  }))
}));

describe('Auto-sync pause during conflicts', () => {
  const mockOnConflictDuringAutoSync = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    dialogStateRef.hasUnresolvedConflict = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should skip auto-sync when there is an unresolved conflict', async () => {
    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: mockOnConflictDuringAutoSync
    }));

    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Set conflict state
    dialogStateRef.hasUnresolvedConflict = true;

    // Trigger an operation that would normally cause auto-sync
    await act(async () => {
      await result.current.addCategory('Test Category');
    });

    // Advance timers to trigger debounced auto-sync
    await act(async () => {
      vi.advanceTimersByTime(1100); // Past the 1000ms debounce
    });

    // Auto-sync should not have been triggered
    expect(mockOnConflictDuringAutoSync).not.toHaveBeenCalled();
  });

  it('should resume auto-sync after conflict is resolved', async () => {
    const mockBookmarkService = {
      getRoot: vi.fn(() => ({ categories: [] })),
      addCategory: vi.fn(() => ({ success: true })),
      isDirty: vi.fn(() => true),
      hasRemoteChanges: vi.fn(() => Promise.resolve({ success: true, data: false })),
      saveToRemote: vi.fn(() => Promise.resolve({ success: true, data: {} }))
    };

    vi.mocked(createBookmarkService).mockReturnValue(mockBookmarkService);

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: mockOnConflictDuringAutoSync
    }));

    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Set conflict state
    dialogStateRef.hasUnresolvedConflict = true;

    // Trigger an operation
    await act(async () => {
      await result.current.addCategory('Test Category 1');
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should not auto-sync
    expect(mockBookmarkService.saveToRemote).not.toHaveBeenCalled();

    // Resolve conflict
    dialogStateRef.hasUnresolvedConflict = false;

    // Trigger another operation
    await act(async () => {
      await result.current.addCategory('Test Category 2');
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should now auto-sync
    expect(mockBookmarkService.saveToRemote).toHaveBeenCalledTimes(1);
  });

  it('should not trigger auto-sync during conflict even with multiple operations', async () => {
    const mockBookmarkService = {
      getRoot: vi.fn(() => ({ categories: [] })),
      addCategory: vi.fn(() => ({ success: true })),
      isDirty: vi.fn(() => true),
      hasRemoteChanges: vi.fn(() => Promise.resolve({ success: true, data: false })),
      saveToRemote: vi.fn(() => Promise.resolve({ success: true, data: {} }))
    };

    vi.mocked(createBookmarkService).mockReturnValue(mockBookmarkService);

    const { result } = renderHook(() => useBookmarkContextProvider({
      accessToken: 'test-token',
      autoSync: true,
      onConflictDuringAutoSync: mockOnConflictDuringAutoSync
    }));

    // Wait for initialization
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Set conflict state
    dialogStateRef.hasUnresolvedConflict = true;

    // Trigger multiple operations
    await act(async () => {
      await result.current.addCategory('Category 1');
      await result.current.addCategory('Category 2');
      await result.current.addCategory('Category 3');
    });

    // Advance timers multiple times
    await act(async () => {
      vi.advanceTimersByTime(500);
      await result.current.addCategory('Category 4');
      vi.advanceTimersByTime(600); // Total 1100ms from first operation
    });

    // Auto-sync should never have been triggered
    expect(mockBookmarkService.saveToRemote).not.toHaveBeenCalled();
    expect(mockOnConflictDuringAutoSync).not.toHaveBeenCalled();
  });
});