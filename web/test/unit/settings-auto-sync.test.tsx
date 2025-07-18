import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { SettingsPage } from '../../src/pages/SettingsPage';

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
  retryInitialization: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
  setError: vi.fn(),
  resetState: vi.fn(),
  clearGistId: vi.fn(),
  currentGistId: 'test-123',
  // Add auto-sync related methods
  isAutoSyncEnabled: vi.fn(() => false),
  setAutoSync: vi.fn()
};

let mockAuthContext = {
  isAuthenticated: true,
  user: { login: 'testuser', name: 'Test User' },
  tokens: { scopes: ['gist'] },
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn()
};

let mockDialogContext = {
  openConfirmDialog: vi.fn(),
  openSyncConflictDialog: vi.fn()
};

vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: () => mockBookmarkContext,
  useAuthContext: () => mockAuthContext,
  useDialogContext: () => mockDialogContext
}));

describe('SettingsPage - Auto-sync toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to defaults
    mockBookmarkContext.isAutoSyncEnabled = vi.fn(() => false);
    mockBookmarkContext.setAutoSync = vi.fn();
  });
  
  it('should show auto-sync toggle in sync settings', () => {
    render(<SettingsPage />);
    
    // Should show auto-sync toggle
    expect(screen.getByText('Auto-sync')).toBeInTheDocument();
    expect(screen.getByText(/Automatically sync changes/i)).toBeInTheDocument();
  });
  
  it('should reflect current auto-sync state', () => {
    mockBookmarkContext.isAutoSyncEnabled = vi.fn(() => true);
    
    render(<SettingsPage />);
    
    const toggle = screen.getByRole('checkbox', { name: /auto-sync/i });
    expect(toggle).toBeChecked();
  });
  
  it('should toggle auto-sync when clicked', () => {
    render(<SettingsPage />);
    
    const toggle = screen.getByRole('checkbox', { name: /auto-sync/i });
    expect(toggle).not.toBeChecked();
    
    // Click to enable
    fireEvent.click(toggle);
    expect(mockBookmarkContext.setAutoSync).toHaveBeenCalledWith(true);
  });
  
  it('should disable auto-sync when toggled off', () => {
    mockBookmarkContext.isAutoSyncEnabled = vi.fn(() => true);
    
    render(<SettingsPage />);
    
    const toggle = screen.getByRole('checkbox', { name: /auto-sync/i });
    expect(toggle).toBeChecked();
    
    // Click to disable
    fireEvent.click(toggle);
    expect(mockBookmarkContext.setAutoSync).toHaveBeenCalledWith(false);
  });
  
  it('should only show auto-sync toggle for V2', () => {
    // Remove V2 indicator
    mockBookmarkContext.getGistInfo = undefined;
    
    render(<SettingsPage />);
    
    // Should not show auto-sync toggle
    expect(screen.queryByText('Auto-sync')).not.toBeInTheDocument();
  });
});