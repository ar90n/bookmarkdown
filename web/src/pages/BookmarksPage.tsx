import React, { useState, useCallback } from 'react';
import { useBookmarkContext, useDialogContext } from '../contexts/AppProvider';
import { DnDProvider, DraggableBookmark, DraggableBundle, DroppableBundle, DroppableCategory } from '../components/dnd';

export const BookmarksPage: React.FC = () => {
  const bookmark = useBookmarkContext();
  const dialog = useDialogContext();

  const stats = bookmark.getStats();

  // Collapse state management
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedBundles, setCollapsedBundles] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((categoryName: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  const toggleBundle = useCallback((categoryName: string, bundleName: string) => {
    const bundleKey = `${categoryName}/${bundleName}`;
    setCollapsedBundles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bundleKey)) {
        newSet.delete(bundleKey);
      } else {
        newSet.add(bundleKey);
      }
      return newSet;
    });
  }, []);

  const handleEditBookmark = useCallback((categoryName: string, bundleName: string, bookmark: any) => {
    dialog.openBookmarkEditDialog(categoryName, bundleName, bookmark);
  }, [dialog]);

  const handleDeleteBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string, bookmarkTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${bookmarkTitle}"?`)) {
      try {
        await bookmark.removeBookmark(categoryName, bundleName, bookmarkId);
      } catch (error) {
        console.error('Failed to delete bookmark:', error);
      }
    }
  }, [bookmark]);

  const handleEditCategory = useCallback((categoryName: string) => {
    dialog.openCategoryEditDialog(categoryName);
  }, [dialog]);

  const handleDeleteCategory = useCallback(async (categoryName: string) => {
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}" and all its contents?`)) {
      try {
        await bookmark.removeCategory(categoryName);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  }, [bookmark]);

  const handleEditBundle = useCallback((categoryName: string, bundleName: string) => {
    dialog.openBundleEditDialog(categoryName, bundleName);
  }, [dialog]);

  const handleDeleteBundle = useCallback(async (categoryName: string, bundleName: string) => {
    if (window.confirm(`Are you sure you want to delete the bundle "${bundleName}" and all its bookmarks?`)) {
      try {
        await bookmark.removeBundle(categoryName, bundleName);
      } catch (error) {
        console.error('Failed to delete bundle:', error);
      }
    }
  }, [bookmark]);

  return (
    <DnDProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Bookmarks</h1>
            <p className="text-gray-600">Organize and manage your bookmark collection</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={dialog.openCategoryDialog}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
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
            <button 
              onClick={dialog.openCategoryDialog}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create First Category
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {bookmark.root.categories.map((category) => (
              <DroppableCategory key={category.name} categoryName={category.name}>
                <CategoryComponent 
                  category={category}
                  collapsedCategories={collapsedCategories}
                  collapsedBundles={collapsedBundles}
                  toggleCategory={toggleCategory}
                  toggleBundle={toggleBundle}
                  dialog={dialog}
                  handleEditCategory={handleEditCategory}
                  handleDeleteCategory={handleDeleteCategory}
                  handleEditBundle={handleEditBundle}
                  handleDeleteBundle={handleDeleteBundle}
                  handleEditBookmark={handleEditBookmark}
                  handleDeleteBookmark={handleDeleteBookmark}
                />
              </DroppableCategory>
            ))}
          </div>
        )}
      </div>
    </DnDProvider>
  );
};

interface CategoryComponentProps {
  category: any;
  collapsedCategories: Set<string>;
  collapsedBundles: Set<string>;
  toggleCategory: (categoryName: string) => void;
  toggleBundle: (categoryName: string, bundleName: string) => void;
  dialog: any;
  handleEditCategory: (categoryName: string) => void;
  handleDeleteCategory: (categoryName: string) => void;
  handleEditBundle: (categoryName: string, bundleName: string) => void;
  handleDeleteBundle: (categoryName: string, bundleName: string) => void;
  handleEditBookmark: (categoryName: string, bundleName: string, bookmark: any) => void;
  handleDeleteBookmark: (categoryName: string, bundleName: string, bookmarkId: string, bookmarkTitle: string) => void;
  categoryDropHighlight?: boolean;
}

