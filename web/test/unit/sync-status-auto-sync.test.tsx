import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusWithActions } from '../../src/components/ui/SyncStatusWithActions.tsx';

// Mock the context
let mockBookmarkContext = {
  isDirty: false,
  isLoading: false,
  isSyncing: false,
  lastSyncAt: null,
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

describe('SyncStatusWithActions - Auto-sync UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to defaults
    mockBookmarkContext = {
      isDirty: false,
      isLoading: false,
      isSyncing: false,
      lastSyncAt: null,
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
  
  it('should show auto-syncing status when isSyncing is true', () => {
    mockBookmarkContext.isSyncing = true;
    mockBookmarkContext.isDirty = false;
    
    render(<SyncStatusWithActions />);
    
    // Should show syncing indicator - updated to match actual text in component
    expect(screen.getByText('Auto-syncing...')).toBeInTheDocument();
  });
  
  it('should indicate when data is being auto-synced', () => {
    mockBookmarkContext.isSyncing = true;
    mockBookmarkContext.isDirty = false;
    mockBookmarkContext.lastSyncAt = new Date();
    
    render(<SyncStatusWithActions />);
    
    // Look for sync status
    const syncStatus = screen.getByText('Auto-syncing...');
    expect(syncStatus).toBeInTheDocument();
    
    // Should have spinning animation class
    const spinningIcon = document.querySelector('.animate-spin');
    expect(spinningIcon).toBeInTheDocument();
  });
  
  it('should show last sync time when not actively syncing', () => {
    const lastSync = new Date();
    lastSync.setMinutes(lastSync.getMinutes() - 5); // 5 minutes ago
    
    mockBookmarkContext.isSyncing = false;
    mockBookmarkContext.isDirty = false;
    mockBookmarkContext.lastSyncAt = lastSync;
    
    render(<SyncStatusWithActions />);
    
    // Should show relative time
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
  });
  
  it('should show dirty state when local changes exist', () => {
    mockBookmarkContext.isSyncing = false;
    mockBookmarkContext.isDirty = true;
    mockBookmarkContext.lastSyncAt = new Date();
    
    render(<SyncStatusWithActions />);
    
    // Should indicate unsaved changes - updated to match actual text
    expect(screen.getByText('Changes pending')).toBeInTheDocument();
  });
  
  it('should distinguish between auto-sync and manual sync', () => {
    mockBookmarkContext.isSyncing = true;
    mockBookmarkContext.isDirty = false;
    mockBookmarkContext.isLoading = false; // Auto-sync doesn't set isLoading
    
    render(<SyncStatusWithActions />);
    
    // Should show auto-syncing status
    expect(screen.getByText('Auto-syncing...')).toBeInTheDocument();
  });
});