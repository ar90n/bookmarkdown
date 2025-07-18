import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';
import { SyncStatus } from '../../src/components/ui/SyncStatus';
import React from 'react';

// Mock the context
let mockBookmarkContext = {
  isDirty: false,
  isLoading: false,
  lastSyncAt: null,
  error: null,
  getGistInfo: () => ({ gistId: 'test-123', etag: 'abc123' }),
  clearError: vi.fn(),
  syncWithRemote: vi.fn(),
  loadFromRemote: vi.fn(),
  retryInitialization: vi.fn()
};

let mockAuthContext = {
  error: null,
  clearError: vi.fn()
};

vi.mock('../../src/contexts/AppProvider', () => ({
  useBookmarkContext: () => mockBookmarkContext,
  useAuthContext: () => mockAuthContext
}));

vi.mock('../../src/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    retrySync: vi.fn()
  })
}));

// Reset mock before each test
beforeEach(() => {
  mockBookmarkContext = {
    isDirty: false,
    isLoading: false,
    lastSyncAt: null,
    error: null,
    getGistInfo: () => ({ gistId: 'test-123', etag: 'abc123' }),
    clearError: vi.fn(),
    syncWithRemote: vi.fn(),
    loadFromRemote: vi.fn(),
    retryInitialization: vi.fn()
  };
  
  mockAuthContext = {
    error: null,
    clearError: vi.fn()
  };
});

describe('SyncStatus', () => {
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
  
  it('should show retry button when there is an error', () => {
    mockBookmarkContext.error = 'Failed to sync';
    
    render(<SyncStatus />);
    
    expect(screen.getByText(/Retry connection/i)).toBeInTheDocument();
  });
});