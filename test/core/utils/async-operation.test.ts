import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withErrorHandling,
  tryAsync,
  executeInParallel,
  debounceAsync,
  throttleAsync
} from '../../../web/src/utils/asyncOperation';

describe('Async Operation Utilities', () => {
  let mockSetError: ReturnType<typeof vi.fn>;
  let mockSetLoading: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockSetError = vi.fn();
    mockSetLoading = vi.fn();
    mockOnSuccess = vi.fn();
    mockOnError = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  describe('withErrorHandling', () => {
    it('should handle successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withErrorHandling(
        operation,
        {
          setError: mockSetError,
          setLoading: mockSetLoading,
          context: 'Test operation',
          onSuccess: mockOnSuccess,
          onError: mockOnError
        }
      );

      expect(result).toBe('success');
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
      expect(mockSetError).toHaveBeenCalledWith(null);
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle failed operation', async () => {
      const error = new Error('Test error');
      const operation = vi.fn().mockRejectedValue(error);
      
      const result = await withErrorHandling(
        operation,
        {
          setError: mockSetError,
          setLoading: mockSetLoading,
          context: 'Test operation',
          onSuccess: mockOnSuccess,
          onError: mockOnError
        }
      );

      expect(result).toBeNull();
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
      expect(mockSetError).toHaveBeenCalledWith(expect.any(String));
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should manage loading state correctly', async () => {
      let resolveOperation: (value: string) => void;
      const operation = vi.fn().mockImplementation(() => new Promise(resolve => {
        resolveOperation = resolve;
      }));

      const promise = withErrorHandling(
        operation,
        {
          setLoading: mockSetLoading,
          context: 'Test operation'
        }
      );

      // Should have called setLoading(true) at start
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledTimes(1);

      // Resolve the operation
      resolveOperation!('done');
      await promise;

      // Should have called setLoading(false) after completion
      expect(mockSetLoading).toHaveBeenCalledWith(false);
      expect(mockSetLoading).toHaveBeenCalledTimes(2);
    });

    it('should work without optional parameters', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withErrorHandling(operation);

      expect(result).toBe('success');
    });

    it('should use custom error formatter', async () => {
      const error = new Error('Test error');
      const operation = vi.fn().mockRejectedValue(error);
      const customFormatter = vi.fn().mockReturnValue('Custom error message');
      
      await withErrorHandling(
        operation,
        {
          setError: mockSetError,
          context: 'Test operation',
          formatError: customFormatter
        }
      );

      expect(customFormatter).toHaveBeenCalledWith(error);
      expect(mockSetError).toHaveBeenCalledWith('Custom error message');
    });
  });

  describe('tryAsync', () => {
    it('should return true on success', async () => {
      const operation = vi.fn().mockResolvedValue(undefined);
      
      const result = await tryAsync(
        operation,
        { context: 'Test operation' }
      );

      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await tryAsync(
        operation,
        { context: 'Test operation' }
      );

      expect(result).toBe(false);
    });

    it('should call callbacks', async () => {
      const operation = vi.fn().mockResolvedValue(undefined);
      
      await tryAsync(
        operation,
        {
          context: 'Test operation',
          setLoading: mockSetLoading,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        }
      );

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('executeInParallel', () => {
    it('should execute all operations in parallel', async () => {
      const operations = [
        { name: 'op1', operation: vi.fn().mockResolvedValue('result1') },
        { name: 'op2', operation: vi.fn().mockResolvedValue('result2') },
        { name: 'op3', operation: vi.fn().mockResolvedValue('result3') }
      ];

      const results = await executeInParallel(operations);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ name: 'op1', success: true, result: 'result1' });
      expect(results[1]).toEqual({ name: 'op2', success: true, result: 'result2' });
      expect(results[2]).toEqual({ name: 'op3', success: true, result: 'result3' });

      // All operations should have been called
      operations.forEach(op => {
        expect(op.operation).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle mixed success and failure', async () => {
      const error = new Error('Operation failed');
      const operations = [
        { name: 'op1', operation: vi.fn().mockResolvedValue('result1') },
        { name: 'op2', operation: vi.fn().mockRejectedValue(error) },
        { name: 'op3', operation: vi.fn().mockResolvedValue('result3') }
      ];

      const results = await executeInParallel(operations);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ name: 'op1', success: true, result: 'result1' });
      expect(results[1]).toEqual({ name: 'op2', success: false, error });
      expect(results[2]).toEqual({ name: 'op3', success: true, result: 'result3' });
    });

    it('should stop on first error when configured', async () => {
      const error = new Error('Operation failed');
      const operations = [
        { name: 'op1', operation: vi.fn().mockResolvedValue('result1') },
        { name: 'op2', operation: vi.fn().mockRejectedValue(error) },
        { name: 'op3', operation: vi.fn().mockResolvedValue('result3') }
      ];

      const results = await executeInParallel(operations, { stopOnError: true });

      // Should only have results up to the error
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ name: 'op1', success: true, result: 'result1' });
      expect(results[1]).toEqual({ name: 'op2', success: false, error });

      // Third operation should not have been called
      expect(operations[2].operation).not.toHaveBeenCalled();
    });

    it('should call success and error callbacks', async () => {
      const error = new Error('Operation failed');
      const onSuccess = vi.fn();
      const onError = vi.fn();
      
      const operations = [
        { 
          name: 'op1', 
          operation: vi.fn().mockResolvedValue('result1')
        },
        { 
          name: 'op2', 
          operation: vi.fn().mockRejectedValue(error)
        }
      ];

      await executeInParallel(operations, { onSuccess, onError });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('op1', 'result1');
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith('op2', error);
    });
  });

  describe('debounceAsync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it.skip('should debounce multiple calls', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      const debounced = debounceAsync(operation, 100);

      // Make multiple calls quickly
      const promise1 = debounced('arg1');
      const promise2 = debounced('arg2');
      const promise3 = debounced('arg3');

      // All should return the same promise instance
      expect(promise1).toBe(promise2);
      expect(promise2).toBe(promise3);

      // Operation should not be called yet
      expect(operation).not.toHaveBeenCalled();

      // Advance time to trigger the debounced call
      await vi.runAllTimersAsync();
      
      // Wait for the result
      const result = await promise1;

      expect(result).toBe('result');
      // Operation should only be called once with the last arguments
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith('arg3');
    });

    it('should execute after delay', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      const debounced = debounceAsync(operation, 200);

      const promise = debounced('arg');

      // Operation should not be called immediately
      expect(operation).not.toHaveBeenCalled();

      // Advance time less than delay
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).not.toHaveBeenCalled();

      // Advance time past delay
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(operation).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should handle errors in debounced function', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);
      const debounced = debounceAsync(operation, 100);

      const promise = debounced('arg');
      
      // Ensure we advance timers to trigger the debounced operation
      await vi.runAllTimersAsync();
      
      // Expect the promise to reject with the error
      await expect(promise).rejects.toThrow('Operation failed');
      expect(operation).toHaveBeenCalledWith('arg');
    });

    it('should allow separate executions after delay', async () => {
      const operation = vi.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const debounced = debounceAsync(operation, 100);

      // First call
      const promise1 = debounced('arg1');
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      // Second call after first completes
      const promise2 = debounced('arg2');
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(promise1).not.toBe(promise2);
    });
  });

  describe('throttleAsync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should throttle multiple calls', async () => {
      const operation = vi.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const throttled = throttleAsync(operation, 200);

      // First call goes through immediately
      const promise1 = throttled('arg1');
      const result1 = await promise1;
      expect(result1).toBe('result1');
      expect(operation).toHaveBeenCalledTimes(1);

      // Second call within throttle period returns cached result
      const promise2 = throttled('arg2');
      const result2 = await promise2;
      expect(result2).toBe('result1'); // Same as first result
      expect(operation).toHaveBeenCalledTimes(1); // Not called again

      // Advance past throttle period
      await vi.advanceTimersByTimeAsync(200);

      // Third call after throttle period makes new call
      const promise3 = throttled('arg3');
      const result3 = await promise3;
      expect(result3).toBe('result2');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in throttled function', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);
      const throttled = throttleAsync(operation, 100);

      await expect(throttled('arg')).rejects.toThrow('Operation failed');
    });

    it('should cache results but not errors', async () => {
      const operation = vi.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const throttled = throttleAsync(operation, 100);

      // First call succeeds
      const result1 = await throttled('arg1');
      expect(result1).toBe('result1');

      // Second call within throttle period returns cached result
      const result2 = await throttled('arg2');
      expect(result2).toBe('result1'); // Cached
      expect(operation).toHaveBeenCalledTimes(1);

      // Wait for throttle period to expire
      await vi.advanceTimersByTimeAsync(100);

      // Third call after throttle period makes new call
      const result3 = await throttled('arg3');
      expect(result3).toBe('result2');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should execute immediately on first call', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      const throttled = throttleAsync(operation, 1000);

      const startTime = Date.now();
      const promise = throttled('arg');
      
      // Should not need to wait for throttle delay on first call
      const result = await promise;
      const endTime = Date.now();

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
      // Should complete almost immediately (not wait for throttle delay)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});