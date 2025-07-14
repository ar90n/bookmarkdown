import React, { useState } from 'react';
import { useBookmarkContext, useDialogContext } from '../../contexts/AppProvider';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '../../lib/utils/time';

interface SyncStatusWithActionsProps {
  className?: string;
  showActions?: boolean;
}

export const SyncStatusWithActions: React.FC<SyncStatusWithActionsProps> = ({ 
  className = '',
  showActions = true 
}) => {
  const bookmarkContext = useBookmarkContext();
  const dialog = useDialogContext();
  const { isDirty, isLoading, isSyncing, lastSyncAt, error, getGistInfo, syncWithRemote } = bookmarkContext;
  const [actionLoading, setActionLoading] = useState<'sync' | null>(null);
  
  // Get etag info if available (V2 only)
  const gistInfo = getGistInfo?.() || {};
  
  const handleSync = async () => {
    setActionLoading('sync');
    try {
      await syncWithRemote({
        onConflict: (handlers) => {
          dialog.openSyncConflictDialog(handlers);
        }
      });
    } finally {
      setActionLoading(null);
    }
  };
  
  // Determine status
  let statusColor: string;
  let Icon: React.ComponentType<any>;
  
  if (isLoading || actionLoading || isSyncing) {
    statusColor = 'text-blue-600';
    Icon = ArrowPathIcon;
  } else if (error) {
    statusColor = 'text-red-600';
    Icon = ExclamationTriangleIcon;
  } else if (!lastSyncAt) {
    statusColor = 'text-gray-400';
    Icon = CloudArrowUpIcon;
  } else if (isDirty) {
    statusColor = 'text-yellow-600';
    Icon = CloudArrowUpIcon;
  } else {
    statusColor = 'text-green-600';
    Icon = CheckCircleIcon;
  }
  
  const isProcessing = isLoading || actionLoading !== null || isSyncing;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <Icon 
          className={`h-5 w-5 ${statusColor} ${isProcessing ? 'animate-spin' : ''}`}
        />
        <div className="text-sm">
          {error && <span className="text-red-600 font-medium">Sync error</span>}
          {!error && isSyncing && <span className="text-blue-600 font-medium">Auto-syncing...</span>}
          {!error && !isSyncing && isDirty && <span className="text-yellow-600 font-medium">Changes pending</span>}
          {!error && !isSyncing && !isDirty && lastSyncAt && <span className="text-green-600 font-medium">Synced</span>}
          {!error && !isSyncing && !lastSyncAt && <span className="text-gray-500">Not synced</span>}
        </div>
      </div>
      
      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center gap-1">
          {/* Sync button - main action */}
          <button
            onClick={handleSync}
            disabled={isProcessing || (!isDirty && !error)}
            className={`
              inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md
              ${isDirty || error
                ? 'bg-primary-600 text-white hover:bg-primary-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
            title={isDirty ? 'Save changes to remote' : 'Already synced'}
          >
            <ArrowPathIcon className="h-4 w-4" />
            {actionLoading === 'sync' || isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      )}
      
      {/* Last sync time */}
      {lastSyncAt && (
        <div className="text-xs text-gray-500" title={lastSyncAt.toLocaleString()}>
          {formatRelativeTime(lastSyncAt)}
        </div>
      )}
    </div>
  );
};