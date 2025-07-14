import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncConflictDialog } from '../../src/components/Dialogs/SyncConflictDialog';

describe('SyncConflictDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnLoadRemote = vi.fn();
  const mockOnSaveLocal = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onLoadRemote: mockOnLoadRemote,
    onSaveLocal: mockOnSaveLocal,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<SyncConflictDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Sync Conflict Detected')).not.toBeInTheDocument();
  });

  it('should render dialog with correct title and message when open', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    expect(screen.getByText('Sync Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText('Both local and remote have changes. Choose how to resolve:')).toBeInTheDocument();
  });

  it('should display all three options', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    expect(screen.getByText('Continue Editing')).toBeInTheDocument();
    expect(screen.getByText('Keep your local changes and resolve the conflict later')).toBeInTheDocument();
    
    expect(screen.getByText('Load Remote Version')).toBeInTheDocument();
    expect(screen.getByText(/Discard your local changes/)).toBeInTheDocument();
    
    expect(screen.getByText('Save Your Version')).toBeInTheDocument();
    expect(screen.getByText(/Overwrite remote/)).toBeInTheDocument();
  });

  it('should call onClose when Continue Editing is clicked', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    const continueButton = screen.getByText('Continue Editing').closest('button');
    fireEvent.click(continueButton!);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnLoadRemote).not.toHaveBeenCalled();
    expect(mockOnSaveLocal).not.toHaveBeenCalled();
  });

  it('should call onLoadRemote when Load Remote Version is clicked', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    const loadButton = screen.getByText('Load Remote Version').closest('button');
    fireEvent.click(loadButton!);
    
    expect(mockOnLoadRemote).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSaveLocal).not.toHaveBeenCalled();
  });

  it('should call onSaveLocal when Save Your Version is clicked', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    const saveButton = screen.getByText('Save Your Version').closest('button');
    fireEvent.click(saveButton!);
    
    expect(mockOnSaveLocal).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnLoadRemote).not.toHaveBeenCalled();
  });

  it('should display warning text for destructive actions', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Check for warning about discarding local changes
    expect(screen.getByText('Discard your local changes')).toBeInTheDocument();
    expect(screen.getByText('Discard your local changes').className).toContain('text-red-600');
    
    // Check for warning about overwriting remote
    expect(screen.getByText('Overwrite remote')).toBeInTheDocument();
    expect(screen.getByText('Overwrite remote').className).toContain('text-yellow-600');
  });

  it('should display helpful tip', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    expect(screen.getByText(/If you're unsure, choose "Continue Editing"/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Check that buttons are properly labeled
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    
    // Check for proper focus management
    const dialog = screen.getByText('Sync Conflict Detected').closest('div[class*="bg-white"]');
    expect(dialog).toBeInTheDocument();
  });
});