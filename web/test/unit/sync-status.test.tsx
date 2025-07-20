import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { SyncStatus } from '../../src/components/ui/SyncStatus';
import { SyncStatusWithActions } from '../../src/components/ui/SyncStatusWithActions';
import { dialogStateRef } from '../../src/lib/context/providers/dialog-state-ref';
import React from 'react';

// Mock the contexts
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

let mockAuthContext = {
  error: null,
  clearError: vi.fn()
};

let mockDialogContext = {
  openSyncConflictDialog: vi.fn()
};

vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: () => mockBookmarkContext,
  useAuthContext: () => mockAuthContext,
  useDialogContext: () => mockDialogContext
}));

vi.mock('../../src/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    retrySync: vi.fn()
  })
}));

// Mock the time utility
vi.mock('../../src/lib/utils/time', () => ({
  formatRelativeTime: vi.fn((date) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  })
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  
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
  
  mockAuthContext = {
    error: null,
    clearError: vi.fn()
  };
  
  mockDialogContext = {
    openSyncConflictDialog: vi.fn()
  };
  
  dialogStateRef.hasUnresolvedConflict = false;
});

describe('SyncStatus Component', () => {
  describe('Basic Status Display', () => {
    it('should show synced status when not dirty', () => {
      mockBookmarkContext.isDirty = false;
      mockBookmarkContext.lastSyncAt = new Date();
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/Synced/i)).toBeInTheDocument();
      expect(screen.getByTestId('sync-icon')).toHaveClass('text-green-600');
    });
    
    it('should show pending changes when dirty', () => {
      mockBookmarkContext.isDirty = true;
      mockBookmarkContext.lastSyncAt = new Date();
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/Changes pending/i)).toBeInTheDocument();
      expect(screen.getByTestId('sync-icon')).toHaveClass('text-yellow-600');
    });
    
    it('should show syncing when loading', () => {
      mockBookmarkContext.isLoading = true;
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/Syncing/i)).toBeInTheDocument();
      expect(screen.getByTestId('sync-icon')).toHaveClass('animate-spin');
    });
    
    it('should show error state', () => {
      mockBookmarkContext.error = 'Network error';
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/Sync error/i)).toBeInTheDocument();
      expect(screen.getByTestId('sync-icon')).toHaveClass('text-red-600');
    });
    
    it('should show never synced state', () => {
      mockBookmarkContext.isDirty = false;
      mockBookmarkContext.lastSyncAt = null;
      mockBookmarkContext.error = null;
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/Not synced/i)).toBeInTheDocument();
      expect(screen.getByTestId('sync-icon')).toHaveClass('text-gray-400');
    });
  });

  describe('Time Formatting and Metadata', () => {
    it('should format last sync time', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      mockBookmarkContext.lastSyncAt = fiveMinutesAgo;
      mockBookmarkContext.isDirty = false;
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
    });
    
    it('should show etag info in tooltip', () => {
      mockBookmarkContext.getGistInfo = () => ({ gistId: 'test-123', etag: 'abc123' });
      
      render(<SyncStatus />);
      
      const statusElement = screen.getByTestId('sync-status');
      expect(statusElement).toHaveAttribute('title', expect.stringContaining('abc123'));
    });
  });

  describe('Error Handling', () => {
    it('should show retry button when there is an error', () => {
      mockBookmarkContext.error = 'Failed to sync';
      
      render(<SyncStatus />);
      
      expect(screen.getByText(/Retry connection/i)).toBeInTheDocument();
    });
  });
});

