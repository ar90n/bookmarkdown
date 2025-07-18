import React from 'react';
import { useBookmarkContext } from '../../contexts/AppProvider';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export const SyncStatus: React.FC = () => {
  const bookmarkContext = useBookmarkContext();
  const { isDirty, isLoading, lastSyncAt, error, getGistInfo } = bookmarkContext;
  const { retrySync } = useErrorHandler();
  
  // Get etag info if available (V2 only)
  const gistInfo = getGistInfo?.() || {};
  
  // Calculate time since last sync
  const getTimeSince = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };
  
  // Determine status
  let status: 'synced' | 'pending' | 'syncing' | 'error' | 'not-synced';
  let statusText: string;
  let statusColor: string;
  let Icon: React.ComponentType<any>;
  
  if (isLoading) {
    status = 'syncing';
    statusText = 'Syncing...';
    statusColor = 'text-blue-600';
    Icon = ArrowPathIcon;
  } else if (error) {
    status = 'error';
    statusText = 'Sync error';
    statusColor = 'text-red-600';
    Icon = ExclamationTriangleIcon;
  } else if (!lastSyncAt) {
    status = 'not-synced';
    statusText = 'Not synced';
    statusColor = 'text-gray-400';
    Icon = CloudArrowUpIcon;
  } else if (isDirty) {
    status = 'pending';
    statusText = 'Changes pending';
    statusColor = 'text-yellow-600';
    Icon = CloudArrowUpIcon;
  } else {
    status = 'synced';
    statusText = 'Synced';
    statusColor = 'text-green-600';
    Icon = CheckCircleIcon;
  }
  
  const tooltipText = [
    `Status: ${statusText}`,
    lastSyncAt ? `Last sync: ${getTimeSince(lastSyncAt)}` : null,
    gistInfo.etag ? `Version: ${gistInfo.etag.slice(0, 8)}...` : null,
    error ? `Error: ${error}` : null
  ].filter(Boolean).join('\n');
  
  return (
    <div 
      className="flex items-center gap-2 text-sm"
      data-testid="sync-status"
      data-sync-status={status}
      title={tooltipText}
    >
      <Icon 
        className={`h-5 w-5 ${statusColor} ${status === 'syncing' ? 'animate-spin' : ''}`}
        data-testid="sync-icon"
      />
      <div className="flex flex-col">
        <span className={`font-medium ${statusColor}`}>{statusText}</span>
        {lastSyncAt && status !== 'error' && (
          <span className="text-xs text-gray-500">{getTimeSince(lastSyncAt)}</span>
        )}
        {status === 'error' && (
          <button
            onClick={retrySync}
            className="text-xs text-blue-600 hover:text-blue-700 underline mt-1"
            disabled={isLoading}
          >
            Retry connection
          </button>
        )}
      </div>
    </div>
  );
};