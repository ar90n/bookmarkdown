import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusWithActions } from '../../src/components/ui/SyncStatusWithActions';

// Mock the contexts
const mockSyncWithRemote = vi.fn();
const mockOpenSyncConflictDialog = vi.fn();

const mockBookmarkContext = {
  isDirty: false,
  isLoading: false,
  lastSyncAt: new Date(),
  error: null,
  getGistInfo: () => ({ etag: 'abc123' }),
  syncWithRemote: mockSyncWithRemote,
};

const mockDialogContext = {
  openSyncConflictDialog: mockOpenSyncConflictDialog,
};

vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: vi.fn(() => mockBookmarkContext),
  useDialogContext: vi.fn(() => mockDialogContext),
}));

describe('SyncStatusWithActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('should call syncWithRemote with conflict handler when sync is clicked', async () => {
    // Enable sync button by making it dirty
    mockBookmarkContext.isDirty = true;
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByText('Sync');
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(mockSyncWithRemote).toHaveBeenCalledWith({
        onConflict: expect.any(Function),
      });
    });
    
    // Reset
    mockBookmarkContext.isDirty = false;
  });

  it('should open sync conflict dialog when conflict handler is called', async () => {
    // Enable sync button
    mockBookmarkContext.isDirty = true;
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByText('Sync');
    fireEvent.click(syncButton);
    
    await waitFor(() => {
      expect(mockSyncWithRemote).toHaveBeenCalled();
    });
    
    // Get the onConflict handler that was passed to syncWithRemote
    const onConflictHandler = mockSyncWithRemote.mock.calls[0][0].onConflict;
    
    // Call the handler with mock handlers
    const mockHandlers = {
      onLoadRemote: vi.fn(),
      onSaveLocal: vi.fn(),
    };
    onConflictHandler(mockHandlers);
    
    expect(mockOpenSyncConflictDialog).toHaveBeenCalledWith(mockHandlers);
    
    // Reset
    mockBookmarkContext.isDirty = false;
  });

  it('should show sync status correctly', () => {
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
    
    // Reset for other tests
    mockBookmarkContext.error = null;
  });

  it('should disable sync button when already synced and no changes', () => {
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByText('Sync').closest('button');
    expect(syncButton).toHaveAttribute('disabled');
  });

  it('should enable sync button when there are changes', () => {
    mockBookmarkContext.isDirty = true;
    
    render(<SyncStatusWithActions />);
    
    const syncButton = screen.getByText('Sync').closest('button');
    expect(syncButton).not.toHaveAttribute('disabled');
    
    // Reset
    mockBookmarkContext.isDirty = false;
  });

  it('should show last sync time when available', () => {
    // Mock formatRelativeTime
    vi.mock('../../src/lib/utils/time', () => ({
      formatRelativeTime: vi.fn(() => '5 minutes ago')
    }));
    
    render(<SyncStatusWithActions />);
    
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    expect(screen.getByTitle(mockBookmarkContext.lastSyncAt.toLocaleString())).toBeInTheDocument();
  });

  it('should not show actions when showActions is false', () => {
    render(<SyncStatusWithActions showActions={false} />);
    
    expect(screen.queryByText('Sync')).not.toBeInTheDocument();
  });
});