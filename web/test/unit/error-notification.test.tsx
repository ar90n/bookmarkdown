import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorNotification } from '../../src/components/ui/ErrorNotification';
import React from 'react';

describe('ErrorNotification', () => {
  it('should not render when no error', () => {
    const { container } = render(
      <ErrorNotification error={null} onDismiss={() => {}} />
    );
    
    expect(container.firstChild).toBeNull();
  });
  
  it('should show error message', () => {
    render(
      <ErrorNotification 
        error="Failed to sync data" 
        onDismiss={() => {}} 
      />
    );
    
    expect(screen.getByText('Failed to sync data')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
  
  it('should call onDismiss when close button clicked', () => {
    const onDismiss = vi.fn();
    
    render(
      <ErrorNotification 
        error="Test error" 
        onDismiss={onDismiss} 
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onDismiss).toHaveBeenCalledOnce();
  });
  
  it('should show retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    
    render(
      <ErrorNotification 
        error="Network error" 
        onDismiss={() => {}}
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });
  
  it('should handle conflict errors specially', () => {
    render(
      <ErrorNotification 
        error="Remote has been modified. Please reload before saving." 
        onDismiss={() => {}}
        onReload={() => {}}
      />
    );
    
    expect(screen.getByText('Sync Conflict')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
  
  it('should show details for etag errors', () => {
    render(
      <ErrorNotification 
        error="412 Precondition Failed: Etag mismatch" 
        onDismiss={() => {}}
      />
    );
    
    expect(screen.getByText(/version conflict/i)).toBeInTheDocument();
  });
  
  it('should auto-dismiss after timeout', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    
    render(
      <ErrorNotification 
        error="Temporary error" 
        onDismiss={onDismiss}
        autoDismiss={true}
        dismissAfter={3000}
      />
    );
    
    expect(onDismiss).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(3000);
    
    expect(onDismiss).toHaveBeenCalledOnce();
    
    vi.useRealTimers();
  });
});