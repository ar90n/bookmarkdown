import React, { useState, useCallback } from 'react';
import { useBookmarkContext, useDialogContext } from '../contexts/AppProvider';
import { DnDProvider, DraggableBookmark, DraggableBundle, DraggableCategory, DroppableBundle, DroppableCategory, DroppableCategories, DroppableBundleContainer, DroppableBookmarkGrid } from '../components/dnd';
import { useChromeExtension } from '../hooks/useChromeExtension';
import { useToast } from '../hooks/useToast';
import { useMobile } from '../hooks/useMobile';
import { Toast } from '../components/ui/Toast';
import { MobileMenu } from '../components/ui/MobileMenu';
import { MoveModal } from '../components/ui/MoveModal';
import { filterActiveBookmarks } from '../lib/core/bookmark';
import { filterActiveBundles, filterActiveCategories } from '../lib/utils/metadata';

export const BookmarksPage: React.FC = () => {
  const bookmark = useBookmarkContext();
  const dialog = useDialogContext();
  const chromeExtension = useChromeExtension();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();
  const isMobile = useMobile();

  // Move modal state
  const [moveModal, setMoveModal] = useState<{
    isOpen: boolean;
    itemType: 'bookmark' | 'bundle';
    currentCategory: string;
    currentBundle?: string;
    itemId: string;
    itemName: string;
  }>({
    isOpen: false,
    itemType: 'bookmark',
    currentCategory: '',
    currentBundle: '',
    itemId: '',
    itemName: ''
  });

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
    const confirmed = await dialog.openConfirmDialog({
      title: 'Delete Bookmark',
      message: `Are you sure you want to delete "${bookmarkTitle}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
    
    if (confirmed) {
      try {
        await bookmark.removeBookmark(categoryName, bundleName, bookmarkId);
      } catch (error) {
        console.error('🖱️ UI: Failed to delete bookmark:', error);
      }
    } else {
    }
  }, [bookmark, dialog]);

  const handleEditCategory = useCallback((categoryName: string) => {
    dialog.openCategoryEditDialog(categoryName);
  }, [dialog]);

  const handleDeleteCategory = useCallback(async (categoryName: string) => {
    const confirmed = await dialog.openConfirmDialog({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${categoryName}" and all its contents?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
    
    if (confirmed) {
      try {
        await bookmark.removeCategory(categoryName);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  }, [bookmark, dialog]);

  const handleEditBundle = useCallback((categoryName: string, bundleName: string) => {
    dialog.openBundleEditDialog(categoryName, bundleName);
  }, [dialog]);

  const handleDeleteBundle = useCallback(async (categoryName: string, bundleName: string) => {
    const confirmed = await dialog.openConfirmDialog({
      title: 'Delete Bundle',
      message: `Are you sure you want to delete the bundle "${bundleName}" and all its bookmarks?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700'
    });
    
    if (confirmed) {
      try {
        await bookmark.removeBundle(categoryName, bundleName);
      } catch (error) {
        console.error('Failed to delete bundle:', error);
      }
    }
  }, [bookmark, dialog]);

  const handleImportTabs = useCallback(async () => {
    try {
      // First get the tabs to show count in confirmation
      const tabs = await chromeExtension.getAllTabs();
      if (tabs.length === 0) {
        showError('No tabs found to import');
        return;
      }

      // Show confirmation dialog
      const confirmed = await dialog.openConfirmDialog({
        title: 'Import Browser Tabs',
        message: `Import ${tabs.length} tab${tabs.length !== 1 ? 's' : ''} to "Browser Tabs" category?`,
        confirmText: 'Import',
        cancelText: 'Cancel',
        confirmButtonClass: 'bg-green-600 hover:bg-green-700'
      });
      
      if (!confirmed) {
        return;
      }

      showInfo('Importing tabs...');

      const categoryName = 'Browser Tabs';
      const bundleName = `Tabs ${new Date().toLocaleString()}`;
      
      await bookmark.addCategory(categoryName);
      await bookmark.addBundle(categoryName, bundleName);
      
      // Batch import all tabs at once to avoid API rate limits
      const bookmarkInputs = tabs.map(tab => ({
        title: tab.title,
        url: tab.url,
        tags: ['import', 'tabs'],
        notes: 'Imported from browser tabs'
      }));
      
      await bookmark.addBookmarksBatch(categoryName, bundleName, bookmarkInputs);
      
      showSuccess(`Successfully imported ${tabs.length} tabs as "${bundleName}"`);
    } catch (error) {
      showError('Failed to import tabs. Please make sure the Chrome extension is active.');
    }
  }, [bookmark, chromeExtension, showSuccess, showError, showInfo]);

  // Mobile move handlers
  const handleMoveBookmark = useCallback((categoryName: string, bundleName: string, bookmarkId: string, bookmarkTitle: string) => {
    setMoveModal({
      isOpen: true,
      itemType: 'bookmark',
      currentCategory: categoryName,
      currentBundle: bundleName,
      itemId: bookmarkId,
      itemName: bookmarkTitle
    });
  }, []);

  const handleMoveBundle = useCallback((categoryName: string, bundleName: string) => {
    setMoveModal({
      isOpen: true,
      itemType: 'bundle',
      currentCategory: categoryName,
      itemId: bundleName,
      itemName: bundleName
    });
  }, []);

  const handleMoveConfirm = useCallback(async (targetCategory: string, targetBundle?: string) => {
    try {
      if (moveModal.itemType === 'bookmark') {
        
        await bookmark.moveBookmark(
          moveModal.currentCategory,
          moveModal.currentBundle!,
          targetCategory,
          targetBundle!,
          moveModal.itemId
        );
        
        showSuccess(`Moved bookmark "${moveModal.itemName}" to ${targetCategory}/${targetBundle}`);
      } else {
        await bookmark.moveBundle(
          moveModal.currentCategory,
          moveModal.itemId,
          targetCategory
        );
        showSuccess(`Moved bundle "${moveModal.itemName}" to ${targetCategory}`);
      }
    } catch (error) {
      showError(`Failed to move ${moveModal.itemType}`);
    }
  }, [moveModal, bookmark, showSuccess, showError]);

  // Show loading spinner during initial sync
  if (!bookmark.initialSyncCompleted && bookmark.isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Syncing with Gist...</p>
      </div>
    );
  }

  return (
    <DnDProvider>
      <div className="space-y-6">
        {/* Toast notifications */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Bookmarks</h1>
            <p className="text-sm sm:text-base text-gray-600">Organize and manage your bookmark collection</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button 
              onClick={dialog.openCategoryDialog}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base"
            >
              Add Category
            </button>
            {chromeExtension.isAvailable && (
              <button 
                onClick={handleImportTabs}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                Import Tabs
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {filterActiveCategories(bookmark.root.categories).length === 0 ? (
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
          <DroppableCategories categoryCount={filterActiveCategories(bookmark.root.categories).length}>
            <div className="space-y-6">
              {filterActiveCategories(bookmark.root.categories).map((category, index) => (
                <DraggableCategory key={category.name} categoryName={category.name} index={index}>
                  <DroppableCategory key={category.name} categoryName={category.name} bundleCount={filterActiveBundles(category.bundles).length}>
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
                      isMobile={isMobile}
                      handleMoveBookmark={handleMoveBookmark}
                      handleMoveBundle={handleMoveBundle}
                    />
                  </DroppableCategory>
                </DraggableCategory>
              ))}
            </div>
          </DroppableCategories>
        )}
      </div>

      {/* Move Modal */}
      <MoveModal
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal(prev => ({ ...prev, isOpen: false }))}
        itemType={moveModal.itemType}
        currentCategory={moveModal.currentCategory}
        currentBundle={moveModal.currentBundle}
        itemId={moveModal.itemId}
        itemName={moveModal.itemName}
        onMove={handleMoveConfirm}
      />
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
  isMobile: boolean;
  handleMoveBookmark: (categoryName: string, bundleName: string, bookmarkId: string, bookmarkTitle: string) => void;
  handleMoveBundle: (categoryName: string, bundleName: string) => void;
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
  categoryDropHighlight,
  isMobile,
  handleMoveBookmark,
  handleMoveBundle
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
            {isMobile ? (
              <MobileMenu
                onEdit={() => handleEditCategory(category.name)}
                onDelete={() => handleDeleteCategory(category.name)}
              />
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
      
      {!collapsedCategories.has(category.name) && (
        <div className="p-6">
          {filterActiveBundles(category.bundles).length === 0 ? (
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
            <DroppableBundleContainer categoryName={category.name} bundleCount={filterActiveBundles(category.bundles).length}>
              <div className="space-y-4">
                {filterActiveBundles(category.bundles).map((bundle, index) => {
                  const bundleKey = `${category.name}/${bundle.name}`;
                  return (
                  <DraggableBundle key={bundle.name} bundle={bundle} categoryName={category.name} index={index}>
                    <DroppableBundle categoryName={category.name} bundleName={bundle.name} bookmarkCount={filterActiveBookmarks(bundle.bookmarks).length}>
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
                      isMobile={isMobile}
                      handleMoveBookmark={handleMoveBookmark}
                      handleMoveBundle={handleMoveBundle}
                      />
                    </DroppableBundle>
                  </DraggableBundle>
                  );
                })}
              </div>
            </DroppableBundleContainer>
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
  isMobile: boolean;
  handleMoveBookmark: (categoryName: string, bundleName: string, bookmarkId: string, bookmarkTitle: string) => void;
  handleMoveBundle: (categoryName: string, bundleName: string) => void;
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
  bundleDropHighlight,
  isMobile,
  handleMoveBookmark,
  handleMoveBundle
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
            <span className="text-sm text-gray-500">{filterActiveBookmarks(bundle.bookmarks).length} bookmarks</span>
            <div className="flex items-center space-x-1">
              {isMobile ? (
                <MobileMenu
                  onMove={() => handleMoveBundle(category.name, bundle.name)}
                  onEdit={() => handleEditBundle(category.name, bundle.name)}
                  onDelete={() => handleDeleteBundle(category.name, bundle.name)}
                />
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {!collapsedBundles.has(bundleKey) && (
        <div className="p-4">
          {filterActiveBookmarks(bundle.bookmarks).length === 0 ? (
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
              <DroppableBookmarkGrid 
                categoryName={category.name} 
                bundleName={bundle.name} 
                bookmarkCount={filterActiveBookmarks(bundle.bookmarks).length}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filterActiveBookmarks(bundle.bookmarks).map((bookmark, index) => (
                  <DraggableBookmark 
                    key={bookmark.id} 
                    bookmark={bookmark} 
                    categoryName={category.name} 
                    bundleName={bundle.name}
                    index={index}
                  >
                    <a 
                      href={bookmark.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block hover:no-underline group"
                    >
                      <div className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md border border-gray-200 p-4 transition-all duration-200 h-fit cursor-pointer">
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <h3 className="text-primary-600 group-hover:text-primary-700 font-medium block mb-2 line-clamp-2">
                              {bookmark.title}
                            </h3>
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
                          <div 
                            className="flex justify-end space-x-2 pt-2 border-t border-gray-100"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              e.preventDefault(); 
                            }}
                          >
                            {isMobile ? (
                              <MobileMenu
                                onMove={() => handleMoveBookmark(category.name, bundle.name, bookmark.id, bookmark.title)}
                                onEdit={() => handleEditBookmark(category.name, bundle.name, bookmark)}
                                onDelete={() => handleDeleteBookmark(category.name, bundle.name, bookmark.id, bookmark.title)}
                              />
                            ) : (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleEditBookmark(category.name, bundle.name, bookmark);
                                  }}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Edit bookmark"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteBookmark(category.name, bundle.name, bookmark.id, bookmark.title);
                                  }}
                                  className="text-gray-400 hover:text-red-600"
                                  title="Delete bookmark"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  </DraggableBookmark>
                ))}
              </DroppableBookmarkGrid>
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