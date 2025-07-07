import { useState, useCallback, useEffect } from 'react';
import { BookmarkContextValue } from '../BookmarkContext.js';
import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats } from '../../types/index.js';
import { BookmarkService, createBookmarkService } from '../../adapters/index.js';
import { createRoot } from '../../core/index.js';
import { createLocalStorageShell } from '../../shell/storage.js';
import { createSyncShell } from '../../shell/sync.js';

interface BookmarkContextConfig {
  accessToken?: string;
  storageKey?: string;
  filename?: string;
  autoSave?: boolean;
}

export function useBookmarkContextProvider(config: BookmarkContextConfig): BookmarkContextValue {
  const STORAGE_KEY = config.storageKey || 'bookmarkdown_data';
  
  // State management - imperative, mutable
  const [root, setRoot] = useState<Root>(createRoot());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Service management
  const [service, setService] = useState<BookmarkService>(() => {
    // Initialize with localStorage-only service
    const storageShell = createLocalStorageShell({ storageKey: STORAGE_KEY });
    const svc = createBookmarkService();
    
    // Try to load from localStorage
    const loadResult = storageShell.load<Root>();
    if (loadResult.success && loadResult.data) {
      svc.setRoot(loadResult.data);
      setRoot(loadResult.data);
    }
    
    return svc;
  });

  // Update service when access token changes
  useEffect(() => {
    if (config.accessToken) {
      // Create sync-enabled service
      const syncShell = createSyncShell({
        accessToken: config.accessToken,
        filename: config.filename || 'bookmarks.md'
      });
      const newService = createBookmarkService(syncShell);
      newService.setRoot(root);
      setService(newService);
    } else {
      // Fallback to localStorage-only service
      const storageShell = createLocalStorageShell({ storageKey: STORAGE_KEY });
      const newService = createBookmarkService();
      newService.setRoot(root);
      setService(newService);
    }
  }, [config.accessToken, config.filename, root, STORAGE_KEY]);

  // Auto-save to localStorage when root changes
  useEffect(() => {
    if (config.autoSave !== false && isDirty) {
      const storageShell = createLocalStorageShell({ storageKey: STORAGE_KEY });
      storageShell.save(root);
    }
  }, [root, isDirty, config.autoSave, STORAGE_KEY]);

  // Helper to handle async operations
  const handleOperation = useCallback(async (
    operation: () => { success: boolean; data?: any; error?: Error },
    updateRoot: boolean = true
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = operation();
      
      if (result.success) {
        if (updateRoot && result.data) {
          setRoot(result.data);
          service.setRoot(result.data);
        }
        setIsDirty(true);
      } else {
        setError(result.error ? result.error.message : 'Operation failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // Category operations
  const addCategory = useCallback(async (name: string) => {
    await handleOperation(() => service.addCategory(name));
  }, [service, handleOperation]);

  const removeCategory = useCallback(async (name: string) => {
    await handleOperation(() => service.removeCategory(name));
  }, [service, handleOperation]);

  const renameCategory = useCallback(async (oldName: string, newName: string) => {
    await handleOperation(() => service.renameCategory(oldName, newName));
  }, [service, handleOperation]);

  // Bundle operations
  const addBundle = useCallback(async (categoryName: string, bundleName: string) => {
    await handleOperation(() => service.addBundle(categoryName, bundleName));
  }, [service, handleOperation]);

  const removeBundle = useCallback(async (categoryName: string, bundleName: string) => {
    await handleOperation(() => service.removeBundle(categoryName, bundleName));
  }, [service, handleOperation]);

  const renameBundle = useCallback(async (categoryName: string, oldName: string, newName: string) => {
    await handleOperation(() => service.renameBundle(categoryName, oldName, newName));
  }, [service, handleOperation]);

  // Bookmark operations
  const addBookmark = useCallback(async (categoryName: string, bundleName: string, bookmark: BookmarkInput) => {
    await handleOperation(() => service.addBookmark(categoryName, bundleName, bookmark));
  }, [service, handleOperation]);

  const updateBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => {
    await handleOperation(() => service.updateBookmark(categoryName, bundleName, bookmarkId, update));
  }, [service, handleOperation]);

  const removeBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string) => {
    await handleOperation(() => service.removeBookmark(categoryName, bundleName, bookmarkId));
  }, [service, handleOperation]);

  // Search and stats
  const searchBookmarks = useCallback((filter?: BookmarkFilter): BookmarkSearchResult[] => {
    try {
      return service.searchBookmarks(filter || {});
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
      return [];
    }
  }, [service]);

  const getStats = useCallback((): BookmarkStats => {
    try {
      return service.getStats();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Stats failed');
      return { categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 };
    }
  }, [service]);

  // Sync operations
  const syncWithRemote = useCallback(async () => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await service.syncWithRemote();
      if (result.success) {
        const newRoot = service.getRoot();
        setRoot(newRoot);
        setLastSyncAt(new Date());
        setIsDirty(false);
      } else {
        setError(result.error.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [service, config.accessToken]);

  const loadFromRemote = useCallback(async () => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await service.loadFromSync();
      if (result.success) {
        setRoot(result.data);
        service.setRoot(result.data);
        setLastSyncAt(new Date());
        setIsDirty(false);
      } else {
        setError(result.error.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Load failed');
    } finally {
      setIsLoading(false);
    }
  }, [service, config.accessToken]);

  const saveToRemote = useCallback(async () => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await service.saveToSync();
      if (result.success) {
        setLastSyncAt(new Date());
        setIsDirty(false);
      } else {
        setError(result.error.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsLoading(false);
    }
  }, [service, config.accessToken]);

  // State management
  const resetState = useCallback(() => {
    const newRoot = createRoot();
    setRoot(newRoot);
    service.setRoot(newRoot);
    setError(null);
    setIsLoading(false);
    setLastSyncAt(null);
    setIsDirty(false);
  }, [service]);

  return {
    // State
    root,
    isLoading,
    error,
    lastSyncAt,
    isDirty,
    
    // Operations
    addCategory,
    removeCategory,
    renameCategory,
    addBundle,
    removeBundle,
    renameBundle,
    addBookmark,
    updateBookmark,
    removeBookmark,
    searchBookmarks,
    getStats,
    syncWithRemote,
    loadFromRemote,
    saveToRemote,
    setError,
    clearError: () => setError(null),
    resetState
  };
}