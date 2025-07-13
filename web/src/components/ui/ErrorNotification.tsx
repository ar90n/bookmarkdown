import React, { useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ErrorNotificationProps {
  error: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
  onReload?: () => void;
  autoDismiss?: boolean;
  dismissAfter?: number;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  onReload,
  autoDismiss = false,
  dismissAfter = 5000
}) => {
  useEffect(() => {
    if (error && autoDismiss) {
      const timer = setTimeout(onDismiss, dismissAfter);
      return () => clearTimeout(timer);
    }
  }, [error, autoDismiss, dismissAfter, onDismiss]);
  
  if (!error) return null;
  
  // Determine error type
  const isConflictError = error.includes('Remote has been modified') || 
                         error.includes('Etag mismatch') || 
                         error.includes('412');
  const isNetworkError = error.includes('Network') || 
                        error.includes('Failed to fetch') ||
                        error.includes('offline');
  
  const title = isConflictError ? 'Sync Conflict' : 'Error';
  const bgColor = isConflictError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const iconColor = isConflictError ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <div className={`fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg border ${bgColor} z-50`}>
      <div className="flex items-start">
        <ExclamationTriangleIcon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${iconColor}`}>{title}</h3>
          <p className="mt-1 text-sm text-gray-700">{error}</p>
          
          {isConflictError && (
            <p className="mt-1 text-xs text-gray-600">
              Another user has updated the content. You need to reload to get the latest version.
            </p>
          )}
          
          {error.includes('412') && (
            <p className="mt-1 text-xs text-gray-600">
              This is a version conflict. The remote content has changed since your last sync.
            </p>
          )}
          
          <div className="mt-3 flex gap-2">
            {onReload && isConflictError && (
              <button
                onClick={onReload}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                aria-label="Reload"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Reload
              </button>
            )}
            
            {onRetry && (isNetworkError || !isConflictError) && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
                aria-label="Retry"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Retry
              </button>
            )}
            
            <button
              onClick={onDismiss}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};