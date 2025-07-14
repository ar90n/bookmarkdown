import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dialogCallbackRef } from '../../src/lib/context/providers/dialog-state-ref.js';

describe('Dialog Callback Ref', () => {
  beforeEach(() => {
    // Reset callback before each test
    dialogCallbackRef.openSyncConflictDialog = null;
  });

  it('should start with null callback', () => {
    expect(dialogCallbackRef.openSyncConflictDialog).toBeNull();
  });

  it('should allow setting a callback function', () => {
    const mockCallback = vi.fn();
    dialogCallbackRef.openSyncConflictDialog = mockCallback;
    
    expect(dialogCallbackRef.openSyncConflictDialog).toBe(mockCallback);
  });

  it('should call the callback when invoked', () => {
    const mockCallback = vi.fn();
    const handlers = {
      onLoadRemote: vi.fn(),
      onSaveLocal: vi.fn()
    };
    
    dialogCallbackRef.openSyncConflictDialog = mockCallback;
    dialogCallbackRef.openSyncConflictDialog(handlers);
    
    expect(mockCallback).toHaveBeenCalledWith(handlers);
  });

  it('should handle null callback gracefully', () => {
    const handlers = {
      onLoadRemote: vi.fn(),
      onSaveLocal: vi.fn()
    };
    
    // Should not throw when callback is null
    expect(() => {
      if (dialogCallbackRef.openSyncConflictDialog) {
        dialogCallbackRef.openSyncConflictDialog(handlers);
      }
    }).not.toThrow();
  });

  it('should allow clearing the callback', () => {
    const mockCallback = vi.fn();
    dialogCallbackRef.openSyncConflictDialog = mockCallback;
    
    // Clear the callback
    dialogCallbackRef.openSyncConflictDialog = null;
    
    expect(dialogCallbackRef.openSyncConflictDialog).toBeNull();
  });

  it('should work with multiple callback replacements', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const handlers = {
      onLoadRemote: vi.fn(),
      onSaveLocal: vi.fn()
    };
    
    // Set first callback
    dialogCallbackRef.openSyncConflictDialog = callback1;
    dialogCallbackRef.openSyncConflictDialog(handlers);
    expect(callback1).toHaveBeenCalledTimes(1);
    
    // Replace with second callback
    dialogCallbackRef.openSyncConflictDialog = callback2;
    dialogCallbackRef.openSyncConflictDialog(handlers);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1); // Still only called once
  });
});