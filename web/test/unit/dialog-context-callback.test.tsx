import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act } from '../test-utils';
import { DialogProvider, useDialogContext } from '../../src/contexts/DialogContext';
import { dialogCallbackRef } from '../../src/lib/context/providers/dialog-state-ref.js';

describe('DialogContext Callback Setting', () => {
  beforeEach(() => {
    // Reset callback before each test
    dialogCallbackRef.openSyncConflictDialog = null;
  });

  afterEach(() => {
    // Clean up after tests
    dialogCallbackRef.openSyncConflictDialog = null;
  });

  it('should set dialogCallbackRef when DialogProvider mounts', () => {
    expect(dialogCallbackRef.openSyncConflictDialog).toBeNull();
    
    const { unmount } = render(
      <DialogProvider>
        <div>Test</div>
      </DialogProvider>
    );
    
    // After mounting, callback should be set
    expect(dialogCallbackRef.openSyncConflictDialog).not.toBeNull();
    expect(typeof dialogCallbackRef.openSyncConflictDialog).toBe('function');
    
    unmount();
  });

  it('should clear dialogCallbackRef when DialogProvider unmounts', () => {
    const { unmount } = render(
      <DialogProvider>
        <div>Test</div>
      </DialogProvider>
    );
    
    expect(dialogCallbackRef.openSyncConflictDialog).not.toBeNull();
    
    unmount();
    
    // After unmounting, callback should be cleared
    expect(dialogCallbackRef.openSyncConflictDialog).toBeNull();
  });

  it('should use the same function as openSyncConflictDialog', () => {
    const TestComponent = () => {
      const { openSyncConflictDialog } = useDialogContext();
      
      // Store the function for comparison
      (window as any).__testOpenSyncConflictDialog = openSyncConflictDialog;
      
      return <div>Test</div>;
    };
    
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    );
    
    // The callback ref should point to the same function
    expect(dialogCallbackRef.openSyncConflictDialog).toBe((window as any).__testOpenSyncConflictDialog);
    
    // Clean up
    delete (window as any).__testOpenSyncConflictDialog;
  });

  it('should work correctly when callback is invoked through ref', () => {
    const TestComponent = () => {
      const { syncConflictDialog } = useDialogContext();
      
      React.useEffect(() => {
        (window as any).__testSyncConflictDialog = syncConflictDialog;
      }, [syncConflictDialog]);
      
      return <div>Test</div>;
    };
    
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    );
    
    const handlers = {
      onLoadRemote: vi.fn(),
      onSaveLocal: vi.fn()
    };
    
    // Call through the ref
    expect(dialogCallbackRef.openSyncConflictDialog).not.toBeNull();
    
    act(() => {
      dialogCallbackRef.openSyncConflictDialog!(handlers);
    });
    
    // Check that the dialog state was updated
    const dialogState = (window as any).__testSyncConflictDialog;
    expect(dialogState.isOpen).toBe(true);
    expect(dialogState.onLoadRemote).toBe(handlers.onLoadRemote);
    expect(dialogState.onSaveLocal).toBe(handlers.onSaveLocal);
    
    // Clean up
    delete (window as any).__testSyncConflictDialog;
  });

  it('should update callback when DialogProvider re-renders', () => {
    const { rerender } = render(
      <DialogProvider>
        <div>Test 1</div>
      </DialogProvider>
    );
    
    const firstCallback = dialogCallbackRef.openSyncConflictDialog;
    expect(firstCallback).not.toBeNull();
    
    rerender(
      <DialogProvider>
        <div>Test 2</div>
      </DialogProvider>
    );
    
    // Callback should still be set (might be same reference due to useCallback)
    expect(dialogCallbackRef.openSyncConflictDialog).not.toBeNull();
  });
});