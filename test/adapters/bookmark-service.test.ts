import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBookmarkService, BookmarkService } from '../../web/src/lib/adapters/bookmark-service.js';
import { SyncShell, SyncResult } from '../../web/src/lib/shell/index.js';
import { Root, BookmarkInput } from '../../web/src/lib/types/index.js';
import { createRoot } from '../../web/src/lib/core/index.js';
import { success, failure } from '../../web/src/lib/types/result.js';

// Mock SyncShell for testing
const createMockSyncShell = (): SyncShell => {
  const mockSyncShell: SyncShell = {
    load: vi.fn(),
    save: vi.fn(),
    sync: vi.fn(),
    syncWithConflictResolution: vi.fn(),
    checkConflicts: vi.fn(),
    syncBeforeOperation: vi.fn(),
    saveAfterOperation: vi.fn(),
  };

  return mockSyncShell;
};

describe('BookmarkService', () => {
  let service: BookmarkService;
  let mockSyncShell: SyncShell;
  let initialRoot: Root;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create fresh mock sync shell
    mockSyncShell = createMockSyncShell();
    
    // Create service instance
    service = createBookmarkService(mockSyncShell);
    
    // Set up initial root with test data
    initialRoot = createRoot();
    // Add test category and bundle
    initialRoot = {
      ...initialRoot,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            {
              name: 'Test Bundle',
              bookmarks: [
                {
                  id: 'bookmark-1',
                  title: 'Test Bookmark 1',
                  url: 'https://test1.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z'
                  }
                },
                {
                  id: 'bookmark-2', 
                  title: 'Test Bookmark 2',
                  url: 'https://test2.com',
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z'
                  }
                }
              ],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z'
              }
            }
          ],
          metadata: {
            lastModified: '2023-01-01T00:00:00Z'
          }
        }
      ]
    };
    
    service.setRoot(initialRoot);
  });

  describe('Basic operations without sync', () => {
    beforeEach(() => {
      service = createBookmarkService(); // No sync shell
    });

    it('should create service without sync shell', () => {
      expect(service).toBeDefined();
      expect(service.getRoot()).toBeDefined();
    });

    it('should get and set root correctly', () => {
      const testRoot = createRoot();
      service.setRoot(testRoot);
      expect(service.getRoot()).toEqual(testRoot);
    });
  });

  describe('removeBookmark', () => {
    describe('without sync shell', () => {
      beforeEach(() => {
        service = createBookmarkService(); // No sync shell
        service.setRoot(initialRoot);
      });

      it('should perform hard delete when no sync shell is available', async () => {
        const result = await service.removeBookmark('Test Category', 'Test Bundle', 'bookmark-1');
        
        expect(result.success).toBe(true);
        
        const updatedRoot = service.getRoot();
        const bundle = updatedRoot.categories[0].bundles[0];
        
        // Should have 1 bookmark left (hard delete)
        expect(bundle.bookmarks).toHaveLength(1);
        expect(bundle.bookmarks[0].id).toBe('bookmark-2');
        
        // Deleted bookmark should not exist
        const deletedBookmark = bundle.bookmarks.find(b => b.id === 'bookmark-1');
        expect(deletedBookmark).toBeUndefined();
      });

      it('should return error when bundle does not exist', async () => {
        const result = await service.removeBookmark('Test Category', 'Nonexistent Bundle', 'bookmark-1');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bundle \'Nonexistent Bundle\' not found');
      });

      it('should return error when category does not exist', async () => {
        const result = await service.removeBookmark('Nonexistent Category', 'Test Bundle', 'bookmark-1');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bundle \'Test Bundle\' not found in category \'Nonexistent Category\'');
      });
    });

    describe('with sync shell (bypass mode)', () => {
      it('should bypass sync and perform hard delete for immediate feedback', async () => {
        // Mock successful save
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: null, 
            gistId: 'test-gist',
            hasConflicts: false,
            conflicts: []
          })
        );

        const result = await service.removeBookmark('Test Category', 'Test Bundle', 'bookmark-1');
        
        expect(result.success).toBe(true);
        
        // Should NOT call syncBeforeOperation (bypass)
        expect(mockSyncShell.syncBeforeOperation).not.toHaveBeenCalled();
        
        // Should call saveAfterOperation (to persist)
        expect(mockSyncShell.saveAfterOperation).toHaveBeenCalledTimes(1);
        
        const updatedRoot = service.getRoot();
        const bundle = updatedRoot.categories[0].bundles[0];
        
        // Should have 1 bookmark left (hard delete)
        expect(bundle.bookmarks).toHaveLength(1);
        expect(bundle.bookmarks[0].id).toBe('bookmark-2');
      });

      it('should handle save failure gracefully', async () => {
        // Mock save failure
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          failure(new Error('API rate limit exceeded'))
        );

        const result = await service.removeBookmark('Test Category', 'Test Bundle', 'bookmark-1');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Failed to save');
        expect(result.error?.message).toContain('API rate limit exceeded');
      });

      it('should update root with merged data if available', async () => {
        const mergedRoot = { ...initialRoot };
        mergedRoot.metadata = { lastSynced: '2023-01-02T00:00:00Z' };
        
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot,
            gistId: 'test-gist',
            hasConflicts: false,
            conflicts: []
          })
        );

        const result = await service.removeBookmark('Test Category', 'Test Bundle', 'bookmark-1');
        
        expect(result.success).toBe(true);
        
        const finalRoot = service.getRoot();
        expect(finalRoot.metadata?.lastSynced).toBe('2023-01-02T00:00:00Z');
      });
    });
  });

  describe('addBookmarksBatch', () => {
    const testBookmarks: BookmarkInput[] = [
      {
        title: 'Batch Bookmark 1',
        url: 'https://batch1.com',
        tags: ['batch', 'test']
      },
      {
        title: 'Batch Bookmark 2', 
        url: 'https://batch2.com',
        tags: ['batch', 'test']
      },
      {
        title: 'Batch Bookmark 3',
        url: 'https://batch3.com',
        tags: ['batch', 'test']
      }
    ];

    describe('without sync shell', () => {
      beforeEach(() => {
        service = createBookmarkService(); // No sync shell
        service.setRoot(initialRoot);
      });

      it('should add all bookmarks locally without sync', async () => {
        const result = await service.addBookmarksBatch('Test Category', 'Test Bundle', testBookmarks);
        
        expect(result.success).toBe(true);
        
        const updatedRoot = service.getRoot();
        const bundle = updatedRoot.categories[0].bundles[0];
        
        // Should have original 2 + 3 new = 5 bookmarks
        expect(bundle.bookmarks).toHaveLength(5);
        
        // Check that new bookmarks were added
        const batchBookmarks = bundle.bookmarks.filter(b => b.tags?.includes('batch'));
        expect(batchBookmarks).toHaveLength(3);
      });

      it('should handle empty bookmarks array', async () => {
        const result = await service.addBookmarksBatch('Test Category', 'Test Bundle', []);
        
        expect(result.success).toBe(true);
        
        const updatedRoot = service.getRoot();
        const bundle = updatedRoot.categories[0].bundles[0];
        
        // Should still have original 2 bookmarks
        expect(bundle.bookmarks).toHaveLength(2);
      });
    });

    describe('with sync shell (single sync approach)', () => {
      it('should perform single sync before batch and single save after', async () => {
        // Mock successful sync and save
        vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(success(initialRoot));
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: null,
            gistId: 'test-gist',
            hasConflicts: false,
            conflicts: []
          })
        );

        const result = await service.addBookmarksBatch('Test Category', 'Test Bundle', testBookmarks);
        
        expect(result.success).toBe(true);
        
        // Critical test: Should call sync and save exactly ONCE each (not per bookmark)
        expect(mockSyncShell.syncBeforeOperation).toHaveBeenCalledTimes(1);
        expect(mockSyncShell.saveAfterOperation).toHaveBeenCalledTimes(1);
        
        const updatedRoot = service.getRoot();
        const bundle = updatedRoot.categories[0].bundles[0];
        
        // Should have original 2 + 3 new = 5 bookmarks
        expect(bundle.bookmarks).toHaveLength(5);
      });

      it('should handle sync failure before batch operation', async () => {
        vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(
          failure(new Error('Sync failed'))
        );

        const result = await service.addBookmarksBatch('Test Category', 'Test Bundle', testBookmarks);
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Sync failed');
        
        // Should not call save if sync failed
        expect(mockSyncShell.saveAfterOperation).not.toHaveBeenCalled();
      });

      it('should handle save failure after batch operation', async () => {
        vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(success(initialRoot));
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          failure(new Error('Save failed'))
        );

        const result = await service.addBookmarksBatch('Test Category', 'Test Bundle', testBookmarks);
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Failed to save');
      });

      it('should validate bundle exists after sync', async () => {
        // Mock sync that returns root without the target bundle
        const rootWithoutBundle = createRoot();
        vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(success(rootWithoutBundle));

        const result = await service.addBookmarksBatch('Test Category', 'Test Bundle', testBookmarks);
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bundle \'Test Bundle\' not found in category \'Test Category\' after sync');
      });
    });

    describe('API rate limit prevention', () => {
      it('should dramatically reduce API calls compared to individual adds', async () => {
        vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(success(initialRoot));
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: null,
            gistId: 'test-gist', 
            hasConflicts: false,
            conflicts: []
          })
        );

        // Add 10 bookmarks
        const manyBookmarks = Array.from({ length: 10 }, (_, i) => ({
          title: `Bookmark ${i}`,
          url: `https://test${i}.com`,
          tags: ['bulk']
        }));

        await service.addBookmarksBatch('Test Category', 'Test Bundle', manyBookmarks);
        
        // With batch: 1 sync + 1 save = 2 API calls total
        // Without batch: (1 sync + 1 save) * 10 = 20 API calls
        expect(mockSyncShell.syncBeforeOperation).toHaveBeenCalledTimes(1);
        expect(mockSyncShell.saveAfterOperation).toHaveBeenCalledTimes(1);
        
        // Verify all bookmarks were added
        const updatedRoot = service.getRoot();
        const bundle = updatedRoot.categories[0].bundles[0];
        expect(bundle.bookmarks).toHaveLength(12); // 2 original + 10 new
      });
    });
  });

  describe('moveBookmark', () => {
    beforeEach(() => {
      // Add a second bundle for move operations
      const rootWithTwoBundles = {
        ...initialRoot,
        categories: [
          {
            ...initialRoot.categories[0],
            bundles: [
              ...initialRoot.categories[0].bundles,
              {
                name: 'Target Bundle',
                bookmarks: [],
                metadata: {
                  lastModified: '2023-01-01T00:00:00Z'
                }
              }
            ]
          }
        ]
      };
      service.setRoot(rootWithTwoBundles);
    });

    describe('without sync shell', () => {
      beforeEach(() => {
        service = createBookmarkService(); // No sync shell
        const rootWithTwoBundles = {
          ...initialRoot,
          categories: [
            {
              ...initialRoot.categories[0],
              bundles: [
                ...initialRoot.categories[0].bundles,
                {
                  name: 'Target Bundle',
                  bookmarks: [],
                  metadata: {
                    lastModified: '2023-01-01T00:00:00Z'
                  }
                }
              ]
            }
          ]
        };
        service.setRoot(rootWithTwoBundles);
      });

      it('should move bookmark between bundles locally', async () => {
        const result = await service.moveBookmark(
          'Test Category', 'Test Bundle',
          'Test Category', 'Target Bundle', 
          'bookmark-1'
        );
        
        expect(result.success).toBe(true);
        
        const updatedRoot = service.getRoot();
        const sourceBundle = updatedRoot.categories[0].bundles[0];
        const targetBundle = updatedRoot.categories[0].bundles[1];
        
        // Source bundle should have 1 bookmark left
        expect(sourceBundle.bookmarks).toHaveLength(1);
        expect(sourceBundle.bookmarks[0].id).toBe('bookmark-2');
        
        // Target bundle should have 1 bookmark
        expect(targetBundle.bookmarks).toHaveLength(1);
        expect(targetBundle.bookmarks[0].id).toBe('bookmark-1');
      });

      it('should return error when source bundle does not exist', async () => {
        const result = await service.moveBookmark(
          'Test Category', 'Nonexistent Bundle',
          'Test Category', 'Target Bundle',
          'bookmark-1'
        );
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Source bundle \'Nonexistent Bundle\' not found');
      });

      it('should return error when target bundle does not exist', async () => {
        const result = await service.moveBookmark(
          'Test Category', 'Test Bundle',
          'Test Category', 'Nonexistent Target',
          'bookmark-1'
        );
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Target bundle \'Nonexistent Target\' not found');
      });

      it('should return error when bookmark does not exist in source', async () => {
        const result = await service.moveBookmark(
          'Test Category', 'Test Bundle',
          'Test Category', 'Target Bundle',
          'nonexistent-bookmark'
        );
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bookmark with id \'nonexistent-bookmark\' not found');
      });
    });

    describe('with sync shell (bypass mode)', () => {
      it('should bypass sync and perform direct move for immediate feedback', async () => {
        // Mock successful save
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: null,
            gistId: 'test-gist',
            hasConflicts: false,
            conflicts: []
          })
        );

        const result = await service.moveBookmark(
          'Test Category', 'Test Bundle',
          'Test Category', 'Target Bundle',
          'bookmark-1'
        );
        
        expect(result.success).toBe(true);
        
        // Should NOT call syncBeforeOperation (bypass)
        expect(mockSyncShell.syncBeforeOperation).not.toHaveBeenCalled();
        
        // Should call saveAfterOperation (to persist)
        expect(mockSyncShell.saveAfterOperation).toHaveBeenCalledTimes(1);
        
        const updatedRoot = service.getRoot();
        const sourceBundle = updatedRoot.categories[0].bundles[0];
        const targetBundle = updatedRoot.categories[0].bundles[1];
        
        // Verify move completed without duplication
        expect(sourceBundle.bookmarks).toHaveLength(1);
        expect(targetBundle.bookmarks).toHaveLength(1);
        expect(targetBundle.bookmarks[0].id).toBe('bookmark-1');
      });

      it('should handle move operation errors gracefully', async () => {
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: null,
            gistId: 'test-gist',
            hasConflicts: false,
            conflicts: []
          })
        );

        const result = await service.moveBookmark(
          'Test Category', 'Test Bundle',
          'Test Category', 'Target Bundle',
          'nonexistent-bookmark'
        );
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bookmark with id \'nonexistent-bookmark\' not found');
      });
    });
  });

  describe('removeCategory', () => {
    it('should remove category without sync (hard delete)', async () => {
      // Create service without sync
      service = createBookmarkService();
      
      // Add test data
      await service.addCategory('Category to Delete');
      await service.addBundle('Category to Delete', 'Bundle 1');
      await service.addBookmark('Category to Delete', 'Bundle 1', {
        title: 'Test Bookmark',
        url: 'https://example.com'
      });
      
      // Remove category
      const result = await service.removeCategory('Category to Delete');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Category should be completely gone
        expect(result.data.categories).toHaveLength(0); // All categories removed
        expect(result.data.categories.find(c => c.name === 'Category to Delete')).toBeUndefined();
      }
    });

    it('should soft delete category with sync', async () => {
      // Mock sync to succeed
      vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(
        success({ ...initialRoot, metadata: { lastSynced: '2023-01-01T00:00:00Z' } })
      );
      vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
        success({ mergedRoot: initialRoot, hasChanges: true })
      );
      
      const result = await service.removeCategory('Test Category');
      
      expect(result.success).toBe(true);
      expect(mockSyncShell.syncBeforeOperation).toHaveBeenCalled();
      expect(mockSyncShell.saveAfterOperation).toHaveBeenCalled();
      
      // Verify soft delete was used
      const saveCall = vi.mocked(mockSyncShell.saveAfterOperation).mock.calls[0][0];
      const deletedCategory = saveCall.categories.find(c => c.name === 'Test Category');
      expect(deletedCategory?.metadata?.isDeleted).toBe(true);
    });

    it('should cascade delete all contained data', async () => {
      // Create service without sync
      service = createBookmarkService();
      
      // Add complex test data
      await service.addCategory('Complex Category');
      await service.addBundle('Complex Category', 'Bundle A');
      await service.addBundle('Complex Category', 'Bundle B');
      await service.addBookmark('Complex Category', 'Bundle A', {
        title: 'Bookmark 1',
        url: 'https://example1.com'
      });
      await service.addBookmark('Complex Category', 'Bundle A', {
        title: 'Bookmark 2',
        url: 'https://example2.com'
      });
      await service.addBookmark('Complex Category', 'Bundle B', {
        title: 'Bookmark 3',
        url: 'https://example3.com'
      });
      
      // Remove category
      const result = await service.removeCategory('Complex Category');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Everything should be gone
        expect(result.data.categories.find(c => c.name === 'Complex Category')).toBeUndefined();
      }
    });

    it('should succeed if category does not exist after sync', async () => {
      // Mock sync to succeed but category not found  
      vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(
        success({ ...initialRoot, metadata: { lastSynced: '2023-01-01T00:00:00Z' } })
      );
      
      const result = await service.removeCategory('Non-existent Category');
      
      // Should succeed because category doesn't exist (already removed)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toHaveLength(1); // Original test category remains
      }
    });
  });

  describe('removeBundle', () => {
    it('should remove bundle without sync (hard delete)', async () => {
      // Create service without sync
      service = createBookmarkService();
      
      // Add test data
      await service.addCategory('Test Category');
      await service.addBundle('Test Category', 'Bundle to Delete');
      await service.addBundle('Test Category', 'Other Bundle');
      await service.addBookmark('Test Category', 'Bundle to Delete', {
        title: 'Bookmark 1',
        url: 'https://example1.com'
      });
      await service.addBookmark('Test Category', 'Bundle to Delete', {
        title: 'Bookmark 2',
        url: 'https://example2.com'
      });
      
      // Remove bundle
      const result = await service.removeBundle('Test Category', 'Bundle to Delete');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Bundle should be completely gone
        const category = result.data.categories.find(c => c.name === 'Test Category');
        expect(category?.bundles).toHaveLength(1);
        expect(category?.bundles.find(b => b.name === 'Bundle to Delete')).toBeUndefined();
        expect(category?.bundles[0].name).toBe('Other Bundle');
      }
    });

    it('should soft delete bundle with sync', async () => {
      // Mock sync to succeed
      vi.mocked(mockSyncShell.syncBeforeOperation).mockResolvedValue(
        success({ ...initialRoot, metadata: { lastSynced: '2023-01-01T00:00:00Z' } })
      );
      vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
        success({ mergedRoot: initialRoot, hasChanges: true })
      );
      
      const result = await service.removeBundle('Test Category', 'Test Bundle');
      
      expect(result.success).toBe(true);
      expect(mockSyncShell.syncBeforeOperation).toHaveBeenCalled();
      expect(mockSyncShell.saveAfterOperation).toHaveBeenCalled();
      
      // Verify soft delete was used
      const saveCall = vi.mocked(mockSyncShell.saveAfterOperation).mock.calls[0][0];
      const category = saveCall.categories.find(c => c.name === 'Test Category');
      const deletedBundle = category?.bundles.find(b => b.name === 'Test Bundle');
      expect(deletedBundle?.metadata?.isDeleted).toBe(true);
    });

    it('should cascade delete all bookmarks in bundle', async () => {
      // Create service without sync
      service = createBookmarkService();
      
      // Add test data
      await service.addCategory('Test Category');
      await service.addBundle('Test Category', 'Bundle with Bookmarks');
      for (let i = 1; i <= 5; i++) {
        await service.addBookmark('Test Category', 'Bundle with Bookmarks', {
          title: `Bookmark ${i}`,
          url: `https://example${i}.com`
        });
      }
      
      // Verify bookmarks exist
      let rootBefore = service.getRoot();
      let category = rootBefore.categories.find(c => c.name === 'Test Category');
      let bundle = category?.bundles.find(b => b.name === 'Bundle with Bookmarks');
      expect(bundle?.bookmarks).toHaveLength(5);
      
      // Remove bundle
      const result = await service.removeBundle('Test Category', 'Bundle with Bookmarks');
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Bundle and all bookmarks should be gone
        category = result.data.categories.find(c => c.name === 'Test Category');
        expect(category?.bundles.find(b => b.name === 'Bundle with Bookmarks')).toBeUndefined();
      }
    });

    it('should fail if bundle does not exist', async () => {
      const result = await service.removeBundle('Test Category', 'Non-existent Bundle');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should fail if category does not exist', async () => {
      const result = await service.removeBundle('Non-existent Category', 'Test Bundle');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });

    describe('cross-category move', () => {
      beforeEach(() => {
        // Set up two categories with bundles
        const rootWithTwoCategories = {
          version: 1,
          categories: [
            {
              name: 'Source Category',
              bundles: [
                {
                  name: 'Source Bundle',
                  bookmarks: [
                    {
                      id: 'bookmark-1',
                      title: 'Test Bookmark',
                      url: 'https://test.com',
                      metadata: { lastModified: '2023-01-01T00:00:00Z' }
                    },
                    {
                      id: 'bookmark-2',
                      title: 'Another Bookmark',
                      url: 'https://another.com',
                      metadata: { lastModified: '2023-01-01T00:00:00Z' }
                    }
                  ],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            },
            {
              name: 'Target Category',
              bundles: [
                {
                  name: 'Target Bundle',
                  bookmarks: [],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            }
          ],
          metadata: { lastModified: '2023-01-01T00:00:00Z' }
        };
        
        if (mockSyncShell) {
          // For sync tests
          service.setRoot(rootWithTwoCategories);
        } else {
          // For non-sync tests
          service = createBookmarkService();
          service.setRoot(rootWithTwoCategories);
        }
      });

      it('should move bookmark between different categories', async () => {
        service = createBookmarkService(); // No sync
        const rootWithTwoCategories = {
          version: 1,
          categories: [
            {
              name: 'Source Category',
              bundles: [
                {
                  name: 'Source Bundle',
                  bookmarks: [
                    {
                      id: 'bookmark-1',
                      title: 'Test Bookmark',
                      url: 'https://test.com',
                      metadata: { lastModified: '2023-01-01T00:00:00Z' }
                    },
                    {
                      id: 'bookmark-2',
                      title: 'Another Bookmark',
                      url: 'https://another.com',
                      metadata: { lastModified: '2023-01-01T00:00:00Z' }
                    }
                  ],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            },
            {
              name: 'Target Category',
              bundles: [
                {
                  name: 'Target Bundle',
                  bookmarks: [],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            }
          ],
          metadata: { lastModified: '2023-01-01T00:00:00Z' }
        };
        service.setRoot(rootWithTwoCategories);

        const result = await service.moveBookmark(
          'Source Category', 'Source Bundle',
          'Target Category', 'Target Bundle',
          'bookmark-1'
        );

        expect(result.success).toBe(true);
        
        if (result.success) {
          const updatedRoot = result.data;
          
          // Source should have one less bookmark
          const sourceCategory = updatedRoot.categories.find(c => c.name === 'Source Category');
          const sourceBundle = sourceCategory?.bundles.find(b => b.name === 'Source Bundle');
          expect(sourceBundle?.bookmarks).toHaveLength(1);
          expect(sourceBundle?.bookmarks.find(b => b.id === 'bookmark-1')).toBeUndefined();
          
          // Target should have the moved bookmark
          const targetCategory = updatedRoot.categories.find(c => c.name === 'Target Category');
          const targetBundle = targetCategory?.bundles.find(b => b.name === 'Target Bundle');
          expect(targetBundle?.bookmarks).toHaveLength(1);
          expect(targetBundle?.bookmarks[0].id).toBe('bookmark-1');
          expect(targetBundle?.bookmarks[0].title).toBe('Test Bookmark');
        }
      });

      it('should handle sync during cross-category move', async () => {
        // Use the service with mockSyncShell
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: service.getRoot(),
            hasChanges: true 
          })
        );

        const result = await service.moveBookmark(
          'Source Category', 'Source Bundle',
          'Target Category', 'Target Bundle',
          'bookmark-1'
        );

        expect(result.success).toBe(true);
        
        // Should bypass sync and save directly
        expect(mockSyncShell.syncBeforeOperation).not.toHaveBeenCalled();
        expect(mockSyncShell.saveAfterOperation).toHaveBeenCalled();
      });

      it('should validate source category exists', async () => {
        service = createBookmarkService();
        const rootWithTwoCategories = {
          version: 1,
          categories: [
            {
              name: 'Target Category',
              bundles: [
                {
                  name: 'Target Bundle',
                  bookmarks: [],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            }
          ],
          metadata: { lastModified: '2023-01-01T00:00:00Z' }
        };
        service.setRoot(rootWithTwoCategories);

        const result = await service.moveBookmark(
          'Non-existent Category', 'Source Bundle',
          'Target Category', 'Target Bundle',
          'bookmark-1'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('not found');
        }
      });

      it('should validate target category exists', async () => {
        service = createBookmarkService();
        const rootWithOneCategory = {
          version: 1,
          categories: [
            {
              name: 'Source Category',
              bundles: [
                {
                  name: 'Source Bundle',
                  bookmarks: [
                    {
                      id: 'bookmark-1',
                      title: 'Test Bookmark',
                      url: 'https://test.com',
                      metadata: { lastModified: '2023-01-01T00:00:00Z' }
                    }
                  ],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            }
          ],
          metadata: { lastModified: '2023-01-01T00:00:00Z' }
        };
        service.setRoot(rootWithOneCategory);

        const result = await service.moveBookmark(
          'Source Category', 'Source Bundle',
          'Non-existent Category', 'Target Bundle',
          'bookmark-1'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain('not found');
        }
      });

      it('should preserve bookmark data during cross-category move', async () => {
        service = createBookmarkService();
        const rootWithTwoCategories = {
          version: 1,
          categories: [
            {
              name: 'Source Category',
              bundles: [
                {
                  name: 'Source Bundle',
                  bookmarks: [
                    {
                      id: 'bookmark-complex',
                      title: 'Complex Bookmark',
                      url: 'https://complex.com',
                      tags: ['tag1', 'tag2'],
                      notes: 'Important notes',
                      metadata: { 
                        lastModified: '2023-01-01T00:00:00Z',
                        customField: 'custom value'
                      }
                    }
                  ],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            },
            {
              name: 'Target Category',
              bundles: [
                {
                  name: 'Target Bundle',
                  bookmarks: [],
                  metadata: { lastModified: '2023-01-01T00:00:00Z' }
                }
              ],
              metadata: { lastModified: '2023-01-01T00:00:00Z' }
            }
          ],
          metadata: { lastModified: '2023-01-01T00:00:00Z' }
        };
        service.setRoot(rootWithTwoCategories);

        const result = await service.moveBookmark(
          'Source Category', 'Source Bundle',
          'Target Category', 'Target Bundle',
          'bookmark-complex'
        );

        expect(result.success).toBe(true);
        
        if (result.success) {
          const targetCategory = result.data.categories.find(c => c.name === 'Target Category');
          const targetBundle = targetCategory?.bundles.find(b => b.name === 'Target Bundle');
          const movedBookmark = targetBundle?.bookmarks[0];
          
          // All bookmark data should be preserved
          expect(movedBookmark?.id).toBe('bookmark-complex');
          expect(movedBookmark?.title).toBe('Complex Bookmark');
          expect(movedBookmark?.url).toBe('https://complex.com');
          expect(movedBookmark?.tags).toEqual(['tag1', 'tag2']);
          expect(movedBookmark?.notes).toBe('Important notes');
          expect(movedBookmark?.metadata?.customField).toBe('custom value');
        }
      });
    });
  });

  describe('moveBundle', () => {
    beforeEach(() => {
      // Add a second category for move operations
      const rootWithTwoCategories = {
        ...initialRoot,
        categories: [
          ...initialRoot.categories,
          {
            name: 'Target Category',
            bundles: [],
            metadata: {
              lastModified: '2023-01-01T00:00:00Z'
            }
          }
        ]
      };
      service.setRoot(rootWithTwoCategories);
    });

    describe('without sync shell', () => {
      beforeEach(() => {
        service = createBookmarkService(); // No sync shell
        const rootWithTwoCategories = {
          ...initialRoot,
          categories: [
            ...initialRoot.categories,
            {
              name: 'Target Category',
              bundles: [],
              metadata: {
                lastModified: '2023-01-01T00:00:00Z'
              }
            }
          ]
        };
        service.setRoot(rootWithTwoCategories);
      });

      it('should move bundle between categories locally', async () => {
        const result = await service.moveBundle('Test Category', 'Target Category', 'Test Bundle');
        
        expect(result.success).toBe(true);
        
        const updatedRoot = service.getRoot();
        const sourceCategory = updatedRoot.categories[0];
        const targetCategory = updatedRoot.categories[1];
        
        // Source category should have 0 bundles
        expect(sourceCategory.bundles).toHaveLength(0);
        
        // Target category should have 1 bundle with all bookmarks
        expect(targetCategory.bundles).toHaveLength(1);
        expect(targetCategory.bundles[0].name).toBe('Test Bundle');
        expect(targetCategory.bundles[0].bookmarks).toHaveLength(2);
      });

      it('should return error when source bundle does not exist', async () => {
        const result = await service.moveBundle('Test Category', 'Target Category', 'Nonexistent Bundle');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Bundle \'Nonexistent Bundle\' not found');
      });

      it('should return error when target category does not exist', async () => {
        const result = await service.moveBundle('Test Category', 'Nonexistent Category', 'Test Bundle');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Target category \'Nonexistent Category\' not found');
      });
    });

    describe('with sync shell (bypass mode)', () => {
      it('should bypass sync and perform direct bundle move', async () => {
        // Mock successful save
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          success({ 
            mergedRoot: null,
            gistId: 'test-gist',
            hasConflicts: false,
            conflicts: []
          })
        );

        const result = await service.moveBundle('Test Category', 'Target Category', 'Test Bundle');
        
        expect(result.success).toBe(true);
        
        // Should NOT call syncBeforeOperation (bypass)
        expect(mockSyncShell.syncBeforeOperation).not.toHaveBeenCalled();
        
        // Should call saveAfterOperation (to persist)
        expect(mockSyncShell.saveAfterOperation).toHaveBeenCalledTimes(1);
        
        const updatedRoot = service.getRoot();
        const sourceCategory = updatedRoot.categories[0];
        const targetCategory = updatedRoot.categories[1];
        
        // Verify move completed without duplication
        expect(sourceCategory.bundles).toHaveLength(0);
        expect(targetCategory.bundles).toHaveLength(1);
        expect(targetCategory.bundles[0].name).toBe('Test Bundle');
      });

      it('should handle save failure during bundle move', async () => {
        vi.mocked(mockSyncShell.saveAfterOperation).mockResolvedValue(
          failure(new Error('API error'))
        );

        const result = await service.moveBundle('Test Category', 'Target Category', 'Test Bundle');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Failed to save');
      });
    });
  });
});