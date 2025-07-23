import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext, useBookmarkContext } from '../../contexts/AppProvider';
import { Button } from '../UI/Button';
import { UserProfile } from '../Auth/UserProfile';
import { SyncStatusWithActions } from '../ui/SyncStatusWithActions';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const auth = useAuthContext();
  const bookmark = useBookmarkContext();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button and Logo */}
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors mr-3"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-lg">
                <span className="text-white font-bold text-sm">📚</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">BookMarkDown</h1>
                <p className="text-xs text-gray-500">Portable bookmark management</p>
              </div>
            </Link>
          </div>

          {/* Stats */}
          {auth.isAuthenticated && (
            <div className="hidden md:flex items-center space-x-6">
              {(() => {
                const stats = bookmark.getStats();
                return (
                  <>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{stats.categoriesCount}</div>
                      <div className="text-xs text-gray-500">Categories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{stats.bundlesCount}</div>
                      <div className="text-xs text-gray-500">Bundles</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{stats.bookmarksCount}</div>
                      <div className="text-xs text-gray-500">Bookmarks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{stats.tagsCount}</div>
                      <div className="text-xs text-gray-500">Tags</div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {auth.isAuthenticated ? (
              <>
                {/* Sync status with actions */}
                <SyncStatusWithActions className="hidden sm:flex" />

                {/* Dirty indicator */}
                {bookmark.isDirty && (
                  <div className="flex items-center text-xs text-amber-600">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mr-1"></div>
                    Unsaved changes
                  </div>
                )}

                <UserProfile />
              </>
            ) : (
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {(auth.error || bookmark.error) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800">
                  {auth.error || bookmark.error}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  auth.clearError();
                  bookmark.clearError();
                }}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};