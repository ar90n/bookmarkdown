import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusWithActions } from '../../src/components/ui/SyncStatusWithActions';
import { useBookmarkContext, useDialogContext } from '../../src/contexts/AppProvider';
import { dialogStateRef } from '../../src/lib/context/providers/dialog-state-ref';

// Mock the contexts
vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: vi.fn(),
  useDialogContext: vi.fn()
}));

// Mock the time utility
vi.mock('../../src/lib/utils/time', () => ({
  formatRelativeTime: vi.fn().mockReturnValue('5 minutes ago')
}));

describe('SyncStatusWithActions - Conflict Dialog on Sync Button', () => {
  const mockBookmarkContext = {
    isDirty: false,
    isLoading: false,
    isSyncing: false,
    lastSyncAt: new Date(),
    error: null,
    getGistInfo: vi.fn().mockReturnValue({}),
    syncWithRemote: vi.fn(),
    isAutoSyncEnabled: vi.fn().mockReturnValue(true),
    loadFromRemote: vi.fn(),
    saveToRemote: vi.fn()
  };

  const mockDialogContext = {
    openSyncConflictDialog: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useBookmarkContext as any).mockReturnValue(mockBookmarkContext);
    (useDialogContext as any).mockReturnValue(mockDialogContext);
    dialogStateRef.hasUnresolvedConflict = false;
  });

  it('should show conflict dialog immediately when sync button is pressed during conflict', async () => {
    // Set up conflict state
    dialogStateRef.hasUnresolvedConflict = true;
    
    render(<SyncStatusWithActions />);
    
    // Click the sync button
    const syncButton = screen.getByRole('button', { name: /sync/i });
    fireEvent.click(syncButton);
    
    // Should open conflict dialog immediately without calling syncWithRemote
    expect(mockDialogContext.openSyncConflictDialog).toHaveBeenCalledTimes(1);
    expect(mockBookmarkContext.syncWithRemote).not.toHaveBeenCalled();
  });

  it('should provide correct handlers to conflict dialog', async () => {
    dialogStateRef.hasUnresolvedConflict = true;
    
    render(<SyncStatusWithActions />);
    
    // Click the sync button
    const syncButton = screen.getByRole('button', { name: /sync/i });
    fireEvent.click(syncButton);
    
    // Check the handlers passed to dialog
    const dialogCall = mockDialogContext.openSyncConflictDialog.mock.calls[0][0];
    expect(dialogCall).toHaveProperty('onLoadRemote');
    expect(dialogCall).toHaveProperty('onSaveLocal');
    
    // Test onLoadRemote handler
    await dialogCall.onLoadRemote();
    expect(mockBookmarkContext.loadFromRemote).toHaveBeenCalledTimes(1);
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false);
    
    // Reset and test onSaveLocal handler
    dialogStateRef.hasUnresolvedConflict = true;
    await dialogCall.onSaveLocal();
    expect(mockBookmarkContext.saveToRemote).toHaveBeenCalledTimes(1);
    expect(dialogStateRef.hasUnresolvedConflict).toBe(false);
  });

  it('should perform normal sync when no conflict exists', async () => {
    dialogStateRef.hasUnresolvedConflict = false;
    
    render(<SyncStatusWithActions />);
    
    // Click the sync button
    const syncButton = screen.getByRole('button', { name: /sync/i });
    fireEvent.click(syncButton);
    
    // Should call syncWithRemote, not open dialog
    expect(mockBookmarkContext.syncWithRemote).toHaveBeenCalledTimes(1);
    expect(mockDialogContext.openSyncConflictDialog).not.toHaveBeenCalled();
  });

  it('should show loading state during normal sync', async () => {
    dialogStateRef.hasUnresolvedConflict = false;
    
    // Make syncWithRemote return a promise that we can control
    let resolveSync: () => void;
    const syncPromise = new Promise<void>(resolve => {
      resolveSync = resolve;
    });
    mockBookmarkContext.syncWithRemote.mockReturnValue(syncPromise);
    
    render(<SyncStatusWithActions />);
    
    // Click the sync button
    const syncButton = screen.getByRole('button', { name: /sync/i });
    fireEvent.click(syncButton);
    
    // Should show syncing state
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    
    // Resolve the sync
    resolveSync!();
    await waitFor(() => {
      expect(screen.getByText('Sync')).toBeInTheDocument();
    });
  });
});