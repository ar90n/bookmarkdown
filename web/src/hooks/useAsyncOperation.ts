import React, { useState, useCallback, useRef } from 'react';
import { withErrorHandling, AsyncOperationOptions } from '../utils/asyncOperation';

/**
 * Hook for managing async operations with loading and error states
 */
export function useAsyncOperation<T = void>(
  defaultOptions?: Partial<AsyncOperationOptions>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      options?: Partial<AsyncOperationOptions>
    ): Promise<T | null> => {
      // Only update state if component is still mounted
      const safeSetError = (error: string | null) => {
        if (isMountedRef.current) {
          setError(error);
        }
      };

      const safeSetLoading = (loading: boolean) => {
        if (isMountedRef.current) {
          setIsLoading(loading);
        }
      };

      return withErrorHandling(operation, {
        ...defaultOptions,
        ...options,
        setError: safeSetError,
        setLoading: safeSetLoading,
      });
    },
    [defaultOptions]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    setError,
    execute,
    reset,
  };
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations() {
  const operations = useRef<Map<string, AbortController>>(new Map());
  
  const execute = useCallback(
    async <T,>(
      key: string,
      operation: (signal: AbortSignal) => Promise<T>,
      options?: Partial<AsyncOperationOptions>
    ): Promise<T | null> => {
      // Cancel any existing operation with the same key
      const existing = operations.current.get(key);
      if (existing) {
        existing.abort();
      }
      
      // Create new abort controller
      const controller = new AbortController();
      operations.current.set(key, controller);
      
      try {
        return await withErrorHandling(
          () => operation(controller.signal),
          options
        );
      } finally {
        operations.current.delete(key);
      }
    },
    []
  );
  
  const cancel = useCallback((key: string) => {
    const controller = operations.current.get(key);
    if (controller) {
      controller.abort();
      operations.current.delete(key);
    }
  }, []);
  
  const cancelAll = useCallback(() => {
    operations.current.forEach(controller => controller.abort());
    operations.current.clear();
  }, []);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cancelAll();
    };
  }, [cancelAll]);
  
  return {
    execute,
    cancel,
    cancelAll,
  };
}