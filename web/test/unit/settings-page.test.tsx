import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '../test-utils';
import { SettingsPage } from '../../src/pages/SettingsPage';
import { useAuthContext, useBookmarkContext, useDialogContext } from '../../src/contexts/AppProvider';

// Mock dependencies
vi.mock('../../src/contexts/AppProvider');
vi.mock('../../src/components/UI/Button', () => ({
  Button: ({ children, onClick, variant, className, disabled }: any) => (
    <button 
      onClick={onClick} 
      className={`${variant} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  )
}));
vi.mock('../../src/components/ui/SyncStatus', () => ({
  SyncStatus: () => <div data-testid="sync-status">Sync Status</div>
}));
vi.mock('@heroicons/react/24/outline', () => ({
  CloudArrowUpIcon: () => <span>CloudIcon</span>,
  DocumentDuplicateIcon: () => <span>DocumentIcon</span>,
  ArrowDownTrayIcon: () => <span>DownloadIcon</span>,
  ArrowUpTrayIcon: () => <span>UploadIcon</span>,
  TrashIcon: () => <span>TrashIcon</span>,
  InformationCircleIcon: () => <span>InfoIcon</span>,
  ArrowTopRightOnSquareIcon: () => <span>ExternalIcon</span>
}));

// Mock file download functions
const mockClick = vi.fn();
const mockRemove = vi.fn();
URL.createObjectURL = vi.fn(() => 'blob:test-url');
URL.revokeObjectURL = vi.fn();

describe('SettingsPage', () => {
  const mockAuthContext = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn()
  };

  const mockBookmarkContext = {
    exportData: vi.fn(),
    importData: vi.fn(),
    setError: vi.fn(),
    resetState: vi.fn(),
    clearGistId: vi.fn(),
    getGistInfo: vi.fn(() => ({ gistId: 'test-gist-id' })),
    isAutoSyncEnabled: vi.fn(() => true),
    setAutoSync: vi.fn(),
    syncWithRemote: vi.fn(),
    isLoading: false,
    currentGistId: 'test-gist-id'
  };

  const mockDialogContext = {
    openConfirmDialog: vi.fn(),
    openSyncConflictDialog: vi.fn(),
    openCreateGistDialog: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue(mockAuthContext);
    vi.mocked(useBookmarkContext).mockReturnValue(mockBookmarkContext);
    vi.mocked(useDialogContext).mockReturnValue(mockDialogContext);
    
    // Mock creating anchor elements for file downloads
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = originalCreateElement('a');
        Object.defineProperties(anchor, {
          click: { value: mockClick, writable: true },
          remove: { value: mockRemove, writable: true }
        });
        return anchor;
      }
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
    mockClick.mockClear();
    mockRemove.mockClear();
    vi.restoreAllMocks();
  });

  describe('Page Header', () => {
    it('should display page title and description', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your account and bookmark data')).toBeInTheDocument();
    });

    it('should show V2 indicator when using V2 sync', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Using V2 sync engine with etag-based version control')).toBeInTheDocument();
    });
  });

  describe('Account Section', () => {
    it('should show not connected when not authenticated', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Not connected')).toBeInTheDocument();
      expect(screen.getByText('Sign In with GitHub')).toBeInTheDocument();
    });

    it('should show connected status when authenticated', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
        user: {
          id: 123,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
          html_url: 'https://github.com/testuser',
          created_at: '2020-01-01',
          updated_at: '2023-01-01'
        },
        tokens: {
          accessToken: 'test-token',
          scopes: ['gist', 'repo'],
          expiresAt: undefined
        }
      });

      render(<SettingsPage />);

      expect(screen.getByText('Connected to GitHub')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('gist')).toBeInTheDocument();
      expect(screen.getByText('repo')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should handle login button click', () => {
      render(<SettingsPage />);

      fireEvent.click(screen.getByText('Sign In with GitHub'));

      expect(mockAuthContext.login).toHaveBeenCalled();
    });

    it('should handle logout button click', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });

      render(<SettingsPage />);

      fireEvent.click(screen.getByText('Sign Out'));

      expect(mockAuthContext.logout).toHaveBeenCalled();
    });
  });

  describe('Sync Status Section', () => {
    it('should show sync status when authenticated', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });

      render(<SettingsPage />);

      expect(screen.getByTestId('sync-status')).toBeInTheDocument();
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });

    it('should handle sync now button click', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });

      render(<SettingsPage />);

      fireEvent.click(screen.getByText('Sync Now'));

      expect(mockBookmarkContext.syncWithRemote).toHaveBeenCalledWith({
        onConflict: expect.any(Function)
      });
    });

    it('should show auto-sync toggle', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });

      render(<SettingsPage />);

      expect(screen.getByLabelText('Auto-sync')).toBeInTheDocument();
      expect(screen.getByText('Automatically sync changes to remote')).toBeInTheDocument();
    });

    it('should handle auto-sync toggle', () => {
      // Make sure setAutoSync is properly mocked
      const setAutoSyncMock = vi.fn();
      vi.mocked(useBookmarkContext).mockReturnValue({
        ...mockBookmarkContext,
        setAutoSync: setAutoSyncMock
      });
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });

      render(<SettingsPage />);

      const toggle = screen.getByLabelText('Auto-sync');
      fireEvent.click(toggle);

      expect(setAutoSyncMock).toHaveBeenCalledWith(false);
    });

    it('should disable sync button when loading', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });
      vi.mocked(useBookmarkContext).mockReturnValue({
        ...mockBookmarkContext,
        isLoading: true
      });

      render(<SettingsPage />);

      expect(screen.getByText('Sync Now')).toBeDisabled();
    });
  });

  describe('Export Operations', () => {
    it('should export as markdown', async () => {
      mockBookmarkContext.exportData.mockResolvedValue('# Bookmarks\n\nTest content');

      render(<SettingsPage />);

      const exportButton = screen.getByText('Export as Markdown');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockBookmarkContext.exportData).toHaveBeenCalledWith('markdown');
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });

    it('should export as JSON', async () => {
      mockBookmarkContext.exportData.mockResolvedValue('{"categories":[]}');

      render(<SettingsPage />);

      const exportButton = screen.getByText('Export as JSON');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockBookmarkContext.exportData).toHaveBeenCalledWith('json');
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });

    it('should handle export errors', async () => {
      mockBookmarkContext.exportData.mockRejectedValue(new Error('Export failed'));

      render(<SettingsPage />);

      fireEvent.click(screen.getByText('Export as Markdown'));

      await waitFor(() => {
        expect(mockBookmarkContext.setError).toHaveBeenCalledWith('Failed to export bookmarks');
      });
    });
  });

  describe('Import Operations', () => {
    it('should show import section', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Supports .md and .json files')).toBeInTheDocument();
    });

    it('should handle file import', async () => {
      const fileContent = '# Bookmarks\n\nTest content';
      const file = new File([fileContent], 'bookmarks.md', { type: 'text/markdown' });

      render(<SettingsPage />);

      const importButton = screen.getByText('Import from File');
      const fileInput = importButton.closest('label')?.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        result: fileContent
      };
      
      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        setTimeout(() => {
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: fileContent } });
          }
        }, 0);
        return mockFileReader as any;
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockBookmarkContext.importData).toHaveBeenCalledWith(fileContent, 'markdown');
      });
    });

    it('should handle import errors', async () => {
      const fileContent = 'invalid content';
      const file = new File([fileContent], 'bookmarks.json', { type: 'application/json' });

      mockBookmarkContext.importData.mockRejectedValue(new Error('Invalid format'));

      render(<SettingsPage />);

      const importButton = screen.getByText('Import from File');
      const fileInput = importButton.closest('label')?.querySelector('input[type="file"]') as HTMLInputElement;
      
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as any,
        result: fileContent
      };
      
      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        setTimeout(() => {
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: fileContent } });
          }
        }, 0);
        return mockFileReader as any;
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockBookmarkContext.setError).toHaveBeenCalledWith('Failed to import bookmarks.json');
      });
    });
  });

  describe('Data Management', () => {
    it('should show gist ID in sync status section', () => {
      vi.mocked(useAuthContext).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true
      });

      render(<SettingsPage />);

      // Sync Status is in the h2 element
      expect(screen.getByRole('heading', { name: 'Sync Status' })).toBeInTheDocument();
      expect(screen.getByText('test-gist-id')).toBeInTheDocument();
    });

    it('should handle clear gist ID', async () => {
      mockDialogContext.openConfirmDialog.mockResolvedValue(true);

      render(<SettingsPage />);

      fireEvent.click(screen.getByText('Clear'));

      await waitFor(() => {
        expect(mockDialogContext.openConfirmDialog).toHaveBeenCalledWith({
          title: 'Clear Gist Configuration',
          message: 'This will unlink your bookmarks from the current Gist. You can create a new Gist or link to a different one later.',
          confirmText: 'Clear',
          confirmVariant: 'danger'
        });
        expect(mockBookmarkContext.clearGistId).toHaveBeenCalled();
      });
    });

    it('should handle reset all data', async () => {
      mockDialogContext.openConfirmDialog.mockResolvedValue(true);

      render(<SettingsPage />);

      // Find the Reset button in the Danger Zone section
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockDialogContext.openConfirmDialog).toHaveBeenCalledWith({
          title: 'Reset All Data',
          message: 'Are you sure you want to reset all data? This action cannot be undone.',
          confirmText: 'Reset',
          confirmVariant: 'danger'
        });
        expect(mockBookmarkContext.resetState).toHaveBeenCalled();
        expect(mockBookmarkContext.clearGistId).toHaveBeenCalled();
      });
    });

    it('should not reset data when cancelled', async () => {
      mockDialogContext.openConfirmDialog.mockResolvedValue(false);

      render(<SettingsPage />);

      // Find the Reset button in the Danger Zone section
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockDialogContext.openConfirmDialog).toHaveBeenCalled();
        expect(mockBookmarkContext.resetState).not.toHaveBeenCalled();
      });
    });
  });

});