describe('SyncStatusWithActions Component', () => {
  describe('Component Rendering', () => {
    it('should render sync button', () => {
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Sync')).toBeInTheDocument();
    });

    it('should NOT render Load button', () => {
      render(<SyncStatusWithActions />);
      
      expect(screen.queryByText('Load')).not.toBeInTheDocument();
    });

    it('should NOT render Save button', () => {
      render(<SyncStatusWithActions />);
      
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should not show actions when showActions is false', () => {
      render(<SyncStatusWithActions showActions={false} />);
      
      expect(screen.queryByText('Sync')).not.toBeInTheDocument();
    });
  });

  describe('Sync Functionality', () => {
    it('should call syncWithRemote with conflict handler when sync is clicked', async () => {
      mockBookmarkContext.isDirty = true;
      
      render(<SyncStatusWithActions />);
      
      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(mockBookmarkContext.syncWithRemote).toHaveBeenCalledWith({
          onConflict: expect.any(Function),
        });
      });
    });

    it('should open sync conflict dialog when conflict handler is called', async () => {
      mockBookmarkContext.isDirty = true;
      
      render(<SyncStatusWithActions />);
      
      const syncButton = screen.getByText('Sync');
      fireEvent.click(syncButton);
      
      await waitFor(() => {
        expect(mockBookmarkContext.syncWithRemote).toHaveBeenCalled();
      });
      
      const onConflictHandler = mockBookmarkContext.syncWithRemote.mock.calls[0][0].onConflict;
      const mockHandlers = {
        onLoadRemote: vi.fn(),
        onSaveLocal: vi.fn(),
      };
      onConflictHandler(mockHandlers);
      
      expect(mockDialogContext.openSyncConflictDialog).toHaveBeenCalledWith(mockHandlers);
    });

    it('should enable sync button even when already synced', () => {
      render(<SyncStatusWithActions />);
      
      const syncButton = screen.getByText('Sync').closest('button');
      expect(syncButton).not.toHaveAttribute('disabled');
    });
  });

  describe('Status Display', () => {
    it('should show sync status correctly', () => {
      // Start with a synced state
      mockBookmarkContext.lastSyncAt = new Date();
      const { rerender } = render(<SyncStatusWithActions />);
      
      // Test synced state
      expect(screen.getByText('Synced')).toBeInTheDocument();
      
      // Test with dirty state
      mockBookmarkContext.isDirty = true;
      rerender(<SyncStatusWithActions />);
      expect(screen.getByText('Changes pending')).toBeInTheDocument();
      
      // Test with error state
      mockBookmarkContext.isDirty = false;
      mockBookmarkContext.error = 'Network error';
      rerender(<SyncStatusWithActions />);
      expect(screen.getByText('Sync error')).toBeInTheDocument();
    });

    it('should show last sync time when available', () => {
      const lastSync = new Date();
      lastSync.setMinutes(lastSync.getMinutes() - 5);
      mockBookmarkContext.lastSyncAt = lastSync;
      
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
      expect(screen.getByTitle(mockBookmarkContext.lastSyncAt.toLocaleString())).toBeInTheDocument();
    });
  });

  describe('Auto-sync Features', () => {
    it('should show auto-syncing status when isSyncing is true', () => {
      mockBookmarkContext.isSyncing = true;
      mockBookmarkContext.isDirty = false;
      
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Auto-syncing...')).toBeInTheDocument();
    });
    
    it('should indicate when data is being auto-synced with animation', () => {
      mockBookmarkContext.isSyncing = true;
      mockBookmarkContext.isDirty = false;
      mockBookmarkContext.lastSyncAt = new Date();
      
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Auto-syncing...')).toBeInTheDocument();
      const spinningIcon = document.querySelector('.animate-spin');
      expect(spinningIcon).toBeInTheDocument();
    });

    it('should display "Auto-sync: ON" when auto-sync is enabled', () => {
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Auto-sync: ON')).toBeInTheDocument();
      const autoSyncText = screen.getByText('Auto-sync: ON');
      expect(autoSyncText.className).toContain('text-green-600');
    });

    it('should display "Auto-sync: OFF" when auto-sync is disabled', () => {
      mockBookmarkContext.isAutoSyncEnabled = () => false;
      
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Auto-sync: OFF')).toBeInTheDocument();
      const autoSyncText = screen.getByText('Auto-sync: OFF');
      expect(autoSyncText.className).toContain('text-gray-500');
    });

    it('should display "Auto-sync: Paused" when there is an unresolved conflict', () => {
      mockBookmarkContext.isAutoSyncEnabled = () => true;
      dialogStateRef.hasUnresolvedConflict = true;
      
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Auto-sync: Paused')).toBeInTheDocument();
      const autoSyncText = screen.getByText('Auto-sync: Paused');
      expect(autoSyncText.className).toContain('text-yellow-600');
    });

    it('should show pause icon when auto-sync is paused due to conflict', () => {
      mockBookmarkContext.isAutoSyncEnabled = () => true;
      dialogStateRef.hasUnresolvedConflict = true;
      
      render(<SyncStatusWithActions />);
      
      expect(screen.getByText('Auto-sync paused')).toBeInTheDocument();
      const statusContainer = screen.getByText('Auto-sync paused').closest('div')?.parentElement;
      const svgIcon = statusContainer?.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon?.getAttribute('class')).toContain('text-yellow-600');
    });
  });

  describe('Auto-sync Status Colors', () => {
    it('should show different sync status colors based on auto-sync state', () => {
      // Set lastSyncAt so status shows "Synced"
      mockBookmarkContext.lastSyncAt = new Date();
      
      // When auto-sync is OFF and synced
      mockBookmarkContext.isAutoSyncEnabled = () => false;
      const { rerender } = render(<SyncStatusWithActions />);
      
      let syncedText = screen.getByText('Synced');
      expect(syncedText.className).toContain('text-gray-600');
      
      // When auto-sync is ON and synced
      mockBookmarkContext.isAutoSyncEnabled = () => true;
      rerender(<SyncStatusWithActions />);
      
      syncedText = screen.getByText('Synced');
      expect(syncedText.className).toContain('text-green-600');
    });

    it('should show orange color for pending changes when auto-sync is OFF', () => {
      mockBookmarkContext.isAutoSyncEnabled = () => false;
      mockBookmarkContext.isDirty = true;
      
      render(<SyncStatusWithActions />);
      
      const pendingText = screen.getByText('Changes pending');
      expect(pendingText.className).toContain('text-orange-600');
    });

    it('should show yellow color for pending changes when auto-sync is ON', () => {
      mockBookmarkContext.isAutoSyncEnabled = () => true;
      mockBookmarkContext.isDirty = true;
      
      render(<SyncStatusWithActions />);
      
      const pendingText = screen.getByText('Changes pending');
      expect(pendingText.className).toContain('text-yellow-600');
    });
  });
});