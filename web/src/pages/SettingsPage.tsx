import React, { useState } from 'react';
import { useAuthContext, useBookmarkContext, useDialogContext } from '../contexts/AppProvider';
import { Button } from '../components/UI/Button';
import { SyncStatus } from '../components/ui/SyncStatus';
import { 
  CloudArrowUpIcon, 
  DocumentDuplicateIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export const SettingsPage: React.FC = () => {
  const auth = useAuthContext();
  const bookmark = useBookmarkContext();
  const dialog = useDialogContext();
  const [isImporting, setIsImporting] = useState(false);
  
  // Get V2-specific info
  const gistInfo = bookmark.getGistInfo?.() || {};
  const isV2 = Boolean(bookmark.getGistInfo);

  const handleExportMarkdown = async () => {
    try {
      const markdownContent = await bookmark.exportData('markdown');
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookmarks.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      bookmark.setError('Failed to export bookmarks');
    }
  };

  const handleExportJSON = async () => {
    try {
      const jsonContent = await bookmark.exportData('json');
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookmarks.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      bookmark.setError('Failed to export bookmarks');
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        try {
          const format = file.name.endsWith('.json') ? 'json' : 'markdown';
          await bookmark.importData(content, format);
        } catch (error) {
          console.error('Import failed:', error);
          bookmark.setError(`Failed to import ${file.name}`);
        } finally {
          setIsImporting(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    const confirmed = await dialog.openConfirmDialog({
      title: 'Reset All Data',
      message: 'Are you sure you want to reset all data? This action cannot be undone.',
      confirmText: 'Reset',
      confirmVariant: 'danger'
    });

    if (confirmed) {
      bookmark.resetState();
      bookmark.clearGistId();
    }
  };

  const handleClearGistId = async () => {
    const confirmed = await dialog.openConfirmDialog({
      title: 'Clear Gist Configuration',
      message: 'This will unlink your bookmarks from the current Gist. You can create a new Gist or link to a different one later.',
      confirmText: 'Clear',
      confirmVariant: 'danger'
    });

    if (confirmed) {
      bookmark.clearGistId();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account and bookmark data</p>
      </div>

      {/* V2 Feature Flag Indicator */}
      {isV2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Using V2 sync engine with etag-based version control
            </span>
          </div>
        </div>
      )}

      {/* Account Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authentication Status
            </label>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${auth.isAuthenticated ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {auth.isAuthenticated ? 'Connected to GitHub' : 'Not connected'}
              </span>
            </div>
          </div>

          {auth.user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub User
              </label>
              <div className="flex items-center gap-3">
                {auth.user.avatar_url && (
                  <img 
                    src={auth.user.avatar_url} 
                    alt={auth.user.name || auth.user.login}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{auth.user.name || auth.user.login}</p>
                  <p className="text-xs text-gray-500">@{auth.user.login}</p>
                </div>
              </div>
            </div>
          )}

          {auth.tokens?.scopes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {auth.tokens.scopes.map((scope) => (
                  <span key={scope} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200 mt-6">
          {auth.isAuthenticated ? (
            <Button
              variant="outline"
              onClick={() => auth.logout()}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Sign Out
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => auth.login()}
            >
              Sign In with GitHub
            </Button>
          )}
        </div>
      </div>

      {/* Sync Status Section (V2) */}
      {isV2 && auth.isAuthenticated && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sync Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SyncStatus />
              <Button
                variant="outline"
                size="sm"
                onClick={() => bookmark.syncWithRemote()}
                disabled={bookmark.isLoading}
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                Sync Now
              </Button>
            </div>
            
            {gistInfo.gistId && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600 mb-1">Gist ID</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-gray-800">{gistInfo.gistId}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(gistInfo.gistId!)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                </div>
                {gistInfo.etag && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Version</p>
                    <code className="text-xs font-mono text-gray-700">{gistInfo.etag}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
        
        <div className="space-y-6">
          {/* Import/Export */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import & Export</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Export</label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={handleExportMarkdown}
                    className="w-full justify-start"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export as Markdown
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportJSON}
                    className="w-full justify-start"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export as JSON
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Import</label>
                <label className="block">
                  <input
                    type="file"
                    accept=".md,.json"
                    onChange={handleImportFile}
                    className="hidden"
                    disabled={isImporting}
                  />
                  <Button
                    variant="outline"
                    disabled={isImporting}
                    className="w-full justify-start"
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector('input[type="file"]');
                      input?.click();
                    }}
                  >
                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                    {isImporting ? 'Importing...' : 'Import from File'}
                  </Button>
                </label>
                <p className="text-xs text-gray-500 mt-1">Supports .md and .json files</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
            
            <div className="space-y-3">
              {bookmark.currentGistId && (
                <div className="flex items-center justify-between p-3 border border-red-200 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Clear Gist Configuration</p>
                    <p className="text-xs text-gray-500">Unlink from current Gist</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearGistId}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Clear
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-between p-3 border border-red-200 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">Reset All Data</p>
                  <p className="text-xs text-gray-500">Delete all bookmarks and settings</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};