import { describe, it, expect } from 'vitest';
import {
  createCategory,
  updateCategoryName,
  addBundleToCategory,
  removeBundleFromCategory,
  renameBundleInCategory,
  addBookmarkToCategory,
  updateBookmarkInCategory,
  removeBookmarkFromCategory,
  markBookmarkAsDeletedInCategory,
  markBundleAsDeletedInCategory,
  markCategoryAsDeleted,
  findCategoryByName,
  addCategory,
  updateCategoryByName,
  removeCategoryByName,
  renameCategoryByName
} from '../../web/src/lib/core/category.js';
import { Category } from '../../web/src/lib/types/index.js';

describe('category core functions', () => {
  describe('markCategoryAsDeleted', () => {
    it('should mark category and all contents as deleted', () => {
      const category: Category = {
        name: 'Test Category',
        bundles: [
          {
            name: 'Bundle 1',
            bookmarks: [
              {
                id: 'bookmark1',
                title: 'Bookmark 1',
                url: 'https://example1.com',
                metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
              },
              {
                id: 'bookmark2',
                title: 'Bookmark 2',
                url: 'https://example2.com',
                metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
              }
            ],
            metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
          },
          {
            name: 'Bundle 2',
            bookmarks: [
              {
                id: 'bookmark3',
                title: 'Bookmark 3',
                url: 'https://example3.com',
                metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
              }
            ],
            metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
          }
        ],
        metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
      };

      const result = markCategoryAsDeleted(category);

      // Category should be marked as deleted
      expect(result.metadata?.isDeleted).toBe(true);
      expect(result.metadata?.lastModified).not.toBe('2023-01-01T00:00:00.000Z');

      // All bundles should be marked as deleted
      expect(result.bundles).toHaveLength(2);
      result.bundles.forEach(bundle => {
        expect(bundle.metadata?.isDeleted).toBe(true);
        expect(bundle.metadata?.lastModified).not.toBe('2023-01-01T00:00:00.000Z');
      });

      // All bookmarks should be marked as deleted
      result.bundles.forEach(bundle => {
        bundle.bookmarks.forEach(bookmark => {
          expect(bookmark.metadata?.isDeleted).toBe(true);
          expect(bookmark.metadata?.lastModified).not.toBe('2023-01-01T00:00:00.000Z');
        });
      });

      // Original category should remain unchanged
      expect(category.metadata?.isDeleted).toBeUndefined();
      category.bundles.forEach(bundle => {
        expect(bundle.metadata?.isDeleted).toBeUndefined();
        bundle.bookmarks.forEach(bookmark => {
          expect(bookmark.metadata?.isDeleted).toBeUndefined();
        });
      });
    });

    it('should preserve data structure when marking as deleted', () => {
      const category: Category = {
        name: 'Test Category',
        bundles: [
          {
            name: 'Bundle 1',
            bookmarks: [
              {
                id: 'bookmark1',
                title: 'Bookmark 1',
                url: 'https://example1.com',
                tags: ['tag1', 'tag2'],
                notes: 'Some notes'
              }
            ]
          }
        ]
      };

      const result = markCategoryAsDeleted(category);

      // Structure should be preserved
      expect(result.name).toBe('Test Category');
      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].name).toBe('Bundle 1');
      expect(result.bundles[0].bookmarks).toHaveLength(1);
      
      // Bookmark data should be preserved
      const bookmark = result.bundles[0].bookmarks[0];
      expect(bookmark.id).toBe('bookmark1');
      expect(bookmark.title).toBe('Bookmark 1');
      expect(bookmark.url).toBe('https://example1.com');
      expect(bookmark.tags).toEqual(['tag1', 'tag2']);
      expect(bookmark.notes).toBe('Some notes');
    });

    it('should handle empty category', () => {
      const category: Category = {
        name: 'Empty Category',
        bundles: [],
        metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
      };

      const result = markCategoryAsDeleted(category);

      // Category should be marked as deleted
      expect(result.metadata?.isDeleted).toBe(true);
      expect(result.bundles).toHaveLength(0);
    });

    it('should update timestamps consistently', () => {
      const category: Category = {
        name: 'Test Category',
        bundles: [
          {
            name: 'Bundle 1',
            bookmarks: [
              { id: '1', title: 'B1', url: 'https://b1.com' },
              { id: '2', title: 'B2', url: 'https://b2.com' }
            ]
          }
        ]
      };

      const beforeTime = new Date().toISOString();
      const result = markCategoryAsDeleted(category);
      const afterTime = new Date().toISOString();

      // All timestamps should be within the same timeframe
      const categoryTime = result.metadata?.lastModified || '';
      expect(categoryTime >= beforeTime && categoryTime <= afterTime).toBe(true);

      result.bundles.forEach(bundle => {
        const bundleTime = bundle.metadata?.lastModified || '';
        expect(bundleTime >= beforeTime && bundleTime <= afterTime).toBe(true);
        
        bundle.bookmarks.forEach(bookmark => {
          const bookmarkTime = bookmark.metadata?.lastModified || '';
          expect(bookmarkTime >= beforeTime && bookmarkTime <= afterTime).toBe(true);
        });
      });
    });
  });

  describe('markBundleAsDeletedInCategory', () => {
    it('should mark specific bundle as deleted', () => {
      const category: Category = {
        name: 'Test Category',
        bundles: [
          {
            name: 'Bundle 1',
            bookmarks: [
              { id: '1', title: 'B1', url: 'https://b1.com' }
            ]
          },
          {
            name: 'Bundle 2',
            bookmarks: [
              { id: '2', title: 'B2', url: 'https://b2.com' }
            ]
          }
        ]
      };

      const result = markBundleAsDeletedInCategory(category, 'Bundle 1');

      // Only Bundle 1 should be marked as deleted
      expect(result.bundles[0].metadata?.isDeleted).toBe(true);
      expect(result.bundles[0].bookmarks[0].metadata?.isDeleted).toBe(true);
      
      // Bundle 2 should remain untouched
      expect(result.bundles[1].metadata?.isDeleted).toBeUndefined();
      expect(result.bundles[1].bookmarks[0].metadata?.isDeleted).toBeUndefined();
    });
  });

  describe('markBookmarkAsDeletedInCategory', () => {
    it('should mark specific bookmark as deleted', () => {
      const category: Category = {
        name: 'Test Category',
        bundles: [
          {
            name: 'Bundle 1',
            bookmarks: [
              { id: '1', title: 'B1', url: 'https://b1.com' },
              { id: '2', title: 'B2', url: 'https://b2.com' }
            ]
          }
        ]
      };

      const result = markBookmarkAsDeletedInCategory(category, 'Bundle 1', '1');

      // Only bookmark 1 should be marked as deleted
      expect(result.bundles[0].bookmarks[0].metadata?.isDeleted).toBe(true);
      expect(result.bundles[0].bookmarks[1].metadata?.isDeleted).toBeUndefined();
    });
  });

  describe('removeCategoryByName', () => {
    it('should remove category by name (hard delete)', () => {
      const categories: Category[] = [
        { name: 'Category 1', bundles: [] },
        { name: 'Category 2', bundles: [] },
        { name: 'Category 3', bundles: [] }
      ];

      const result = removeCategoryByName(categories, 'Category 2');

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name)).toEqual(['Category 1', 'Category 3']);
    });

    it('should handle non-existent category', () => {
      const categories: Category[] = [
        { name: 'Category 1', bundles: [] }
      ];

      const result = removeCategoryByName(categories, 'Non-existent');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Category 1');
    });
  });
});