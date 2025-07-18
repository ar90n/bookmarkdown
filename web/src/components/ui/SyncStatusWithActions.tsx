import React, { useState } from 'react';
import { useBookmarkContext, useDialogContext } from '../../contexts/AppProvider';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  PauseCircleIcon
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '../../lib/utils/time';
import { dialogStateRef } from '../../lib/context/providers/dialog-state-ref';

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
  const { isDirty, isLoading, isSyncing, lastSyncAt, error, getGistInfo, syncWithRemote, isAutoSyncEnabled, loadFromRemote, saveToRemote } = bookmarkContext;
  const [actionLoading, setActionLoading] = useState<'sync' | null>(null);
  
  // Check if auto-sync is paused due to conflict
  const hasUnresolvedConflict = dialogStateRef.hasUnresolvedConflict;
  const isAutoSyncPaused = hasUnresolvedConflict && isAutoSyncEnabled();
  
  // Get etag info if available (V2 only)
  const gistInfo = getGistInfo?.() || {};
  
  const handleSync = async () => {
    // If there's an unresolved conflict, show the dialog immediately
    if (hasUnresolvedConflict) {
      dialog.openSyncConflictDialog({
        onLoadRemote: async () => {
          await bookmarkContext.loadFromRemote();
          dialogStateRef.hasUnresolvedConflict = false;
        },
        onSaveLocal: async () => {
          await bookmarkContext.saveToRemote();
          dialogStateRef.hasUnresolvedConflict = false;
        }
      });
      return;
    }
    
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
  } else if (isAutoSyncPaused) {
    statusColor = 'text-yellow-600';
    Icon = PauseCircleIcon;
  } else if (!lastSyncAt) {
    statusColor = 'text-gray-400';
    Icon = CloudArrowUpIcon;
  } else if (isDirty) {
    // When auto-sync is OFF, show orange color for pending changes
    statusColor = !isAutoSyncEnabled() ? 'text-orange-600' : 'text-yellow-600';
    Icon = CloudArrowUpIcon;
  } else {
    // When auto-sync is OFF, show gray color for synced state
    statusColor = !isAutoSyncEnabled() ? 'text-gray-600' : 'text-green-600';
    Icon = CheckCircleIcon;
  }
  
  const isProcessing = isLoading || actionLoading !== null || isSyncing;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status indicator */}
      <div className="flex items-center gap-2" data-testid="sync-status" data-sync-status={isProcessing ? 'syncing' : error ? 'error' : isDirty ? 'pending' : lastSyncAt ? 'synced' : 'not-synced'}>
        <Icon 
          className={`h-5 w-5 ${statusColor} ${isProcessing ? 'animate-spin' : ''}`}
        />
        <div className="text-sm">
          {error && <span className="text-red-600 font-medium">Sync error</span>}
          {!error && isSyncing && <span className="text-blue-600 font-medium">Auto-syncing...</span>}
          {!error && !isSyncing && isAutoSyncPaused && <span className="text-yellow-600 font-medium">Auto-sync paused</span>}
          {!error && !isSyncing && !isAutoSyncPaused && isDirty && (
            <span className={!isAutoSyncEnabled() ? "text-orange-600 font-medium" : "text-yellow-600 font-medium"}>
              Changes pending
            </span>
          )}
          {!error && !isSyncing && !isAutoSyncPaused && !isDirty && lastSyncAt && (
            <span className={!isAutoSyncEnabled() ? "text-gray-600 font-medium" : "text-green-600 font-medium"}>
              Synced
            </span>
          )}
          {!error && !isSyncing && !isAutoSyncPaused && !lastSyncAt && <span className="text-gray-500">Not synced</span>}
        </div>
      </div>
      
      {/* Action buttons */}
      {showActions && (
        <div className="flex items-center gap-1">
          {/* Sync button - main action */}
          <button
            onClick={handleSync}
            disabled={isProcessing}
            className={`
              inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md
              bg-primary-600 text-white hover:bg-primary-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
            title="Sync with remote"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {actionLoading === 'sync' || isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      )}
      
      {/* Auto-sync status */}
      <div className="text-xs">
        {isAutoSyncPaused && (
          <span className="text-yellow-600 font-medium">Auto-sync: Paused</span>
        )}
        {!isAutoSyncPaused && isAutoSyncEnabled() && (
          <span className="text-green-600 font-medium">Auto-sync: ON</span>
        )}
        {!isAutoSyncPaused && !isAutoSyncEnabled() && (
          <span className="text-gray-500 font-medium">Auto-sync: OFF</span>
        )}
      </div>
      
      {/* Last sync time */}
      {lastSyncAt && (
        <div className="text-xs text-gray-500" title={lastSyncAt.toLocaleString()}>
          {formatRelativeTime(lastSyncAt)}
        </div>
      )}
    </div>
  );
};