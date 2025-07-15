import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncConflictDialog } from '../../src/components/Dialogs/SyncConflictDialog';

describe('SyncConflictDialog - Text Updates', () => {
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

  it('should explain that auto-sync is paused during conflict', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Check for auto-sync pause explanation
    expect(screen.getByText(/Auto-sync is paused while this conflict exists/)).toBeInTheDocument();
  });

  it('should mention manual sync requirement in Continue Editing description', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Check for manual sync requirement text
    const continueEditingDesc = screen.getByText(/resolve the conflict later/);
    expect(continueEditingDesc.parentElement?.textContent).toContain('You\'ll need to manually sync to resolve later');
  });

  it('should update the tip text to mention manual sync', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Check for updated tip text
    const tipText = screen.getByText(/Tip:/);
    expect(tipText.parentElement?.textContent).toContain('choose "Continue Editing" and use the Sync button when ready');
  });

  it('should have clear instructions for each option', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Continue Editing option should be clear about manual sync
    const continueOption = screen.getByText('Continue Editing').closest('button');
    expect(continueOption?.textContent).toContain('Continue Editing');
    expect(continueOption?.textContent).toContain('You\'ll need to manually sync to resolve later');
    
    // Load Remote option should be clear about data loss
    const loadOption = screen.getByText('Load Remote Version').closest('button');
    expect(loadOption?.textContent).toContain('Discard your local changes');
    
    // Save option should be clear about overwriting
    const saveOption = screen.getByText('Save Your Version').closest('button');
    expect(saveOption?.textContent).toContain('Overwrite remote');
  });

  it('should mention auto-sync resumption after resolution', () => {
    render(<SyncConflictDialog {...defaultProps} />);
    
    // Check for auto-sync resumption text
    expect(screen.getByText(/Auto-sync will resume after choosing/)).toBeInTheDocument();
  });
});