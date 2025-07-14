import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../src/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce the callback function', () => {
    const callback = vi.fn();
    const delay = 1000;

    const { result } = renderHook(() => useDebounce(callback, delay));

    // Call the debounced function multiple times
    act(() => {
      result.current();
      result.current();
      result.current();
    });

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(delay);
    });

    // Callback should be called only once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous timer when called again', () => {
    const callback = vi.fn();
    const delay = 1000;

    const { result } = renderHook(() => useDebounce(callback, delay));

    // First call
    act(() => {
      result.current();
    });

    // Advance time partially
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Second call should cancel the first
    act(() => {
      result.current();
    });

    // Advance time to original deadline
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled();

    // Advance remaining time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now it should be called
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the callback', () => {
    const callback = vi.fn();
    const delay = 1000;

    const { result } = renderHook(() => useDebounce(callback, delay));

    const testArgs = ['arg1', 'arg2', { key: 'value' }];

    act(() => {
      result.current(...testArgs);
    });

    act(() => {
      vi.advanceTimersByTime(delay);
    });

    expect(callback).toHaveBeenCalledWith(...testArgs);
  });

  it('should cleanup on unmount', () => {
    const callback = vi.fn();
    const delay = 1000;

    const { result, unmount } = renderHook(() => useDebounce(callback, delay));

    act(() => {
      result.current();
    });

    // Unmount before timer fires
    unmount();

    act(() => {
      vi.advanceTimersByTime(delay);
    });

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle dependency changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const delay = 1000;

    const { result, rerender } = renderHook(
      ({ cb, d }) => useDebounce(cb, d),
      { initialProps: { cb: callback1, d: delay } }
    );

    // Call with first callback
    act(() => {
      result.current('first');
    });

    // Change to second callback
    rerender({ cb: callback2, d: delay });

    // Call with second callback
    act(() => {
      result.current('second');
    });

    act(() => {
      vi.advanceTimersByTime(delay);
    });

    // Only second callback should be called
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('second');
  });
});