import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SettingsPage } from '../../src/pages/SettingsPage';

// Mock all dependencies
vi.mock('../../src/contexts/AppProvider', () => ({
  useAuthContext: () => ({
    user: null,
    tokens: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn()
  }),
  useBookmarkContext: () => ({
    exportData: vi.fn(() => Promise.resolve('data')),
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
  }),
  useDialogContext: () => ({
    openConfirmDialog: vi.fn(),
    openSyncConflictDialog: vi.fn(),
    openCreateGistDialog: vi.fn()
  })
}));

vi.mock('../../../web/src/components/UI/Button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  )
}));

vi.mock('../../../web/src/components/ui/SyncStatus', () => ({
  SyncStatus: () => <div>Sync Status</div>
}));

vi.mock('@heroicons/react/24/outline', () => ({
  CloudArrowUpIcon: () => null,
  DocumentDuplicateIcon: () => null,
  ArrowDownTrayIcon: () => null,
  ArrowUpTrayIcon: () => null,
  TrashIcon: () => null,
  InformationCircleIcon: () => null,
  ArrowTopRightOnSquareIcon: () => null
}));

describe('SettingsPage - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock DOM APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should render without crashing', () => {
    const { container } = render(<SettingsPage />);
    expect(container).toBeTruthy();
  });

  it('should display page title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should display page description', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Manage your account and bookmark data')).toBeInTheDocument();
  });

  it('should show V2 indicator', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Using V2 sync engine with etag-based version control')).toBeInTheDocument();
  });

  it('should show authentication status', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('should show sign in button when not authenticated', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Sign In with GitHub')).toBeInTheDocument();
  });

  it('should show export buttons', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Export as Markdown')).toBeInTheDocument();
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
  });

  it('should show import section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Import from File')).toBeInTheDocument();
  });

  it('should show gist configuration', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Clear Gist Configuration')).toBeInTheDocument();
    // The gist ID is shown in a different component when authenticated
  });

  it('should show data management section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Reset All Data')).toBeInTheDocument();
  });
});