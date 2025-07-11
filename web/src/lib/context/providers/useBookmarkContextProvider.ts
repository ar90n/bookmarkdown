import { useState, useCallback, useEffect, useRef } from 'react';
import { BookmarkContextValue } from '../BookmarkContext.js';
import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats, MergeConflict, ConflictResolution } from '../../types/index.js';
import { BookmarkService, createBookmarkService } from '../../adapters/index.js';
import { createRoot } from '../../core/index.js';
import { createLocalStorageShell } from '../../shell/storage.js';
import { createSyncShell } from '../../shell/sync.js';
import { MarkdownGenerator } from '../../parsers/json-to-markdown.js';
import { MarkdownParser } from '../../parsers/markdown-to-json.js';

interface BookmarkContextConfig {
  accessToken?: string;
  storageKey?: string;
  filename?: string;
  autoSave?: boolean;
  gistId?: string;
}

export function useBookmarkContextProvider(config: BookmarkContextConfig): BookmarkContextValue {
  const STORAGE_KEY = config.storageKey || 'bookmarkdown_data';
  const GIST_ID_STORAGE_KEY = `${STORAGE_KEY}_gist_id`;
  const BROADCAST_CHANNEL_NAME = 'bookmarkdown_sync';
  
  // Service stateを永続化（useRefで参照を固定）
  const service = useRef<BookmarkService | null>(null);
  
  // BroadcastChannel for inter-tab communication
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  
  // GistID state management
  const [currentGistId, setCurrentGistId] = useState<string | undefined>(() => {
    // 初期化時にlocalStorageからGistIDを復元
    try {
      return localStorage.getItem(GIST_ID_STORAGE_KEY) || config.gistId;
    } catch {
      return config.gistId;
    }
  });
  
  // GistIDを永続化する関数
  const saveGistId = useCallback((gistId: string) => {
    try {
      localStorage.setItem(GIST_ID_STORAGE_KEY, gistId);
      setCurrentGistId(gistId);
    } catch (error) {
      console.warn('Failed to save gist ID to localStorage:', error);
    }
  }, [GIST_ID_STORAGE_KEY]);
  
  // GistIDをクリアする関数
  const clearGistId = useCallback(() => {
    try {
      localStorage.removeItem(GIST_ID_STORAGE_KEY);
      setCurrentGistId(undefined);
    } catch (error) {
      console.warn('Failed to clear gist ID from localStorage:', error);
    }
  }, [GIST_ID_STORAGE_KEY]);
  
  // React stateはService stateの読み取り専用コピー
  const [root, setRoot] = useState<Root>(createRoot());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Create or update service when accessToken or gistId changes
  useEffect(() => {
    const syncShell = config.accessToken 
      ? createSyncShell({ 
          accessToken: config.accessToken, 
          filename: config.filename || 'bookmarks.md',
          gistId: currentGistId
        })
      : undefined;
    
    if (!service.current) {
      service.current = createBookmarkService(syncShell);
      setRoot(service.current.getRoot());
    } else {
      // Preserve existing root data when recreating service
      const currentRoot = service.current.getRoot();
      service.current = createBookmarkService(syncShell);
      service.current.setRoot(currentRoot);
    }
  }, [config.accessToken, config.filename, currentGistId]);
  
  // 状態更新の統一関数
  const updateState = useCallback((markDirty: boolean = true) => {
    if (!service.current) return;
    const newRoot = service.current.getRoot();
    setRoot(newRoot);
    if (markDirty) {
      setIsDirty(true);
    }
    
    // localStorage更新
    if (config.autoSave !== false) {
      const storageShell = createLocalStorageShell({ storageKey: STORAGE_KEY });
      storageShell.save(newRoot);
    }
  }, [config.autoSave, STORAGE_KEY]);
  
  // 初期化処理（初回のみlocalStorage読み込み）
  useEffect(() => {
    if (!service.current) return;
    const storageShell = createLocalStorageShell({ storageKey: STORAGE_KEY });
    const loadResult = storageShell.load<Root>();
    if (loadResult.success && loadResult.data) {
      service.current.setRoot(loadResult.data);
      updateState(false); // 初期ロード時はdirtyマークしない
    }
  }, []); // 初回のみ実行
  
  // Setup BroadcastChannel for inter-tab communication
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        
        // Listen for messages from other tabs
        broadcastChannel.current.onmessage = (event) => {
          if (event.data.type === 'GIST_CREATED' && event.data.gistId) {
            console.log(`Received GIST_CREATED broadcast with ID: ${event.data.gistId}`);
            // Update local gist ID if we don't have one
            if (!currentGistId) {
              saveGistId(event.data.gistId);
            }
          }
        };
      }
    } catch (error) {
      console.warn('BroadcastChannel not supported or failed to initialize:', error);
    }
    
    return () => {
      // Cleanup on unmount
      if (broadcastChannel.current) {
        broadcastChannel.current.close();
      }
    };
  }, [currentGistId, saveGistId]);
  
  // 統一されたエラーハンドリング
  const handleOperation = useCallback(async (operation: () => Promise<{ success: boolean; data?: Root; error?: Error }>) => {
    if (!service.current) {
      setError('Service not initialized');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      
      if (result.success) {
        updateState();
      } else {
        setError(result.error ? result.error.message : 'Operation failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [updateState]);

  // Category operations
  const addCategory = useCallback(async (name: string) => {
    await handleOperation(() => service.current!.addCategory(name));
  }, [handleOperation]);

  const removeCategory = useCallback(async (name: string) => {
    await handleOperation(() => service.current!.removeCategory(name));
  }, [handleOperation]);

  const renameCategory = useCallback(async (oldName: string, newName: string) => {
    await handleOperation(() => service.current!.renameCategory(oldName, newName));
  }, [handleOperation]);

  // Bundle operations
  const addBundle = useCallback(async (categoryName: string, bundleName: string) => {
    await handleOperation(() => service.current!.addBundle(categoryName, bundleName));
  }, [handleOperation]);

  const removeBundle = useCallback(async (categoryName: string, bundleName: string) => {
    await handleOperation(() => service.current!.removeBundle(categoryName, bundleName));
  }, [handleOperation]);

  const renameBundle = useCallback(async (categoryName: string, oldName: string, newName: string) => {
    await handleOperation(() => service.current!.renameBundle(categoryName, oldName, newName));
  }, [handleOperation]);

  // Bookmark operations
  const addBookmark = useCallback(async (categoryName: string, bundleName: string, bookmark: BookmarkInput) => {
    await handleOperation(() => service.current!.addBookmark(categoryName, bundleName, bookmark));
  }, [handleOperation]);

  const updateBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => {
    await handleOperation(() => service.current!.updateBookmark(categoryName, bundleName, bookmarkId, update));
  }, [handleOperation]);

  const removeBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string) => {
    await handleOperation(() => service.current!.removeBookmark(categoryName, bundleName, bookmarkId));
  }, [handleOperation]);

  // Move operations
  const moveBookmark = useCallback(async (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => {
    await handleOperation(() => service.current!.moveBookmark(fromCategory, fromBundle, toCategory, toBundle, bookmarkId));
  }, [handleOperation]);

  const moveBundle = useCallback(async (fromCategory: string, toCategory: string, bundleName: string) => {
    await handleOperation(() => service.current!.moveBundle(fromCategory, toCategory, bundleName));
  }, [handleOperation]);

  // Search and stats
  const searchBookmarks = useCallback((filter?: BookmarkFilter): BookmarkSearchResult[] => {
    if (!service.current) return [];
    try {
      return service.current.searchBookmarks(filter || {});
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
      return [];
    }
  }, []);

  const getStats = useCallback((): BookmarkStats => {
    if (!service.current) return { categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 };
    try {
      return service.current.getStats();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Stats failed');
      return { categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 };
    }
  }, []);

  // Import/Export operations
  const importData = useCallback(async (data: string, format: 'json' | 'markdown') => {
    setIsLoading(true);
    setError(null);

    try {
      let importedRoot: Root;
      
      if (format === 'json') {
        try {
          importedRoot = JSON.parse(data);
        } catch (parseError) {
          throw new Error('Invalid JSON format');
        }
      } else {
        const parser = new MarkdownParser();
        importedRoot = parser.parse(data);
      }

      if (!importedRoot || !Array.isArray(importedRoot.categories)) {
        throw new Error('Invalid bookmark data structure');
      }

      service.current!.setRoot(importedRoot);
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateState]);

  const exportData = useCallback(async (format: 'json' | 'markdown'): Promise<string> => {
    try {
      if (!service.current) throw new Error('Service not initialized');
      const currentRoot = service.current.getRoot();
      if (format === 'json') {
        return JSON.stringify(currentRoot, null, 2);
      } else {
        const generator = new MarkdownGenerator();
        return generator.generate(currentRoot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // State management
  const resetState = useCallback(() => {
    if (!service.current) return;
    const newRoot = createRoot();
    service.current.setRoot(newRoot);
    updateState(false); // リセット後はdirtyではない
    setError(null);
    setIsLoading(false);
    setLastSyncAt(null);
  }, [updateState]);

  // Sync operations
  const syncWithRemote = useCallback(async () => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('SyncWithRemote: Starting sync with GistID:', currentGistId);

    try {
      if (!service.current) throw new Error('Service not initialized');
      const result = await service.current.syncWithRemote();
      if (result.success) {
        updateState(false); // Sync後はdirtyではない
        setLastSyncAt(new Date());
        
        // 同期成功時にGistIDを保存
        if (result.data?.gistId) {
          saveGistId(result.data.gistId);
          
          // Broadcast to other tabs
          if (broadcastChannel.current && !currentGistId) {
            broadcastChannel.current.postMessage({ 
              type: 'GIST_CREATED', 
              gistId: result.data.gistId 
            });
          }
        }
      } else {
        setError(result.error?.message || 'Sync failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken, updateState, saveGistId]);

  const syncWithConflictResolution = useCallback(async (resolutions: ConflictResolution[]) => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!service.current) throw new Error('Service not initialized');
      const result = await service.current.syncWithConflictResolution(resolutions);
      if (result.success) {
        updateState(false); // Sync後はdirtyではない
        setLastSyncAt(new Date());
        
        // 同期成功時にGistIDを保存
        if (result.data?.gistId) {
          saveGistId(result.data.gistId);
          
          // Broadcast to other tabs
          if (broadcastChannel.current && !currentGistId) {
            broadcastChannel.current.postMessage({ 
              type: 'GIST_CREATED', 
              gistId: result.data.gistId 
            });
          }
        }
      } else {
        setError(result.error?.message || 'Sync failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken, updateState, saveGistId]);

  const checkConflicts = useCallback(async (): Promise<MergeConflict[]> => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!service.current) throw new Error('Service not initialized');
      const result = await service.current.checkConflicts();
      if (result.success) {
        return result.data || [];
      } else {
        setError(result.error?.message || 'Failed to check conflicts');
        return [];
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to check conflicts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken]);

  const loadFromRemote = useCallback(async () => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!service.current) throw new Error('Service not initialized');
      const result = await service.current.loadFromSync();
      if (result.success) {
        updateState(false); // リモートロード後はdirtyではない
        setLastSyncAt(new Date());
      } else {
        setError(result.error?.message || 'Failed to load from remote');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load from remote');
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken, updateState]);

  const saveToRemote = useCallback(async () => {
    if (!config.accessToken) {
      setError('Authentication required for sync');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!service.current) throw new Error('Service not initialized');
      const result = await service.current.saveToSync();
      if (result.success) {
        setLastSyncAt(new Date());
        setIsDirty(false);
        
        // 保存成功時にGistIDを保存
        if (result.data?.gistId) {
          saveGistId(result.data.gistId);
          
          // Broadcast to other tabs
          if (broadcastChannel.current && !currentGistId) {
            broadcastChannel.current.postMessage({ 
              type: 'GIST_CREATED', 
              gistId: result.data.gistId 
            });
          }
        }
      } else {
        setError(result.error?.message || 'Failed to save to remote');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save to remote');
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken, saveGistId]);

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
    moveBookmark,
    moveBundle,
    searchBookmarks,
    getStats,
    syncWithRemote,
    syncWithConflictResolution,
    checkConflicts,
    loadFromRemote,
    saveToRemote,
    importData,
    exportData,
    setError,
    clearError: () => setError(null),
    resetState,
    
    // GistID management
    currentGistId,
    saveGistId,
    clearGistId,
    
    // Business logic methods (delegate to service)
    canDragBookmark: (categoryName: string, bundleName: string, bookmarkId: string) => 
      service.current?.canDragBookmark(categoryName, bundleName, bookmarkId) || false,
    canDropBookmark: (item: { categoryName: string; bundleName: string; bookmarkId: string }, targetCategory: string, targetBundle: string) => 
      service.current?.canDropBookmark(item, targetCategory, targetBundle) || false,
    canDropBundle: (bundleName: string, fromCategory: string, toCategory: string) => 
      service.current?.canDropBundle(bundleName, fromCategory, toCategory) || false,
    getSourceBundle: (categoryName: string, bundleName: string) => 
      service.current?.getSourceBundle(categoryName, bundleName) || null,
    hasCategories: () => 
      service.current?.hasCategories() || false,
    getCategories: () => 
      service.current?.getCategories() || [],
  };
}