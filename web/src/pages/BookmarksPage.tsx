import React from 'react';
import { useBookmarkContext } from '../contexts/AppProvider';

export const BookmarksPage: React.FC = () => {
  const bookmark = useBookmarkContext();

  const statsResult = bookmark.getStats();
  const stats = statsResult.success ? statsResult.data : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookmarks</h1>
          <p className="text-gray-600">Organize and manage your bookmark collection</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            Add Category
          </button>
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            Import
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.categoriesCount}</div>
            <div className="text-sm text-gray-500">Categories</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.bundlesCount}</div>
            <div className="text-sm text-gray-500">Bundles</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.bookmarksCount}</div>
            <div className="text-sm text-gray-500">Bookmarks</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.tagsCount}</div>
            <div className="text-sm text-gray-500">Tags</div>
          </div>
        </div>
      )}

      {/* Content */}
      {bookmark.root.categories.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No bookmarks yet</h2>
          <p className="text-gray-600 mb-6">Start by creating your first category to organize your bookmarks</p>
          <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors">
            Create First Category
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {bookmark.root.categories.map((category) => (
            <div key={category.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="text-xl mr-2">📂</span>
                    {category.name}
                  </h3>
                  <div className="flex space-x-2">
                    <button className="text-sm text-gray-600 hover:text-gray-900">Edit</button>
                    <button className="text-sm text-red-600 hover:text-red-900">Delete</button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {category.bundles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bundles in this category</p>
                    <button className="mt-2 text-primary-600 hover:text-primary-700">Add Bundle</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {category.bundles.map((bundle) => (
                      <div key={bundle.name} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 flex items-center">
                              <span className="text-lg mr-2">🧳</span>
                              {bundle.name}
                            </h4>
                            <span className="text-sm text-gray-500">{bundle.bookmarks.length} bookmarks</span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          {bundle.bookmarks.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No bookmarks in this bundle</p>
                          ) : (
                            <div className="space-y-3">
                              {bundle.bookmarks.map((bookmark) => (
                                <div key={bookmark.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <a 
                                        href={bookmark.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                      >
                                        {bookmark.title}
                                      </a>
                                      <div className="text-sm text-gray-500 mt-1">{bookmark.url}</div>
                                      {bookmark.notes && (
                                        <div className="text-sm text-gray-600 mt-1 italic">{bookmark.notes}</div>
                                      )}
                                      {bookmark.tags && bookmark.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {bookmark.tags.map((tag) => (
                                            <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex space-x-2 ml-4">
                                      <button className="text-gray-400 hover:text-gray-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button className="text-gray-400 hover:text-red-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};