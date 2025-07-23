import { useState, useCallback, useEffect, useRef } from 'react';
import { BookmarkContextValue } from '../BookmarkContext.js';
import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter, BookmarkSearchResult, BookmarkStats, MergeConflict, ConflictResolution } from '../../types/index.js';
import { createBookmarkService, BookmarkService } from '../../adapters/bookmark-service.js';
import { createRoot } from '../../core/index.js';
import { GistSyncShell } from '../../shell/gist-sync.js';
import { MarkdownGenerator } from '../../parsers/json-to-markdown.js';
import { MarkdownParser } from '../../parsers/markdown-to-json.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { dialogStateRef } from './dialog-state-ref.js';

interface BookmarkContextV2Config {
  accessToken?: string;
  storageKey?: string;
  filename?: string;
  autoSave?: boolean;
  gistId?: string;
  autoSync?: boolean;
  isAuthLoading?: boolean;
  onConflictDuringAutoSync?: (handlers: { onLoadRemote: () => void; onSaveLocal: () => void }) => void;
  onAuthError?: () => Promise<void>; // Callback for authentication errors
  // For testing
  createSyncShell?: () => GistSyncShell;
}

export function useBookmarkContextProvider(config: BookmarkContextV2Config): BookmarkContextValue {
  const STORAGE_KEY = config.storageKey || 'bookmarkdown_data';
  const GIST_ID_STORAGE_KEY = `${STORAGE_KEY}_gist_id`;
  
  // Service state (persisted with useRef)
  const service = useRef<BookmarkService | null>(null);
  
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
  
  // Auto-sync settings stored in localStorage
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('autoSyncEnabled');
      return stored ? stored === 'true' : true; // Default to enabled
    } catch {
      return true;
    }
  });
  
  // React state (read-only copy of service state)
  const [root, setRoot] = useState<Root>(createRoot());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [syncConfigured, setSyncConfigured] = useState(false);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Ref for handling remote changes
  const handleRemoteChangeDetectedRef = useRef<(() => Promise<void>) | null>(null);
  
  // Initialize service
  useEffect(() => {
    const initializeService = async () => {
      let syncShell: GistSyncShell | undefined;
      let initializationError: Error | null = null;
      
      if (config.createSyncShell) {
        // For testing
        syncShell = config.createSyncShell();
        // Initialize the custom shell
        const initResult = await syncShell.initialize(currentGistId);
        if (!initResult.success) {
          console.error('Failed to initialize custom GistSyncShell:', initResult.error);
          initializationError = initResult.error;
          setError(`Failed to connect to Gist: ${initResult.error.message}`);
          syncShell = undefined;
        }
      } else if (config.accessToken) {
        // Production: create real sync shell
        syncShell = new GistSyncShell({
          repositoryConfig: {
            accessToken: config.accessToken,
            filename: config.filename || 'bookmarks.md'
          },
          gistId: currentGistId,
          useMock: false,
          onRemoteChangeDetected: async () => {
            if (handleRemoteChangeDetectedRef.current) {
              await handleRemoteChangeDetectedRef.current();
            }
          },
          isConflictDialogOpen: () => dialogStateRef.isConflictDialogOpen,
          hasUnresolvedConflict: () => dialogStateRef.hasUnresolvedConflict
        });
        
        // Initialize the shell to start remote change detection
        const initResult = await syncShell.initialize(currentGistId);
        if (!initResult.success) {
          console.error('Failed to initialize GistSyncShell:', initResult.error);
          initializationError = initResult.error;
          // Set error state so UI can show it
          setError(`Failed to connect to Gist: ${initResult.error.message}`);
          // Don't start the detector if initialization failed
          syncShell = undefined;
        }
      }
      
      if (!service.current) {
        service.current = createBookmarkService(syncShell);
        setRoot(service.current.getRoot());
      } else {
        // Update existing service with new sync shell
        const newService = createBookmarkService(syncShell);
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
      
      // Update sync configured state
      setSyncConfigured(syncShell !== undefined);
      
      // If initialization failed, mark as not synced
      if (initializationError) {
        setLastSyncAt(null);
        setIsDirty(false);
      }
    };
    
    initializeService();
  }, [config.accessToken, currentGistId, config.filename, config.createSyncShell]);
  
  // Removed BroadcastChannel - not needed for cross-device sync
  
  // Ref for debounced auto-sync
  const debouncedAutoSyncRef = useRef<(() => void) | null>(null);
  
  // Sync lock for exclusive control
  const syncLockRef = useRef<boolean>(false);
  
  // Helper for exclusive sync operations
  const withSyncLock = useCallback(async <T,>(
    operation: () => Promise<T>
  ): Promise<T> => {
    if (syncLockRef.current) {
      throw new Error('Another sync operation is in progress');
    }
    
    syncLockRef.current = true;
    setIsSyncing(true);
    
    try {
      return await operation();
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
    }
  }, []);
  
  // Helper to update state after operations
  // Internal update state without triggering auto-sync (for use within sync operations)
  const updateStateInternal = useCallback(() => {
    if (service.current) {
      setRoot(service.current.getRoot());
      setIsDirty(true);
    }
  }, []);

  // Trigger auto-sync after operation completes
  const triggerAutoSyncIfEnabled = useCallback(() => {
    // Skip auto-sync if there's an unresolved conflict
    if (dialogStateRef.hasUnresolvedConflict) {
      return;
    }
    
    if (config.autoSync && autoSyncEnabled && config.accessToken && debouncedAutoSyncRef.current) {
      debouncedAutoSyncRef.current();
    }
  }, [config.autoSync, config.accessToken, autoSyncEnabled]);
  
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
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.addCategory(name);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const removeCategory = useCallback(async (name: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.removeCategory(name);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const renameCategory = useCallback(async (oldName: string, newName: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.renameCategory(oldName, newName);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  // Bundle operations
  const addBundle = useCallback(async (categoryName: string, bundleName: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.addBundle(categoryName, bundleName);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const removeBundle = useCallback(async (categoryName: string, bundleName: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.removeBundle(categoryName, bundleName);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const renameBundle = useCallback(async (categoryName: string, oldName: string, newName: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.renameBundle(categoryName, oldName, newName);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  // Bookmark operations
  const addBookmark = useCallback(async (categoryName: string, bundleName: string, bookmark: BookmarkInput) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.addBookmark(categoryName, bundleName, bookmark);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const addBookmarksBatch = useCallback(async (categoryName: string, bundleName: string, bookmarks: BookmarkInput[]) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.addBookmarksBatch(categoryName, bundleName, bookmarks);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const updateBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string, update: BookmarkUpdate) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.updateBookmark(categoryName, bundleName, bookmarkId, update);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const removeBookmark = useCallback(async (categoryName: string, bundleName: string, bookmarkId: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.removeBookmark(categoryName, bundleName, bookmarkId);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  // Move operations
  const moveBookmark = useCallback(async (fromCategory: string, fromBundle: string, toCategory: string, toBundle: string, bookmarkId: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.moveBookmark(fromCategory, fromBundle, toCategory, toBundle, bookmarkId);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
  const moveBundle = useCallback(async (fromCategory: string, toCategory: string, bundleName: string) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.moveBundle(fromCategory, toCategory, bundleName);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);

  // Reorder operations
  const reorderCategories = useCallback(async (categoryName: string, newIndex: number) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.reorderCategories(categoryName, newIndex);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);

  const reorderBundles = useCallback(async (categoryName: string, bundleName: string, newIndex: number) => {
    await withSyncLock(async () => {
      if (!service.current) return;
      
      const result = service.current.reorderBundles(categoryName, bundleName, newIndex);
      if (result.success) {
        updateStateInternal();
      } else {
        setError(result.error.message);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);

  
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
  
  // Retry initialization helper - defined before use
  const doRetryInitialization = useCallback(async () => {
    if (!config.accessToken) {
      throw new Error('No access token available');
    }
    
    const syncShell = new GistSyncShell({
      repositoryConfig: {
        accessToken: config.accessToken,
        filename: config.filename || 'bookmarks.md'
      },
      gistId: currentGistId,
      useMock: false,
      isConflictDialogOpen: () => dialogStateRef.isConflictDialogOpen,
      hasUnresolvedConflict: () => dialogStateRef.hasUnresolvedConflict
    });
    
    const initResult = await syncShell.initialize(currentGistId);
    if (!initResult.success) {
      throw initResult.error;
    }
    
    // Update service with new sync shell
    const newService = createBookmarkService(syncShell);
    
    // Preserve existing data if any
    if (service.current) {
      const currentRoot = service.current.getRoot();
      if (currentRoot.categories.length > 0) {
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
    }
    
    service.current = newService;
    setRoot(service.current.getRoot());
    setSyncConfigured(true);
    
    return newService;
  }, [config.accessToken, config.filename, currentGistId]);
  
  // Remote operations - Internal (no lock)
  const loadFromRemoteInternal = useCallback(async () => {
    if (!service.current) {
      throw new Error('Service not initialized');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await service.current.loadFromRemote();
      if (result.success) {
        setRoot(result.data);
        setIsDirty(false);
        setLastSyncAt(new Date());
        setInitialSyncCompleted(true);
        
        // Update GistID if loaded successfully
        const gistInfo = service.current.getGistInfo();
        if (gistInfo.gistId) {
          saveGistId(gistInfo.gistId);
        }
      } else {
        // Check if it's an initialization error
        if (result.error.message.includes('not initialized')) {
          // Try to reinitialize
          if (config.accessToken) {
            await doRetryInitialization();
            // Retry load after reinitialization
            const retryResult = await service.current!.loadFromRemote();
            if (retryResult.success) {
              setRoot(retryResult.data);
              setIsDirty(false);
              setLastSyncAt(new Date());
              setInitialSyncCompleted(true);
              
              const gistInfo = service.current!.getGistInfo();
              if (gistInfo.gistId) {
                saveGistId(gistInfo.gistId);
              }
            } else {
              throw retryResult.error;
            }
          } else {
            throw result.error;
          }
        } else {
          throw result.error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for authentication errors
      if (error instanceof Error && 
          (error.message.includes('Bad credentials') || 
           error.message.includes('Authentication failed'))) {
        console.log('Authentication error detected, logging out...');
        if (config.onAuthError) {
          await config.onAuthError();
        }
        setError('Authentication failed. Please login again.');
        // Mark initial sync as completed to show UI
        setInitialSyncCompleted(true);
        return; // Don't re-throw after logout
      }
      
      setError(errorMessage);
      // Mark initial sync as completed even on error to show local data
      setInitialSyncCompleted(true);
      throw error; // Re-throw so caller can handle
    } finally {
      setIsLoading(false);
    }
  }, [saveGistId, config.accessToken, doRetryInitialization]);
  
  // Public loadFromRemote with lock
  const loadFromRemote = useCallback(async () => {
    return withSyncLock(loadFromRemoteInternal);
  }, [loadFromRemoteInternal, withSyncLock]);
  
  // Internal saveToRemote without lock
  const saveToRemoteInternal = useCallback(async () => {
    if (!service.current) {
      throw new Error('Service not initialized');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await service.current.saveToRemote();
      if (result.success) {
        setIsDirty(false);
        setLastSyncAt(new Date());
        
        // Update GistID if created new
        if (result.data.gistId) {
          saveGistId(result.data.gistId);
        }
      } else {
        // Check if it's an initialization error
        if (result.error.message.includes('not initialized') || result.error.message.includes('not configured')) {
          // Try to reinitialize
          if (config.accessToken) {
            await doRetryInitialization();
            // Retry save after reinitialization
            const retryResult = await service.current!.saveToRemote();
            if (retryResult.success) {
              setIsDirty(false);
              setLastSyncAt(new Date());
              if (retryResult.data.gistId) {
                saveGistId(retryResult.data.gistId);
              }
            } else {
              throw retryResult.error;
            }
          } else {
            throw result.error;
          }
        } else {
          throw result.error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for authentication errors
      if (error instanceof Error && 
          (error.message.includes('Bad credentials') || 
           error.message.includes('Authentication failed'))) {
        console.log('Authentication error detected, logging out...');
        if (config.onAuthError) {
          await config.onAuthError();
        }
        setError('Authentication failed. Please login again.');
        return; // Don't re-throw after logout
      }
      
      setError(errorMessage);
      throw error; // Re-throw so caller can handle
    } finally {
      setIsLoading(false);
    }
  }, [saveGistId, config.accessToken, doRetryInitialization]);
  
  // Public saveToRemote with lock
  const saveToRemote = useCallback(async () => {
    return withSyncLock(saveToRemoteInternal);
  }, [saveToRemoteInternal, withSyncLock]);
  
  // Simplified sync (no merge conflicts in V2)
  const syncWithRemote = useCallback(async (options?: {
    onConflict?: (handlers: { onLoadRemote: () => void; onSaveLocal: () => void }) => void;
  }) => {
    return withSyncLock(async () => {
      if (!service.current) {
        throw new Error('Service not initialized');
      }
      
      try {
        // Get current Gist info for logging
        const gistInfo = service.current.getGistInfo();
        console.log('[syncWithRemote] Starting sync', {
          isDirty,
          currentEtag: gistInfo.etag,
          gistId: gistInfo.gistId
        });
        
      // Check for remote changes
      let hasChangesResult = await service.current.hasRemoteChanges();
      if (!hasChangesResult.success) {
        // If checking fails, it might be due to initialization issues
        if (hasChangesResult.error.message.includes('not initialized')) {
          await doRetryInitialization();
          // Try again after reinitialization
          hasChangesResult = await service.current!.hasRemoteChanges();
          if (!hasChangesResult.success) {
            throw hasChangesResult.error;
          }
        } else {
          throw hasChangesResult.error;
        }
      }
      
      console.log('[syncWithRemote] Remote changes check result', {
        hasRemoteChanges: hasChangesResult.data,
        isDirty,
        willConflict: hasChangesResult.data && isDirty
      });
      
      if (hasChangesResult.success && hasChangesResult.data) {
        // Remote has changes - need to decide what to do
        if (isDirty) {
          // Conflict detected - set the flag
          console.log('[syncWithRemote] Conflict detected - both local and remote have changes');
          dialogStateRef.hasUnresolvedConflict = true;
          
          // Use the dialog if callback provided
          if (options?.onConflict) {
            options.onConflict({
              onLoadRemote: async () => {
                await loadFromRemoteInternal();
                // Conflict resolved
                dialogStateRef.hasUnresolvedConflict = false;
              },
              onSaveLocal: async () => {
                await saveToRemoteInternal();
                // Conflict resolved
                dialogStateRef.hasUnresolvedConflict = false;
              }
            });
          } else {
            setError('Remote has changes. Please save or discard your local changes first.');
          }
          return;
        } else {
          // No local changes, safe to reload
          await loadFromRemoteInternal();
        }
      } else {
        // No remote changes, safe to save if dirty
        if (isDirty) {
          await saveToRemoteInternal();
        }
      }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for authentication errors
        if (error instanceof Error && 
            (error.message.includes('Bad credentials') || 
             error.message.includes('Authentication failed'))) {
          console.log('Authentication error detected, logging out...');
          if (config.onAuthError) {
            await config.onAuthError();
          }
          setError('Authentication failed. Please login again.');
          return; // Don't re-throw after logout
        }
        
        setError(errorMessage);
        throw error;
      }
    });
  }, [isDirty, loadFromRemoteInternal, saveToRemoteInternal, doRetryInitialization, withSyncLock]);
  
  // Conflict resolution - simplified for V2
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    await withSyncLock(async () => {
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
        
        updateStateInternal();
      } catch (err) {
        setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });
    
    // Trigger auto-sync after lock is released
    triggerAutoSyncIfEnabled();
  }, [withSyncLock, updateStateInternal, triggerAutoSyncIfEnabled]);
  
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
      service.current = createBookmarkService();
      setRoot(service.current.getRoot());
      setError(null);
      setIsDirty(false);
      setLastSyncAt(null);
    }
  }, []);
  
  // Retry initialization - useful when sync fails on first attempt
  const retryInitialization = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      await doRetryInitialization();
      
      // Try to load from remote
      await loadFromRemote();
    } catch (error) {
      setError(`Failed to reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [doRetryInitialization, loadFromRemote]);
  
  // Business logic delegates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canDragBookmark = useCallback((categoryName: string, bundleName: string, bookmarkId: string): boolean => {
    // Always allow dragging
    return true;
  }, []);
  
  const canDropBookmark = useCallback((item: { categoryName: string; bundleName: string; bookmarkId: string }, targetCategory: string, targetBundle: string): boolean => {
    // Don't allow dropping in the same bundle (reordering disabled)
    if (item.categoryName === targetCategory && item.bundleName === targetBundle) {
      return false;
    }
    // Allow drops to different bundles
    return true;
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
  
  const isSyncConfigured = useCallback(() => {
    return syncConfigured;
  }, [syncConfigured]);
  
  const isAutoSyncEnabled = useCallback(() => autoSyncEnabled, [autoSyncEnabled]);
  
  const setAutoSync = useCallback((enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    try {
      localStorage.setItem('autoSyncEnabled', enabled.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, []);
  
  // Store config values in refs to avoid recreating callbacks
  const autoSyncRef = useRef(config.autoSync);
  const accessTokenRef = useRef(config.accessToken);
  const onConflictRef = useRef(config.onConflictDuringAutoSync);
  
  useEffect(() => {
    autoSyncRef.current = config.autoSync;
    accessTokenRef.current = config.accessToken;
    onConflictRef.current = config.onConflictDuringAutoSync;
  }, [config.autoSync, config.accessToken, config.onConflictDuringAutoSync]);
  
  // Auto-sync callback
  const triggerAutoSync = useCallback(async () => {
    if (!autoSyncRef.current || !accessTokenRef.current || !service.current) {
      return;
    }
    
    // Skip auto-sync if there's an unresolved conflict
    if (dialogStateRef.hasUnresolvedConflict) {
      return;
    }
    
    // Skip auto-sync if another sync operation is in progress
    if (syncLockRef.current) {
      console.log('[AutoSync] Skipped - another sync operation is in progress');
      return;
    }
    
    // Wrap entire auto-sync in sync lock
    return withSyncLock(async () => {
      try {
        // Get current Gist info for logging
        const gistInfo = service.current!.getGistInfo();
        console.log('[AutoSync] Starting auto-sync', {
          currentEtag: gistInfo.etag,
          gistId: gistInfo.gistId
        });
        
        // Check for remote changes
        const hasChangesResult = await service.current!.hasRemoteChanges();
        if (!hasChangesResult.success) {
          throw hasChangesResult.error;
        }
        
        console.log('[AutoSync] Remote changes check result', {
          hasRemoteChanges: hasChangesResult.data
        });
        
        if (hasChangesResult.data) {
          // Remote has changes - conflict detected
          console.log('[AutoSync] Conflict detected during auto-sync');
          dialogStateRef.hasUnresolvedConflict = true;
          
          if (onConflictRef.current) {
            onConflictRef.current({
              onLoadRemote: async () => {
                await loadFromRemoteInternal();
                // Conflict resolved
                dialogStateRef.hasUnresolvedConflict = false;
              },
              onSaveLocal: async () => {
                await saveToRemoteInternal();
                // Conflict resolved
                dialogStateRef.hasUnresolvedConflict = false;
              }
            });
          } else {
            setError('Auto-sync failed: Remote has changes');
          }
        } else {
          // No remote changes, safe to save
          await saveToRemoteInternal();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for authentication errors
        if (error instanceof Error && 
            (error.message.includes('Bad credentials') || 
             error.message.includes('Authentication failed'))) {
          console.log('Authentication error detected during auto-sync, logging out...');
          if (config.onAuthError) {
            await config.onAuthError();
          }
          setError('Authentication failed. Please login again.');
          return; // Don't continue with auto-sync
        }
        
        setError(`Auto-sync failed: ${errorMessage}`);
      }
    });
  }, [loadFromRemoteInternal, saveToRemoteInternal, withSyncLock]);
  
  // Debounced auto-sync
  const debouncedAutoSync = useDebounce(triggerAutoSync, 1000);
  
  // Handle remote change detection
  const handleRemoteChangeDetected = useCallback(async () => {
    if (!service.current) return;
    
    // Check if we have local changes
    if (service.current.isDirty()) {
      // We have local changes - conflict detected
      dialogStateRef.hasUnresolvedConflict = true;
      
      if (config.onConflictDuringAutoSync) {
        config.onConflictDuringAutoSync({
          onLoadRemote: async () => {
            await loadFromRemote();
            // Conflict resolved
            dialogStateRef.hasUnresolvedConflict = false;
          },
          onSaveLocal: async () => {
            await saveToRemote();
            // Conflict resolved
            dialogStateRef.hasUnresolvedConflict = false;
          }
        });
      }
    } else {
      // No local changes, safe to auto-load if enabled
      try {
        await loadFromRemote();
      } catch (error) {
        console.error('Failed to auto-load on remote change:', error);
      }
    }
  }, [config.onConflictDuringAutoSync, loadFromRemote, saveToRemote]);
  
  // Set the refs
  useEffect(() => {
    debouncedAutoSyncRef.current = debouncedAutoSync;
    handleRemoteChangeDetectedRef.current = handleRemoteChangeDetected;
  }, [debouncedAutoSync, handleRemoteChangeDetected]);
  
  // Immediate sync on initialization when Gist ID exists
  useEffect(() => {
    const performInitialSync = async () => {
      // Wait for authentication to complete
      if (!config.accessToken || config.isAuthLoading) {
        return;
      }
      
      // Only sync if:
      // 1. We have a Gist ID from localStorage
      // 2. We have an access token
      // 3. Service is initialized
      // 4. Initial sync hasn't been completed yet
      if (currentGistId && service.current && !initialSyncCompleted && syncConfigured) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await loadFromRemote();
            break; // Success - exit retry loop
          } catch (error) {
            console.error(`Initial sync failed (attempt ${retryCount + 1}):`, error);
            
            // Only retry on 401 authentication errors
            if (error instanceof Error && 
                (error.message.includes('401') || error.message.includes('Authentication failed'))) {
              retryCount++;
              if (retryCount < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, retryCount - 1) * 1000;
                console.log(`Retrying initial sync in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
              }
            }
            
            // Other errors or max retries reached - exit loop
            break;
          }
        }
      }
    };
    
    performInitialSync();
  }, [currentGistId, config.accessToken, config.isAuthLoading, syncConfigured, initialSyncCompleted, loadFromRemote]);
  
  return {
    // State
    root,
    isLoading,
    error,
    lastSyncAt,
    isDirty,
    initialSyncCompleted,
    isSyncing,
    
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
    reorderCategories,
    reorderBundles,
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
    retryInitialization,
    isSyncConfigured,
    
    // Auto-sync settings
    isAutoSyncEnabled,
    setAutoSync,
  };
}