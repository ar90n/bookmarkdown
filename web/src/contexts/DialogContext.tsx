import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Bookmark } from 'bookmarkdown';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SyncConflictDialog } from '../components/Dialogs/SyncConflictDialog';
import { dialogStateRef, dialogCallbackRef } from '../lib/context/providers/dialog-state-ref';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  resolve: ((result: boolean) => void) | null;
}

interface SyncConflictDialogState {
  isOpen: boolean;
  onLoadRemote: (() => void) | null;
  onSaveLocal: (() => void) | null;
}

interface DialogContextValue {
  isCategoryDialogOpen: boolean;
  openCategoryDialog: () => void;
  openCategoryEditDialog: (categoryName: string) => void;
  closeCategoryDialog: () => void;
  editingCategoryName: string | null;
  isBundleDialogOpen: boolean;
  openBundleDialog: (categoryName: string) => void;
  openBundleEditDialog: (categoryName: string, bundleName: string) => void;
  closeBundleDialog: () => void;
  selectedCategoryForBundle: string | null;
  editingBundleName: string | null;
  isBookmarkDialogOpen: boolean;
  openBookmarkDialog: (categoryName: string, bundleName: string) => void;
  openBookmarkEditDialog: (categoryName: string, bundleName: string, bookmark: Bookmark) => void;
  closeBookmarkDialog: () => void;
  selectedCategoryForBookmark: string | null;
  selectedBundleForBookmark: string | null;
  editingBookmark: Bookmark | null;
  isCreateGistDialogOpen: boolean;
  openCreateGistDialog: () => void;
  closeCreateGistDialog: () => void;
  gistCreationCallback: ((isPublic: boolean) => void) | null;
  setGistCreationCallback: (callback: (isPublic: boolean) => void) => void;
  isImportDialogOpen: boolean;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  isExportDialogOpen: boolean;
  openExportDialog: () => void;
  closeExportDialog: () => void;
  confirmDialog: ConfirmDialogState;
  openConfirmDialog: (options: Omit<ConfirmDialogState, 'isOpen' | 'resolve'>) => Promise<boolean>;
  syncConflictDialog: SyncConflictDialogState;
  openSyncConflictDialog: (options: { onLoadRemote: () => void; onSaveLocal: () => void }) => void;
  closeSyncConflictDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialogContext must be used within a DialogProvider');
  }
  return context;
};

