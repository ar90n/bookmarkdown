import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { useBookmarkContext, useDialogContext } from '../../contexts/AppProvider';
import { CategoryDialog } from '../Dialogs/CategoryDialog';
import { BundleDialog } from '../Dialogs/BundleDialog';
import { BookmarkDialog } from '../Dialogs/BookmarkDialog';
import { CreateGistDialog } from '../Dialogs/CreateGistDialog';
import { ImportDialog } from '../Dialogs/ImportDialog';
import { ExportDialog } from '../Dialogs/ExportDialog';
import { ErrorNotification } from '../ui/ErrorNotification';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export const Layout: React.FC = () => {
  const bookmark = useBookmarkContext();
  const dialog = useDialogContext();
  const errorHandler = useErrorHandler({
    onConflict: () => {
      // Could show a specific dialog for conflicts
      console.log('Sync conflict detected');
    },
    autoDismiss: true
  });

  const handleAddCategory = async (name: string) => {
    await bookmark.addCategory(name);
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    await bookmark.renameCategory(oldName, newName);
  };

  const handleAddBundle = async (categoryName: string, bundleName: string) => {
    await bookmark.addBundle(categoryName, bundleName);
  };

  const handleRenameBundle = async (categoryName: string, oldName: string, newName: string) => {
    await bookmark.renameBundle(categoryName, oldName, newName);
  };

  const handleAddBookmark = async (categoryName: string, bundleName: string, bookmarkData: any) => {
    await bookmark.addBookmark(categoryName, bundleName, bookmarkData);
  };

  const handleUpdateBookmark = async (categoryName: string, bundleName: string, bookmarkId: string, bookmarkData: any) => {
    await bookmark.updateBookmark(categoryName, bundleName, bookmarkId, bookmarkData);
  };

  const handleCreateGist = (isPublic: boolean) => {
    if (dialog.gistCreationCallback) {
      dialog.gistCreationCallback(isPublic);
      dialog.closeCreateGistDialog();
    }
  };

  const handleImport = async (data: string, format: 'json' | 'markdown') => {
    await bookmark.importData(data, format);
  };

  const handleExport = async (format: 'json' | 'markdown'): Promise<string> => {
    return await bookmark.exportData(format);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Navigation />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Error notification */}
      <ErrorNotification
        error={errorHandler.bookmarkError || errorHandler.authError}
        onDismiss={errorHandler.dismissError}
        onRetry={errorHandler.retrySync}
        onReload={errorHandler.reloadFromRemote}
        autoDismiss={true}
        dismissAfter={5000}
      />
      <Footer />
      
      <CategoryDialog
        isOpen={dialog.isCategoryDialogOpen}
        onClose={dialog.closeCategoryDialog}
        onSubmit={handleAddCategory}
        onRename={handleRenameCategory}
        editingCategoryName={dialog.editingCategoryName}
        isLoading={bookmark.isLoading}
      />
      
      <BundleDialog
        isOpen={dialog.isBundleDialogOpen}
        onClose={dialog.closeBundleDialog}
        onSubmit={handleAddBundle}
        onRename={handleRenameBundle}
        categoryName={dialog.selectedCategoryForBundle}
        editingBundleName={dialog.editingBundleName}
        isLoading={bookmark.isLoading}
      />
      
      <BookmarkDialog
        isOpen={dialog.isBookmarkDialogOpen}
        onClose={dialog.closeBookmarkDialog}
        onSubmit={handleAddBookmark}
        onUpdate={handleUpdateBookmark}
        categoryName={dialog.selectedCategoryForBookmark}
        bundleName={dialog.selectedBundleForBookmark}
        editingBookmark={dialog.editingBookmark}
        isLoading={bookmark.isLoading}
      />
      
      <CreateGistDialog
        isOpen={dialog.isCreateGistDialogOpen}
        onClose={dialog.closeCreateGistDialog}
        onCreate={handleCreateGist}
        isLoading={bookmark.isLoading}
      />
      
      <ImportDialog
        isOpen={dialog.isImportDialogOpen}
        onClose={dialog.closeImportDialog}
        onImport={handleImport}
        isLoading={bookmark.isLoading}
      />
      
      <ExportDialog
        isOpen={dialog.isExportDialogOpen}
        onClose={dialog.closeExportDialog}
        onExport={handleExport}
        isLoading={bookmark.isLoading}
      />
    </div>
  );
};