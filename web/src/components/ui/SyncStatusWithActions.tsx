import React, { useState } from 'react';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

interface SyncStatusWithActionsProps {
  className?: string;
  showActions?: boolean;
}

export const SyncStatusWithActions: React.FC<SyncStatusWithActionsProps> = ({ 
  className = '',
  showActions = true 
}) => {
  const bookmarkContext = useBookmarkContext();
  const { isDirty, isLoading, lastSyncAt, error, getGistInfo, syncWithRemote, loadFromRemote, saveToRemote } = bookmarkContext;
  const [actionLoading, setActionLoading] = useState<'sync' | 'load' | 'save' | null>(null);
  
  // Get etag info if available (V2 only)
  const gistInfo = getGistInfo?.() || {};
  
  const handleSync = async () => {
    setActionLoading('sync');
    try {
      await syncWithRemote();
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleLoad = async () => {
    if (!confirm('This will overwrite your local changes. Continue?')) return;
    
    setActionLoading('load');
    try {
      await loadFromRemote();
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleSave = async () => {
    setActionLoading('save');
    try {
      await saveToRemote();
    } finally {
      setActionLoading(null);
    }
  };
  
  // Determine status
  let statusColor: string;
  let Icon: React.ComponentType<any>;
  
  if (isLoading || actionLoading) {
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
  
  const isProcessing = isLoading || actionLoading !== null;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <Icon 
          className={`h-5 w-5 ${statusColor} ${isProcessing ? 'animate-spin' : ''}`}
        />
        <div className="text-sm">
          {error && <span className="text-red-600 font-medium">Sync error</span>}
          {!error && isDirty && <span className="text-yellow-600 font-medium">Changes pending</span>}
          {!error && !isDirty && lastSyncAt && <span className="text-green-600 font-medium">Synced</span>}
          {!error && !lastSyncAt && <span className="text-gray-500">Not synced</span>}
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
            {actionLoading === 'sync' ? 'Syncing...' : 'Sync'}
          </button>
          
          {/* Load from remote */}
          <button
            onClick={handleLoad}
            disabled={isProcessing}
            className="
              inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600
              hover:bg-gray-100 rounded-md transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Load from remote (overwrites local changes)"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {actionLoading === 'load' ? 'Loading...' : 'Load'}
          </button>
          
          {/* Force save */}
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="
                inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-600
                hover:bg-gray-100 rounded-md transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              title="Force save to remote"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              {actionLoading === 'save' ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      )}
      
      {/* Version info */}
      {gistInfo.etag && (
        <div className="text-xs text-gray-400" title={`Full version: ${gistInfo.etag}`}>
          v{gistInfo.etag.slice(0, 6)}
        </div>
      )}
    </div>
  );
};