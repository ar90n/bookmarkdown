import { useState, useCallback, useEffect, useRef } from 'react';
import { BookmarkContextValue } from '../BookmarkContext.js';
import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats, MergeConflict, ConflictResolution } from '../../types/index.js';
import { createBookmarkServiceV2, BookmarkServiceV2 } from '../../adapters/bookmark-service-v2.js';
import { createRoot } from '../../core/index.js';
import { GistSyncShell } from '../../shell/gist-sync.js';
import { createGistRepository } from '../../repositories/index.js';
import { MarkdownGenerator } from '../../parsers/json-to-markdown.js';
import { MarkdownParser } from '../../parsers/markdown-to-json.js';

interface BookmarkContextV2Config {
  accessToken?: string;
  storageKey?: string;
  filename?: string;
  autoSave?: boolean;
  gistId?: string;
  // For testing
  createSyncShell?: () => GistSyncShell;
}

export function useBookmarkContextProviderV2(config: BookmarkContextV2Config): BookmarkContextValue {
  const STORAGE_KEY = config.storageKey || 'bookmarkdown_data';
  const GIST_ID_STORAGE_KEY = `${STORAGE_KEY}_gist_id`;
  const BROADCAST_CHANNEL_NAME = 'bookmarkdown_sync';
  
  // Service state (persisted with useRef)
  const service = useRef<BookmarkServiceV2 | null>(null);
  
  // BroadcastChannel for inter-tab communication
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  
  // Parser/Generator instances
  const parser = useRef(new MarkdownParser());
  const generator = useRef(new MarkdownGenerator());
  
  // GistID state management
  const [currentGistId, setCurrentGistId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem(GIST_ID_STORAGE_KEY) || config.gistId;
    } catch {
      return config.gistId;
    }
  });
  
  // React state (read-only copy of service state)
  const [root, setRoot] = useState<Root>(createRoot());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Initialize service
  useEffect(() => {
    let syncShell: GistSyncShell | undefined;
    
    if (config.createSyncShell) {
      // For testing
      syncShell = config.createSyncShell();
    } else if (config.accessToken) {
      // Production: create real sync shell
      const repository = createGistRepository({
        mode: 'fetch',
        accessToken: config.accessToken,
        filename: config.filename || 'bookmarks.md'
      });
      
      syncShell = new GistSyncShell({
        repository,
        gistId: currentGistId,
        description: 'BookMarkDown - Bookmark Collection'
      });
    }
    
    if (!service.current) {
      service.current = createBookmarkServiceV2(syncShell);
      setRoot(service.current.getRoot());
    } else {
      // Update existing service with new sync shell
      const newService = createBookmarkServiceV2(syncShell);
      // Copy current data to new service
      const currentRoot = service.current.getRoot();
      if (currentRoot.categories.length > 0) {
        // Import current data to new service
        const markdown = generator.current.generate(currentRoot);
        const parsedRoot = parser.current.parse(markdown);
        parsedRoot.categories.forEach(category => {
          newService.addCategory(category.name);
          category.bundles.forEach(bundle => {
            newService.addBundle(category.name, bundle.name);
            bundle.bookmarks.forEach(bookmark => {
              newService.addBookmark(category.name, bundle.name, bookmark);
            });
          });
        });
      }
      service.current = newService;
      setRoot(service.current.getRoot());
    }
  }, [config.accessToken, currentGistId, config.filename, config.createSyncShell]);
  
  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      
      // Listen for updates from other tabs
      broadcastChannel.current.onmessage = (event) => {
        if (event.data.type === 'bookmark_update' && service.current) {
          setRoot(service.current.getRoot());
          setIsDirty(false);
          if (event.data.syncAt) {
            setLastSyncAt(new Date(event.data.syncAt));
          }
        }
      };
    }
    
    return () => {
      broadcastChannel.current?.close();
    };
  }, [BROADCAST_CHANNEL_NAME]);
  
  // Broadcast update to other tabs
  const broadcastUpdate = useCallback((syncAt?: Date) => {
    broadcastChannel.current?.postMessage({
      type: 'bookmark_update',
      syncAt: syncAt?.toISOString()
    });
  }, []);
  
  // Helper to update state after operations
  const updateState = useCallback(() => {
    if (service.current) {
      setRoot(service.current.getRoot());
      setIsDirty(true);
    }
  }, []);
  
  // Save GistID
  const saveGistId = useCallback((gistId: string) => {
    try {
      localStorage.setItem(GIST_ID_STORAGE_KEY, gistId);
      setCurrentGistId(gistId);
    } catch (error) {
      console.warn('Failed to save gist ID to localStorage:', error);
    }
  }, [GIST_ID_STORAGE_KEY]);
  
  // Clear GistID
  const clearGistId = useCallback(() => {
    try {
      localStorage.removeItem(GIST_ID_STORAGE_KEY);
      setCurrentGistId(undefined);
    } catch (error) {
      console.warn('Failed to clear gist ID from localStorage:', error);
    }
  }, [GIST_ID_STORAGE_KEY]);
  
  // Category operations
  const addCategory = useCallback(async (name: string) => {
    if (!service.current) return;
    
    const result = service.current.addCategory(name);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const removeCategory = useCallback(async (name: string) => {
    if (!service.current) return;
    
    const result = service.current.removeCategory(name);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const renameCategory = useCallback(async (oldName: string, newName: string) => {
    if (!service.current) return;
    
    const result = service.current.renameCategory(oldName, newName);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  // Bundle operations
  const addBundle = useCallback(async (categoryName: string, bundleName: string) => {
    if (!service.current) return;
    
    const result = service.current.addBundle(categoryName, bundleName);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const removeBundle = useCallback(async (categoryName: string, bundleName: string) => {
    if (!service.current) return;
    
    const result = service.current.removeBundle(categoryName, bundleName);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const renameBundle = useCallback(async (categoryName: string, oldName: string, newName: string) => {
    if (!service.current) return;
    
    const result = service.current.renameBundle(categoryName, oldName, newName);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  // Bookmark operations
  const addBookmark = useCallback(async (categoryName: string, bundleName: string, bookmark: BookmarkInput) => {
    if (!service.current) return;
    
    const result = service.current.addBookmark(categoryName, bundleName, bookmark);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const addBookmarksBatch = useCallback(async (categoryName: string, bundleName: string, bookmarks: BookmarkInput[]) => {
    if (!service.current) return;
    
    const result = service.current.addBookmarksBatch(categoryName, bundleName, bookmarks);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const updateBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => {
    if (!service.current) return;
    
    const result = service.current.updateBookmark(categoryName, bundleName, bookmarkId, update);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const removeBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string) => {
    if (!service.current) return;
    
    const result = service.current.removeBookmark(categoryName, bundleName, bookmarkId);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  // Move operations
  const moveBookmark = useCallback(async (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => {
    if (!service.current) return;
    
    const result = service.current.moveBookmark(fromCategory, fromBundle, toCategory, toBundle, bookmarkId);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  const moveBundle = useCallback(async (fromCategory: string, toCategory: string, bundleName: string) => {
    if (!service.current) return;
    
    const result = service.current.moveBundle(fromCategory, toCategory, bundleName);
    if (result.success) {
      updateState();
    } else {
      setError(result.error.message);
    }
  }, [updateState]);
  
  // Query operations
  const searchBookmarks = useCallback((filter?: BookmarkFilter): BookmarkSearchResult[] => {
    if (!service.current) return [];
    return service.current.searchBookmarks(filter);
  }, []);
  
  const getStats = useCallback((): BookmarkStats => {
    if (!service.current) {
      return { categoriesCount: 0, bundlesCount: 0, bookmarksCount: 0, tagsCount: 0 };
    }
    return service.current.getStats();
  }, []);
  
  // Remote operations
  const loadFromRemote = useCallback(async () => {
    if (!service.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await service.current.loadFromRemote();
      if (result.success) {
        setRoot(result.data);
        setIsDirty(false);
        setLastSyncAt(new Date());
        broadcastUpdate(new Date());
        
        // Update GistID if loaded successfully
        const gistInfo = service.current.getGistInfo();
        if (gistInfo.gistId) {
          saveGistId(gistInfo.gistId);
        }
      } else {
        setError(result.error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [broadcastUpdate, saveGistId]);
  
  const saveToRemote = useCallback(async () => {
    if (!service.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await service.current.saveToRemote();
      if (result.success) {
        setIsDirty(false);
        setLastSyncAt(new Date());
        broadcastUpdate(new Date());
        
        // Update GistID if created new
        if (result.data.gistId) {
          saveGistId(result.data.gistId);
        }
      } else {
        setError(result.error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [broadcastUpdate, saveGistId]);
  
  // Simplified sync (no merge conflicts in V2)
  const syncWithRemote = useCallback(async () => {
    if (!service.current) return;
    
    // Check for remote changes
    const hasChangesResult = await service.current.hasRemoteChanges();
    if (hasChangesResult.success && hasChangesResult.data) {
      // Remote has changes - need to decide what to do
      if (isDirty) {
        setError('Remote has changes. Please save or discard your local changes first.');
        return;
      } else {
        // No local changes, safe to reload
        await loadFromRemote();
      }
    } else {
      // No remote changes, safe to save if dirty
      if (isDirty) {
        await saveToRemote();
      }
    }
  }, [isDirty, loadFromRemote, saveToRemote]);
  
  // Conflict resolution - simplified for V2
  const syncWithConflictResolution = useCallback(async (resolutions: ConflictResolution[]) => {
    // In V2, we don't have automatic merge conflicts
    // This is kept for compatibility but always uses remote as truth
    await loadFromRemote();
  }, [loadFromRemote]);
  
  const checkConflicts = useCallback(async (): Promise<MergeConflict[]> => {
    // V2 doesn't have merge conflicts
    return [];
  }, []);
  
  // Import/Export
  const importData = useCallback(async (data: string, format: 'json' | 'markdown') => {
    if (!service.current) return;
    
    try {
      let root: Root;
      if (format === 'markdown') {
        root = parser.current.parse(data);
      } else {
        root = JSON.parse(data) as Root;
      }
      
      // Clear existing data
      const currentRoot = service.current.getRoot();
      currentRoot.categories.forEach(cat => {
        service.current!.removeCategory(cat.name);
      });
      
      // Import new data
      root.categories.forEach(category => {
        service.current!.addCategory(category.name);
        category.bundles.forEach(bundle => {
          service.current!.addBundle(category.name, bundle.name);
          bundle.bookmarks.forEach(bookmark => {
            service.current!.addBookmark(category.name, bundle.name, bookmark);
          });
        });
      });
      
      updateState();
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [updateState]);
  
  const exportData = useCallback(async (format: 'json' | 'markdown'): Promise<string> => {
    if (!service.current) {
      throw new Error('Service not initialized');
    }
    
    const currentRoot = service.current.getRoot();
    if (format === 'markdown') {
      return generator.current.generate(currentRoot);
    } else {
      return JSON.stringify(currentRoot, null, 2);
    }
  }, []);
  
  // Error management
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // State management
  const resetState = useCallback(() => {
    if (service.current) {
      service.current = createBookmarkServiceV2();
      setRoot(service.current.getRoot());
      setError(null);
      setIsDirty(false);
      setLastSyncAt(null);
    }
  }, []);
  
  // Business logic delegates
  const canDragBookmark = useCallback((categoryName: string, bundleName: string, bookmarkId: string): boolean => {
    // Always allow dragging
    return true;
  }, []);
  
  const canDropBookmark = useCallback((item: { categoryName: string; bundleName: string; bookmarkId: string }, targetCategory: string, targetBundle: string): boolean => {
    // Don't allow dropping to same location
    return !(item.categoryName === targetCategory && item.bundleName === targetBundle);
  }, []);
  
  const canDropBundle = useCallback((bundleName: string, fromCategory: string, toCategory: string): boolean => {
    // Don't allow dropping to same category
    return fromCategory !== toCategory;
  }, []);
  
  const getSourceBundle = useCallback((categoryName: string, bundleName: string) => {
    const category = root.categories.find(c => c.name === categoryName);
    if (!category) return null;
    
    const bundle = category.bundles.find(b => b.name === bundleName);
    if (!bundle) return null;
    
    return {
      name: bundle.name,
      bookmarks: bundle.bookmarks
    };
  }, [root]);
  
  const hasCategories = useCallback((): boolean => {
    return root.categories.length > 0;
  }, [root]);
  
  const getCategories = useCallback(() => {
    return root.categories;
  }, [root]);
  
  const getGistInfo = useCallback(() => {
    if (!service.current) return {};
    return service.current.getGistInfo();
  }, []);
  
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
    addBookmarksBatch,
    updateBookmark,
    removeBookmark,
    moveBookmark,
    moveBundle,
    searchBookmarks,
    getStats,
    
    // Sync
    syncWithRemote,
    syncWithConflictResolution,
    checkConflicts,
    loadFromRemote,
    saveToRemote,
    
    // Import/Export
    importData,
    exportData,
    
    // State management
    setError,
    clearError,
    resetState,
    
    // GistID management
    currentGistId,
    saveGistId,
    clearGistId,
    
    // Business logic
    canDragBookmark,
    canDropBookmark,
    canDropBundle,
    getSourceBundle,
    hasCategories,
    getCategories,
    
    // Additional V2 methods
    getGistInfo,
  };
}