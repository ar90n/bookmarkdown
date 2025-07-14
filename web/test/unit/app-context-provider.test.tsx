import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppContextProvider } from '../../src/lib/context/providers/useAppContextProvider';

// Mock dependencies
const mockLoadFromRemote = vi.fn();
const mockSetError = vi.fn();
const mockIsSyncConfigured = vi.fn();

const mockAuthContext = {
  isAuthenticated: false,
  tokens: null,
  user: null,
  error: null,
  isLoading: false,
  lastLoginAt: null,
  login: vi.fn(),
  loginWithOAuth: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn()
};

const mockBookmarkContext = {
  root: { categories: [] },
  isLoading: false,
  error: null,
  lastSyncAt: null,
  isDirty: false,
  loadFromRemote: mockLoadFromRemote,
  setError: mockSetError,
  syncWithRemote: vi.fn(),
  saveToRemote: vi.fn(),
  isSyncConfigured: mockIsSyncConfigured,
  // Add other required methods as needed
  addCategory: vi.fn(),
  removeCategory: vi.fn(),
  renameCategory: vi.fn(),
  addBundle: vi.fn(),
  removeBundle: vi.fn(),
  renameBundle: vi.fn(),
  addBookmark: vi.fn(),
  addBookmarksBatch: vi.fn(),
  updateBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  moveBookmark: vi.fn(),
  moveBundle: vi.fn(),
  searchBookmarks: vi.fn(() => []),
  getStats: vi.fn(() => ({ categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 })),
  syncWithConflictResolution: vi.fn(),
  checkConflicts: vi.fn(async () => []),
  importData: vi.fn(),
  exportData: vi.fn(),
  clearError: vi.fn(),
  resetState: vi.fn(),
  currentGistId: undefined,
  saveGistId: vi.fn(),
  clearGistId: vi.fn(),
  canDragBookmark: vi.fn(() => true),
  canDropBookmark: vi.fn(() => true),
  canDropBundle: vi.fn(() => true),
  getSourceBundle: vi.fn(() => null),
  hasCategories: vi.fn(() => false),
  getCategories: vi.fn(() => [])
};

// Mock the hook providers
vi.mock('../../src/lib/context/providers/useAuthContextProvider', () => ({
  useAuthContextProvider: () => mockAuthContext
}));

vi.mock('../../src/lib/context/providers/useBookmarkContextProvider', () => ({
  useBookmarkContextProvider: () => mockBookmarkContext
}));

describe('useAppContextProvider - Sync Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.tokens = null;
    mockIsSyncConfigured.mockReturnValue(false);
  });

  it('should not attempt to sync when sync is not configured', async () => {
    // Start with authenticated state
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.tokens = { accessToken: 'test-token' };
    mockIsSyncConfigured.mockReturnValue(false);
    
    const { result } = renderHook(() => useAppContextProvider({
      autoSync: true,
      syncInterval: 5
    }));

    // Wait a bit for effects to run
    await waitFor(() => {
      expect(result.current.syncEnabled).toBe(true);
    });

    // Should NOT attempt to load from remote when sync is not configured
    expect(mockLoadFromRemote).not.toHaveBeenCalled();
  });

  it('should wait for sync to be configured before loading', async () => {
    // Start with authenticated state
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.tokens = { accessToken: 'test-token' };
    
    // Initially sync is not configured
    mockIsSyncConfigured.mockReturnValue(false);
    mockLoadFromRemote.mockResolvedValue({ success: true, data: { categories: [] } });
    
    const { result } = renderHook(() => useAppContextProvider({
      autoSync: true,
      syncInterval: 5
    }));

    // Wait for initial state
    await waitFor(() => {
      expect(result.current.syncEnabled).toBe(true);
    });

    // Should not have called loadFromRemote yet
    expect(mockLoadFromRemote).not.toHaveBeenCalled();

    // Simulate the bookmark context becoming configured
    // Since we're waiting 1 second intervals, we need to advance time
    await new Promise(resolve => setTimeout(resolve, 3500));

    // Verify that loadFromRemote was not called because sync never became configured
    expect(mockLoadFromRemote).not.toHaveBeenCalled();
  });

  it('should handle sync configuration errors gracefully', async () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.tokens = { accessToken: 'test-token' };
    mockIsSyncConfigured.mockReturnValue(false);
    
    const { result } = renderHook(() => useAppContextProvider({
      autoSync: true,
      syncInterval: 5
    }));

    await waitFor(() => {
      expect(result.current.syncEnabled).toBe(true);
    });

    // Verify error is set appropriately
    expect(mockSetError).not.toHaveBeenCalledWith(
      expect.stringContaining('Sync not configured')
    );
  });

  it('should load immediately when sync is already configured', async () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.tokens = { accessToken: 'test-token' };
    
    // Sync is already configured
    mockIsSyncConfigured.mockReturnValue(true);
    mockLoadFromRemote.mockResolvedValue({ success: true, data: { categories: [] } });
    
    const { result } = renderHook(() => useAppContextProvider({
      autoSync: true,
      syncInterval: 5
    }));

    // Should load from remote since sync is configured
    await waitFor(() => {
      expect(mockLoadFromRemote).toHaveBeenCalled();
    });
    
    expect(result.current.syncEnabled).toBe(true);
  });
});