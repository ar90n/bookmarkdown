import React from 'react';
import { useAuthContext, useBookmarkContext, useDialogContext } from '../contexts/AppProvider';
import { Button } from '../components/UI/Button';

export const SettingsPage: React.FC = () => {
  const auth = useAuthContext();
  const bookmark = useBookmarkContext();
  const dialog = useDialogContext();

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
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        try {
          const format = file.name.endsWith('.json') ? 'json' : 'markdown';
          await bookmark.importData(content, format);
        } catch (error) {
          console.error('Import failed:', error);
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
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
    
    if (confirmed) {
      bookmark.resetState();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        
        {auth.user && (
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={auth.user.avatar_url}
              alt={auth.user.login}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {auth.user.name || auth.user.login}
              </h3>
              <p className="text-gray-600">@{auth.user.login}</p>
              {auth.user.email && (
                <p className="text-gray-600">{auth.user.email}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authentication Status
            </label>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Connected to GitHub</span>
            </div>
          </div>

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

          {auth.lastLoginAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Login
              </label>
              <p className="text-sm text-gray-600">
                {auth.lastLoginAt.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200 mt-6">
          <Button
            variant="outline"
            onClick={() => auth.logout()}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
        
        <div className="space-y-6">
          {/* GitHub Gist Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">GitHub Gist Configuration</h3>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Gist ID</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    {bookmark.currentGistId 
                      ? `Your bookmarks are synced with Gist: ${bookmark.currentGistId}`
                      : 'No Gist ID configured. A new Gist will be created on first sync.'
                    }
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bookmark.currentGistId && (
                      <>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(bookmark.currentGistId!);
                          }}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                        >
                          Copy Gist ID
                        </button>
                        <a
                          href={`https://gist.github.com/${bookmark.currentGistId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                        >
                          View on GitHub
                        </a>
                        <button
                          onClick={async () => {
                            const confirmed = await dialog.openConfirmDialog({
                              title: 'Clear Gist ID',
                              message: 'Are you sure you want to clear the Gist ID? This will not delete the remote Gist, but will create a new one on next sync.',
                              confirmText: 'Clear',
                              cancelText: 'Cancel',
                              confirmButtonClass: 'bg-orange-600 hover:bg-orange-700'
                            });
                            if (confirmed) {
                              bookmark.clearGistId();
                            }
                          }}
                          className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded"
                        >
                          Clear Gist ID
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Synchronization</h3>
            
            {/* Auto Sync Settings */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Auto Sync</h4>
                  <p className="text-sm text-gray-600">Automatically sync your changes at regular intervals</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => {}}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Sync every:</span>
                <select 
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                  defaultValue={5}
                  onChange={() => {}}
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>

            {/* Manual Sync */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  {bookmark.lastSyncAt 
                    ? `Last synced: ${bookmark.lastSyncAt.toLocaleString()}`
                    : 'Never synced'
                  }
                </p>
                {bookmark.isDirty && (
                  <p className="text-amber-600 text-sm">You have unsaved changes</p>
                )}
              </div>
              <Button
                onClick={() => bookmark.syncWithRemote()}
                disabled={bookmark.isLoading}
                isLoading={bookmark.isLoading}
              >
                Sync Now
              </Button>
            </div>
          </div>

          {/* Import/Export */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import & Export</h3>
            <p className="text-gray-600 mb-4">
              Export your bookmarks as Markdown or import from a file
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={handleExportMarkdown}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Markdown
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleImportFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import File
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
        
        {(() => {
          const stats = bookmark.getStats();
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.categoriesCount}</div>
                <div className="text-sm text-gray-500">Categories</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.bundlesCount}</div>
                <div className="text-sm text-gray-500">Bundles</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.bookmarksCount}</div>
                <div className="text-sm text-gray-500">Bookmarks</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.tagsCount}</div>
                <div className="text-sm text-gray-500">Unique Tags</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Reset All Data</h3>
          <p className="text-gray-600 mb-4">
            This will permanently delete all your local bookmarks. Remote data in GitHub Gist will not be affected.
          </p>
          <Button
            variant="destructive"
            onClick={handleReset}
          >
            Reset Local Data
          </Button>
        </div>
      </div>

    </div>
  );
};