const CategoryComponent: React.FC<CategoryComponentProps> = ({
  category,
  collapsedCategories,
  collapsedBundles,
  toggleCategory,
  toggleBundle,
  dialog,
  handleEditCategory,
  handleDeleteCategory,
  handleEditBundle,
  handleDeleteBundle,
  handleEditBookmark,
  handleDeleteBookmark,
  categoryDropHighlight
}) => {
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      style={{
        backgroundColor: categoryDropHighlight ? '#e6f3ff' : undefined,
        transition: 'background-color 0.2s ease',
      }}
    >
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 -mx-2 px-2 py-1 rounded transition-colors"
            onClick={() => toggleCategory(category.name)}
          >
            <div className={`transition-transform duration-200 mr-2 ${collapsedCategories.has(category.name) ? 'rotate-0' : 'rotate-90'}`}>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-xl mr-2">📂</span>
              {category.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => dialog.openBundleDialog(category.name)}
              className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50 transition-colors"
              title="Add Bundle"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button 
              onClick={() => handleEditCategory(category.name)}
              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
              title="Edit Category"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button 
              onClick={() => handleDeleteCategory(category.name)}
              className="text-gray-600 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
              title="Delete Category"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {!collapsedCategories.has(category.name) && (
        <div className="p-6">
          {category.bundles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No bundles in this category</p>
              <button 
                onClick={() => dialog.openBundleDialog(category.name)}
                className="mt-2 text-primary-600 hover:text-primary-700"
              >
                Add Bundle
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {category.bundles.map((bundle) => {
                const bundleKey = `${category.name}/${bundle.name}`;
                return (
                <DraggableBundle key={bundle.name} bundle={bundle} categoryName={category.name}>
                  <DroppableBundle categoryName={category.name} bundleName={bundle.name}>
                    <BundleComponent 
                      bundle={bundle}
                      bundleKey={bundleKey}
                      category={category}
                      collapsedBundles={collapsedBundles}
                      toggleBundle={toggleBundle}
                      dialog={dialog}
                      handleEditBundle={handleEditBundle}
                      handleDeleteBundle={handleDeleteBundle}
                      handleEditBookmark={handleEditBookmark}
                      handleDeleteBookmark={handleDeleteBookmark}
                    />
                  </DroppableBundle>
                </DraggableBundle>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BundleComponentProps {
  bundle: any;
  bundleKey: string;
  category: any;
  collapsedBundles: Set<string>;
  toggleBundle: (categoryName: string, bundleName: string) => void;
  dialog: any;
  handleEditBundle: (categoryName: string, bundleName: string) => void;
  handleDeleteBundle: (categoryName: string, bundleName: string) => void;
  handleEditBookmark: (categoryName: string, bundleName: string, bookmark: any) => void;
  handleDeleteBookmark: (categoryName: string, bundleName: string, bookmarkId: string, bookmarkTitle: string) => void;
  bundleDropHighlight?: boolean;
}

const BundleComponent: React.FC<BundleComponentProps> = ({
  bundle,
  bundleKey,
  category,
  collapsedBundles,
  toggleBundle,
  dialog,
  handleEditBundle,
  handleDeleteBundle,
  handleEditBookmark,
  handleDeleteBookmark,
  bundleDropHighlight
}) => {
  return (
    <div 
      className="border border-gray-200 rounded-lg overflow-hidden" 
      style={{ 
        backgroundColor: bundleDropHighlight ? '#e6f3ff' : 'white',
        transition: 'background-color 0.2s ease'
      }}
    >
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 -mx-2 px-2 py-1 rounded transition-colors"
            onClick={() => toggleBundle(category.name, bundle.name)}
          >
            <div className={`transition-transform duration-200 mr-2 ${collapsedBundles.has(bundleKey) ? 'rotate-0' : 'rotate-90'}`}>
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 flex items-center">
              <span className="text-lg mr-2">🧳</span>
              {bundle.name}
            </h4>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">{bundle.bookmarks.length} bookmarks</span>
            <div className="flex items-center space-x-1">
              <button 
                onClick={() => dialog.openBookmarkDialog(category.name, bundle.name)}
                className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50 transition-colors"
                title="Add Bookmark"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button 
                onClick={() => handleEditBundle(category.name, bundle.name)}
                className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
                title="Edit Bundle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button 
                onClick={() => handleDeleteBundle(category.name, bundle.name)}
                className="text-gray-600 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                title="Delete Bundle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {!collapsedBundles.has(bundleKey) && (
        <div className="p-4">
          {bundle.bookmarks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">No bookmarks in this bundle</p>
              <button 
                onClick={() => dialog.openBookmarkDialog(category.name, bundle.name)}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                Add Bookmark
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bundle.bookmarks.map((bookmark) => (
                  <DraggableBookmark 
                    key={bookmark.id} 
                    bookmark={bookmark} 
                    categoryName={category.name} 
                    bundleName={bundle.name}
                  >
                    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors h-fit">
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <a 
                            href={bookmark.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 font-medium block mb-2 line-clamp-2"
                          >
                            {bookmark.title}
                          </a>
                          <div className="text-sm text-gray-500 mb-2 truncate">{bookmark.url}</div>
                          {bookmark.notes && (
                            <div className="text-sm text-gray-600 mb-2 italic line-clamp-2">{bookmark.notes}</div>
                          )}
                          {bookmark.tags && bookmark.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {bookmark.tags.map((tag) => (
                                <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                          <button 
                            onClick={() => handleEditBookmark(category.name, bundle.name, bookmark)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Edit bookmark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteBookmark(category.name, bundle.name, bookmark.id, bookmark.title)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete bookmark"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </DraggableBookmark>
                ))}
              </div>
              <div className="text-center pt-4 border-t border-gray-100 mt-4">
                <button 
                  onClick={() => dialog.openBookmarkDialog(category.name, bundle.name)}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  + Add Another Bookmark
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};