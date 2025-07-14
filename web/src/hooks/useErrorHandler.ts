import { useCallback, useEffect } from 'react';
import { useBookmarkContext, useAuthContext } from '../contexts/AppProvider';

interface ErrorHandlerOptions {
  onConflict?: () => void;
  onAuthError?: () => void;
  autoDismiss?: boolean;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const bookmarkContext = useBookmarkContext();
  const authContext = useAuthContext();
  
  // Handle bookmark errors
  const handleBookmarkError = useCallback((error: string) => {
    // Check for specific error types
    if (error.includes('401') || error.includes('Unauthorized')) {
      // Auth error - may need to refresh token
      options.onAuthError?.();
    } else if (error.includes('Remote has been modified') || error.includes('412')) {
      // Conflict error
      options.onConflict?.();
    }
  }, [options]);
  
  // Monitor bookmark context errors
  useEffect(() => {
    if (bookmarkContext.error) {
      handleBookmarkError(bookmarkContext.error);
    }
  }, [bookmarkContext.error, handleBookmarkError]);
  
  // Retry handlers
  const retrySync = useCallback(async () => {
    bookmarkContext.clearError();
    
    // If we have a retryInitialization method, try that first
    if (bookmarkContext.retryInitialization) {
      try {
        await bookmarkContext.retryInitialization();
      } catch (error) {
        console.error('Retry initialization failed:', error);
        // Fall back to regular sync
        await bookmarkContext.syncWithRemote();
      }
    } else {
      await bookmarkContext.syncWithRemote();
    }
  }, [bookmarkContext]);
  
  const reloadFromRemote = useCallback(async () => {
    bookmarkContext.clearError();
    
    // If sync is not initialized, try to initialize first
    if (bookmarkContext.error?.includes('not initialized') && bookmarkContext.retryInitialization) {
      try {
        await bookmarkContext.retryInitialization();
      } catch (error) {
        console.error('Retry initialization failed:', error);
      }
    } else {
      await bookmarkContext.loadFromRemote();
    }
  }, [bookmarkContext]);
  
  const dismissError = useCallback(() => {
    bookmarkContext.clearError();
    authContext.clearError();
  }, [bookmarkContext, authContext]);
  
  return {
    bookmarkError: bookmarkContext.error,
    authError: authContext.error,
    hasError: Boolean(bookmarkContext.error || authContext.error),
    retrySync,
    reloadFromRemote,
    dismissError
  };
};