import { handleError, formatErrorForUser } from './errors';

/**
 * Options for async operations
 */
export interface AsyncOperationOptions {
  setError?: (error: string | null) => void;
  setLoading?: (loading: boolean) => void;
  context?: string;
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
  formatError?: (error: unknown) => string;
}

/**
 * Wrapper for async operations with consistent error handling and loading states
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<T | null> {
  const {
    setError,
    setLoading,
    context = 'Operation',
    onError,
    onSuccess,
    formatError = formatErrorForUser
  } = options;
  
  // Set loading state
  setLoading?.(true);
  setError?.(null);
  
  try {
    const result = await operation();
    onSuccess?.();
    return result;
  } catch (error) {
    // Handle the error
    const message = handleError(error, context, { rethrow: false });
    const userMessage = formatError(error);
    
    // Update error state
    setError?.(userMessage);
    
    // Call error callback
    onError?.(error);
    
    return null;
  } finally {
    // Clear loading state
    setLoading?.(false);
  }
}

/**
 * Wrapper for async operations that return a boolean success indicator
 */
export async function tryAsync(
  operation: () => Promise<void>,
  options: AsyncOperationOptions = {}
): Promise<boolean> {
  const result = await withErrorHandling(
    async () => {
      await operation();
      return true;
    },
    options
  );
  
  return result !== null;
}

/**
 * Execute multiple async operations in parallel with individual error handling
 */
export async function executeInParallel<T>(
  operations: Array<{
    name: string;
    operation: () => Promise<T>;
  }>,
  options: {
    stopOnError?: boolean;
    onError?: (name: string, error: unknown) => void;
    onSuccess?: (name: string, result: T) => void;
  } = {}
): Promise<Array<{ name: string; success: boolean; result?: T; error?: unknown }>> {
  const { stopOnError = false, onError, onSuccess } = options;
  
  if (stopOnError) {
    const results: Array<{ name: string; success: boolean; result?: T; error?: unknown }> = [];
    
    for (const { name, operation } of operations) {
      try {
        const result = await operation();
        results.push({ name, success: true, result });
        onSuccess?.(name, result);
      } catch (error) {
        results.push({ name, success: false, error });
        onError?.(name, error);
        break;
      }
    }
    
    return results;
  }
  
  // Execute all operations in parallel
  return Promise.all(
    operations.map(async ({ name, operation }) => {
      try {
        const result = await operation();
        onSuccess?.(name, result);
        return { name, success: true, result };
      } catch (error) {
        onError?.(name, error);
        return { name, success: false, error };
      }
    })
  );
}

/**
 * Create a debounced async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let activePromise: Promise<ReturnType<T>> | null = null;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (activePromise) {
      return activePromise;
    }
    
    activePromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          activePromise = null;
          timeoutId = null;
        }
      }, delay);
    });
    
    return activePromise;
  };
}

/**
 * Create a throttled async function
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  let inThrottle = false;
  let lastResult: ReturnType<T> | void;
  
  return async (...args: Parameters<T>): Promise<ReturnType<T> | void> => {
    if (!inThrottle) {
      inThrottle = true;
      
      try {
        lastResult = await fn(...args);
        return lastResult;
      } finally {
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    }
    
    return lastResult;
  };
}