import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('SyncStatusWithActions - AutoSync Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBookmarkContext as any).mockReturnValue(mockBookmarkContext);
    (useDialogContext as any).mockReturnValue(mockDialogContext);
    dialogStateRef.hasUnresolvedConflict = false;
  });

  it('should display "Auto-sync: ON" when auto-sync is enabled', () => {
    render(<SyncStatusWithActions />);
    
    expect(screen.getByText('Auto-sync: ON')).toBeInTheDocument();
    const autoSyncText = screen.getByText('Auto-sync: ON');
    expect(autoSyncText.className).toContain('text-green-600');
  });

  it('should display "Auto-sync: OFF" when auto-sync is disabled', () => {
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(false);
    
    render(<SyncStatusWithActions />);
    
    expect(screen.getByText('Auto-sync: OFF')).toBeInTheDocument();
    const autoSyncText = screen.getByText('Auto-sync: OFF');
    expect(autoSyncText.className).toContain('text-gray-500');
  });

  it('should display "Auto-sync: Paused" when there is an unresolved conflict', () => {
    // Auto-sync must be enabled for it to be "paused" due to conflict
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(true);
    dialogStateRef.hasUnresolvedConflict = true;
    
    render(<SyncStatusWithActions />);
    
    expect(screen.getByText('Auto-sync: Paused')).toBeInTheDocument();
    const autoSyncText = screen.getByText('Auto-sync: Paused');
    expect(autoSyncText.className).toContain('text-yellow-600');
  });

  it('should show different sync status colors based on auto-sync state', () => {
    // When auto-sync is OFF and synced
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(false);
    const { rerender } = render(<SyncStatusWithActions />);
    
    let syncedText = screen.getByText('Synced');
    expect(syncedText.className).toContain('text-gray-600');
    
    // When auto-sync is ON and synced
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(true);
    rerender(<SyncStatusWithActions />);
    
    syncedText = screen.getByText('Synced');
    expect(syncedText.className).toContain('text-green-600');
  });

  it('should show orange color for pending changes when auto-sync is OFF', () => {
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(false);
    mockBookmarkContext.isDirty = true;
    
    render(<SyncStatusWithActions />);
    
    const pendingText = screen.getByText('Changes pending');
    expect(pendingText.className).toContain('text-orange-600');
  });

  it('should show yellow color for pending changes when auto-sync is ON', () => {
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(true);
    mockBookmarkContext.isDirty = true;
    
    render(<SyncStatusWithActions />);
    
    const pendingText = screen.getByText('Changes pending');
    expect(pendingText.className).toContain('text-yellow-600');
  });

  it('should show pause icon when auto-sync is paused due to conflict', () => {
    // Auto-sync must be enabled for it to be "paused" due to conflict
    mockBookmarkContext.isAutoSyncEnabled.mockReturnValue(true);
    dialogStateRef.hasUnresolvedConflict = true;
    
    render(<SyncStatusWithActions />);
    
    // Check for PauseCircleIcon by checking the text color of the icon
    const statusContainer = screen.getByText('Auto-sync paused').closest('div')?.parentElement;
    const svgIcon = statusContainer?.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
    expect(svgIcon?.getAttribute('class')).toContain('text-yellow-600');
    
    // Also check for the paused status message
    expect(screen.getByText('Auto-sync paused')).toBeInTheDocument();
  });
});