interface DialogProviderProps {
  children: ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [isBundleDialogOpen, setIsBundleDialogOpen] = useState(false);
  const [selectedCategoryForBundle, setSelectedCategoryForBundle] = useState<string | null>(null);
  const [editingBundleName, setEditingBundleName] = useState<string | null>(null);
  const [isBookmarkDialogOpen, setIsBookmarkDialogOpen] = useState(false);
  const [selectedCategoryForBookmark, setSelectedCategoryForBookmark] = useState<string | null>(null);
  const [selectedBundleForBookmark, setSelectedBundleForBookmark] = useState<string | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isCreateGistDialogOpen, setIsCreateGistDialogOpen] = useState(false);
  const [gistCreationCallback, setGistCreationCallback] = useState<((isPublic: boolean) => void) | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    resolve: null
  });
  const [syncConflictDialog, setSyncConflictDialog] = useState<SyncConflictDialogState>({
    isOpen: false,
    onLoadRemote: null,
    onSaveLocal: null
  });

  const openCategoryDialog = () => {
    setEditingCategoryName(null);
    setIsCategoryDialogOpen(true);
  };

  const openCategoryEditDialog = (categoryName: string) => {
    setEditingCategoryName(categoryName);
    setIsCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategoryName(null);
  };

  const openBundleDialog = (categoryName: string) => {
    setSelectedCategoryForBundle(categoryName);
    setEditingBundleName(null);
    setIsBundleDialogOpen(true);
  };

  const openBundleEditDialog = (categoryName: string, bundleName: string) => {
    setSelectedCategoryForBundle(categoryName);
    setEditingBundleName(bundleName);
    setIsBundleDialogOpen(true);
  };

  const closeBundleDialog = () => {
    setIsBundleDialogOpen(false);
    setSelectedCategoryForBundle(null);
    setEditingBundleName(null);
  };

  const openBookmarkDialog = (categoryName: string, bundleName: string) => {
    setSelectedCategoryForBookmark(categoryName);
    setSelectedBundleForBookmark(bundleName);
    setEditingBookmark(null);
    setIsBookmarkDialogOpen(true);
  };

  const openBookmarkEditDialog = (categoryName: string, bundleName: string, bookmark: Bookmark) => {
    setSelectedCategoryForBookmark(categoryName);
    setSelectedBundleForBookmark(bundleName);
    setEditingBookmark(bookmark);
    setIsBookmarkDialogOpen(true);
  };

  const closeBookmarkDialog = () => {
    setIsBookmarkDialogOpen(false);
    setSelectedCategoryForBookmark(null);
    setSelectedBundleForBookmark(null);
    setEditingBookmark(null);
  };

  const openCreateGistDialog = () => setIsCreateGistDialogOpen(true);
  const closeCreateGistDialog = () => {
    setIsCreateGistDialogOpen(false);
    setGistCreationCallback(null);
  };

  const openImportDialog = () => setIsImportDialogOpen(true);
  const closeImportDialog = () => setIsImportDialogOpen(false);

  const openExportDialog = () => setIsExportDialogOpen(true);
  const closeExportDialog = () => setIsExportDialogOpen(false);

  const openConfirmDialog = (options: Omit<ConfirmDialogState, 'isOpen' | 'resolve'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        ...options,
        isOpen: true,
        resolve
      });
    });
  };

  const handleConfirmDialogResult = (result: boolean) => {
    if (confirmDialog.resolve) {
      confirmDialog.resolve(result);
    }
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      resolve: null
    });
  };

  const openSyncConflictDialog = (options: { onLoadRemote: () => void; onSaveLocal: () => void }) => {
    setSyncConflictDialog({
      isOpen: true,
      onLoadRemote: options.onLoadRemote,
      onSaveLocal: options.onSaveLocal
    });
  };

  const closeSyncConflictDialog = () => {
    setSyncConflictDialog({
      isOpen: false,
      onLoadRemote: null,
      onSaveLocal: null
    });
  };
  
  // Update dialog state ref when conflict dialog state changes
  useEffect(() => {
    dialogStateRef.isConflictDialogOpen = syncConflictDialog.isOpen;
  }, [syncConflictDialog.isOpen]);
  
  // Set dialog callback ref on mount
  useEffect(() => {
    dialogCallbackRef.openSyncConflictDialog = openSyncConflictDialog;
    
    // Clear on unmount
    return () => {
      dialogCallbackRef.openSyncConflictDialog = null;
    };
  }, [openSyncConflictDialog]);

  return (
    <DialogContext.Provider value={{
      isCategoryDialogOpen,
      openCategoryDialog,
      openCategoryEditDialog,
      closeCategoryDialog,
      editingCategoryName,
      isBundleDialogOpen,
      openBundleDialog,
      openBundleEditDialog,
      closeBundleDialog,
      selectedCategoryForBundle,
      editingBundleName,
      isBookmarkDialogOpen,
      openBookmarkDialog,
      openBookmarkEditDialog,
      closeBookmarkDialog,
      selectedCategoryForBookmark,
      selectedBundleForBookmark,
      editingBookmark,
      isCreateGistDialogOpen,
      openCreateGistDialog,
      closeCreateGistDialog,
      gistCreationCallback,
      setGistCreationCallback,
      isImportDialogOpen,
      openImportDialog,
      closeImportDialog,
      isExportDialogOpen,
      openExportDialog,
      closeExportDialog,
      confirmDialog,
      openConfirmDialog,
      syncConflictDialog,
      openSyncConflictDialog,
      closeSyncConflictDialog,
    }}>
      {children}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          confirmButtonClass={confirmDialog.confirmButtonClass}
          onConfirm={() => handleConfirmDialogResult(true)}
          onCancel={() => handleConfirmDialogResult(false)}
        />
      )}
      {syncConflictDialog.isOpen && (
        <SyncConflictDialog
          isOpen={syncConflictDialog.isOpen}
          onClose={closeSyncConflictDialog}
          onLoadRemote={() => {
            syncConflictDialog.onLoadRemote?.();
            closeSyncConflictDialog();
          }}
          onSaveLocal={() => {
            syncConflictDialog.onSaveLocal?.();
            closeSyncConflictDialog();
          }}
        />
      )}
    </DialogContext.Provider>
  );
};