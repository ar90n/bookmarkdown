import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { SyncStatusWithActions } from '../../src/components/ui/SyncStatusWithActions';

// Mock the context
let mockBookmarkContext = {
  isDirty: false,
  isLoading: false,
  isSyncing: false,
  lastSyncAt: new Date(),
  error: null,
  getGistInfo: () => ({ gistId: 'test-123', etag: 'abc123' }),
  clearError: vi.fn(),
  syncWithRemote: vi.fn(),
  loadFromRemote: vi.fn(),
  saveToRemote: vi.fn(),
  retryInitialization: vi.fn(),
  isAutoSyncEnabled: () => true
};

let mockDialogContext = {
  openSyncConflictDialog: vi.fn()
};

vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: () => mockBookmarkContext,
  useDialogContext: () => mockDialogContext
}));

describe('SyncStatusWithActions - Always enabled sync button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to defaults
    mockBookmarkContext = {
      isDirty: false,
      isLoading: false,
      isSyncing: false,
      lastSyncAt: new Date(),
      error: null,
      getGistInfo: () => ({ gistId: 'test-123', etag: 'abc123' }),
      clearError: vi.fn(),
      syncWithRemote: vi.fn(),
      loadFromRemote: vi.fn(),
      saveToRemote: vi.fn(),
      retryInitialization: vi.fn(),
      isAutoSyncEnabled: () => true
    };
  });
  
  it('should allow sync button to be clicked when already synced', () => {
    // Setup: synced state with no changes
    mockBookmarkContext.isDirty = false;
    mockBookmarkContext.error = null;
    mockBookmarkContext.lastSyncAt = new Date();
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByRole('button', { name: /sync/i });
    
    // Button should be enabled
    expect(syncButton).not.toBeDisabled();
    
    // Click should work
    fireEvent.click(syncButton);
    expect(mockBookmarkContext.syncWithRemote).toHaveBeenCalled();
  });
  
  it('should still disable sync button when syncing is in progress', () => {
    // Setup: syncing in progress
    mockBookmarkContext.isSyncing = true;
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByRole('button', { name: /syncing/i });
    
    // Button should be disabled during sync
    expect(syncButton).toBeDisabled();
  });
  
  it('should still disable sync button when loading', () => {
    // Setup: loading state
    mockBookmarkContext.isLoading = true;
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByRole('button', { name: /sync/i });
    
    // Button should be disabled during loading
    expect(syncButton).toBeDisabled();
  });
  
  it('should enable sync button even with no dirty changes', () => {
    // Setup: clean state
    mockBookmarkContext.isDirty = false;
    mockBookmarkContext.error = null;
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByRole('button', { name: /sync/i });
    
    // Button should be enabled
    expect(syncButton).not.toBeDisabled();
    
    // Should have appropriate styling (not grayed out)
    expect(syncButton.className).toContain('bg-primary-600');
    expect(syncButton.className).not.toContain('bg-gray-100');
  });
  
  it('should have appropriate tooltip when already synced', () => {
    // Setup: synced state
    mockBookmarkContext.isDirty = false;
    mockBookmarkContext.error = null;
    mockBookmarkContext.lastSyncAt = new Date();
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByRole('button', { name: /sync/i });
    
    // Should have helpful tooltip
    expect(syncButton).toHaveAttribute('title', 'Sync with remote');
  });
});