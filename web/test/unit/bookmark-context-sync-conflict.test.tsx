import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '../test-utils';
import { useBookmarkContextProvider } from '../../src/lib/context/providers/useBookmarkContextProvider';

// Mock the bookmark service
const mockHasRemoteChanges = vi.fn();
const mockLoadFromRemote = vi.fn();
const mockSaveToRemote = vi.fn();

vi.mock('../../src/lib/adapters/bookmark-service', () => ({
  createBookmarkService: () => ({
    getRoot: () => ({ categories: [] }),
    hasRemoteChanges: mockHasRemoteChanges,
    loadFromRemote: mockLoadFromRemote,
    saveToRemote: mockSaveToRemote,
    addCategory: vi.fn(() => ({ success: true })),
    getGistInfo: () => ({ gistId: 'test-gist' }),
  }),
}));

vi.mock('../../src/lib/shell/gist-sync', () => ({
  GistSyncShell: vi.fn(() => ({
    initialize: vi.fn(() => Promise.resolve({ success: true })),
  })),
}));

describe('BookmarkContext - Sync Conflict Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should accept onConflict callback in syncWithRemote', async () => {
    // Setup: no remote changes
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: false // no remote changes
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    const onConflict = vi.fn();
    
    // Wait for initialization
    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Call syncWithRemote with onConflict
    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Should not call onConflict when no remote changes
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('should call onConflict when there are remote changes and local is dirty', async () => {
    // Setup: remote has changes
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: true // remote has changes
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Make local dirty by adding a category
    await act(async () => {
      await result.current.addCategory('Test Category');
    });

    expect(result.current.isDirty).toBe(true);

    const onConflict = vi.fn();

    // Call syncWithRemote with onConflict
    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Should call onConflict with handlers
    expect(onConflict).toHaveBeenCalledWith({
      onLoadRemote: expect.any(Function),
      onSaveLocal: expect.any(Function),
    });
  });

  it('should load from remote when onLoadRemote handler is called', async () => {
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: true 
    });
    mockLoadFromRemote.mockResolvedValue({
      success: true,
      data: { categories: [{ name: 'Remote Category' }] }
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Make local dirty
    await act(async () => {
      await result.current.addCategory('Local Category');
    });

    let capturedHandlers: any;
    const onConflict = vi.fn((handlers) => {
      capturedHandlers = handlers;
    });

    // Trigger conflict
    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Call the onLoadRemote handler
    await act(async () => {
      await capturedHandlers.onLoadRemote();
    });

    expect(mockLoadFromRemote).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
  });

  it('should save to remote when onSaveLocal handler is called', async () => {
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: true 
    });
    mockSaveToRemote.mockResolvedValue({
      success: true,
      data: { gistId: 'test-gist', etag: 'new-etag' }
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Make local dirty
    await act(async () => {
      await result.current.addCategory('Local Category');
    });

    let capturedHandlers: any;
    const onConflict = vi.fn((handlers) => {
      capturedHandlers = handlers;
    });

    // Trigger conflict
    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Call the onSaveLocal handler
    await act(async () => {
      await capturedHandlers.onSaveLocal();
    });

    expect(mockSaveToRemote).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
  });

  it('should set error when no onConflict provided and conflict occurs', async () => {
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: true 
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Make local dirty
    await act(async () => {
      await result.current.addCategory('Local Category');
    });

    // Call syncWithRemote without onConflict
    await act(async () => {
      await result.current.syncWithRemote();
    });

    expect(result.current.error).toContain('Remote has changes');
  });

  it('should automatically load from remote when no local changes', async () => {
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: true 
    });
    mockLoadFromRemote.mockResolvedValue({
      success: true,
      data: { categories: [{ name: 'Remote Category' }] }
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Ensure not dirty
    expect(result.current.isDirty).toBe(false);

    const onConflict = vi.fn();

    // Call syncWithRemote
    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Should not call onConflict, should load automatically
    expect(onConflict).not.toHaveBeenCalled();
    expect(mockLoadFromRemote).toHaveBeenCalled();
  });

  it('should automatically save when local is dirty and no remote changes', async () => {
    mockHasRemoteChanges.mockResolvedValue({ 
      success: true, 
      data: false // no remote changes
    });
    mockSaveToRemote.mockResolvedValue({
      success: true,
      data: { gistId: 'test-gist', etag: 'new-etag' }
    });

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Make local dirty
    await act(async () => {
      await result.current.addCategory('Local Category');
    });

    const onConflict = vi.fn();

    // Call syncWithRemote
    await act(async () => {
      await result.current.syncWithRemote({ onConflict });
    });

    // Should not call onConflict, should save automatically
    expect(onConflict).not.toHaveBeenCalled();
    expect(mockSaveToRemote).toHaveBeenCalled();
  });

  it('should handle errors during sync', async () => {
    mockHasRemoteChanges.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => 
      useBookmarkContextProvider({
        accessToken: 'test-token',
      })
    );

    await waitFor(() => {
      expect(result.current.syncWithRemote).toBeDefined();
    });

    // Call syncWithRemote
    await act(async () => {
      try {
        await result.current.syncWithRemote();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toContain('Network error');
  });
});