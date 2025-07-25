import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Root, Category, Bundle, Bookmark } from '../../src/lib/types';
import {
  traverseAndUpdate,
  updateBookmarkInTree,
  addBookmarkToTree,
  removeBookmarkFromTree,
  getCurrentTimestamp
} from '../../src/lib/utils/metadata';

describe('Tree Traversal Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have a getCurrentTimestamp function', () => {
    expect(typeof getCurrentTimestamp).toBe('function');
    expect(getCurrentTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  const createTestRoot = (): Root => ({
    version: '1.0',
    categories: [
      {
        name: 'Work',
        bundles: [
          {
            name: 'Project A',
            bookmarks: [
              { id: '1', title: 'Google', url: 'https://google.com', order: 0 },
              { id: '2', title: 'GitHub', url: 'https://github.com', order: 1 }
            ]
          },
          {
            name: 'Project B',
            bookmarks: [
              { id: '3', title: 'MDN', url: 'https://mdn.org', order: 0 }
            ]
          }
        ]
      },
      {
        name: 'Personal',
        bundles: [
          {
            name: 'Reading',
            bookmarks: [
              { id: '4', title: 'Medium', url: 'https://medium.com', order: 0 }
            ]
          }
        ]
      }
    ]
  });

  describe('traverseAndUpdate', () => {
    it('should traverse tree and update matching paths', () => {
      const root = createTestRoot();
      
      const result = traverseAndUpdate(root, {
        path: ['Work', 'Project A'],
        update: (node, level) => {
          if (level === 2 && node.name === 'Project A') {
            return {
              ...node,
              name: 'Project Alpha'
            };
          }
          return node;
        }
      });
      
      expect(result.categories[0].bundles[0].name).toBe('Project Alpha');
      expect(result.categories[0].bundles[1].name).toBe('Project B');
    });

    it('should apply metadata updates during traversal', () => {
      const root = createTestRoot();
      
      const result = traverseAndUpdate(root, {
        path: ['Work', 'Project A'],
        updateMetadata: true,
        timestamp: '2024-02-01T00:00:00Z'
      });
      
      // Root should have updated metadata
      expect(result.metadata?.lastModified).toBe('2024-02-01T00:00:00Z');
      // Category should have updated metadata
      expect(result.categories[0].metadata?.lastModified).toBe('2024-02-01T00:00:00Z');
      // Bundle should have updated metadata
      expect(result.categories[0].bundles[0].metadata?.lastModified).toBe('2024-02-01T00:00:00Z');
      // Other category should not be updated
      expect(result.categories[1].metadata?.lastModified).toBeUndefined();
    });

    it('should handle partial paths', () => {
      const root = createTestRoot();
      
      const result = traverseAndUpdate(root, {
        path: ['Work'],
        update: (node, level) => {
          if (level === 1 && node.name === 'Work') {
            return {
              ...node,
              name: 'Office'
            };
          }
          return node;
        }
      });
      
      expect(result.categories[0].name).toBe('Office');
      expect(result.categories[1].name).toBe('Personal');
    });

    it('should handle non-existent paths', () => {
      const root = createTestRoot();
      
      const result = traverseAndUpdate(root, {
        path: ['NonExistent', 'Path'],
        update: (node) => ({ ...node, name: 'Modified' })
      });
      
      // Should return original root unchanged
      expect(result).toEqual(root);
    });
  });

  describe('updateBookmarkInTree', () => {
    it('should update bookmark and propagate timestamp', () => {
      const root = createTestRoot();
      
      const result = updateBookmarkInTree(
        root,
        'Work',
        'Project A',
        '1',
        { title: 'Google Search' }
      );
      
      const bookmark = result.categories[0].bundles[0].bookmarks[0];
      expect(bookmark.title).toBe('Google Search');
      expect(bookmark.metadata?.lastModified).toBeDefined();
      expect(bookmark.metadata?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Check propagation - all should have the same timestamp
      const timestamp = bookmark.metadata?.lastModified;
      expect(result.metadata?.lastModified).toBe(timestamp);
      expect(result.categories[0].metadata?.lastModified).toBe(timestamp);
      expect(result.categories[0].bundles[0].metadata?.lastModified).toBe(timestamp);
    });

    it('should preserve other bookmarks unchanged', () => {
      const root = createTestRoot();
      
      const result = updateBookmarkInTree(
        root,
        'Work',
        'Project A',
        '1',
        { title: 'Google Search' }
      );
      
      const otherBookmark = result.categories[0].bundles[0].bookmarks[1];
      expect(otherBookmark.title).toBe('GitHub');
      expect(otherBookmark.metadata).toBeUndefined();
    });

    it('should handle non-existent bookmark', () => {
      const root = createTestRoot();
      
      const result = updateBookmarkInTree(
        root,
        'Work',
        'Project A',
        'non-existent',
        { title: 'Updated' }
      );
      
      // Should return unchanged
      expect(result).toEqual(root);
    });
  });

  describe('addBookmarkToTree', () => {
    it('should add bookmark and propagate timestamp', () => {
      const root = createTestRoot();
      const newBookmark: Bookmark = {
        id: '5',
        title: 'New Site',
        url: 'https://newsite.com',
        order: 2
      };
      
      const result = addBookmarkToTree(
        root,
        'Work',
        'Project A',
        newBookmark
      );
      
      const bookmarks = result.categories[0].bundles[0].bookmarks;
      expect(bookmarks).toHaveLength(3);
      expect(bookmarks[2].title).toBe('New Site');
      expect(bookmarks[2].metadata?.lastModified).toBeDefined();
      expect(bookmarks[2].metadata?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Check propagation - all should have the same timestamp
      const timestamp = bookmarks[2].metadata?.lastModified;
      expect(result.metadata?.lastModified).toBe(timestamp);
      expect(result.categories[0].metadata?.lastModified).toBe(timestamp);
      expect(result.categories[0].bundles[0].metadata?.lastModified).toBe(timestamp);
    });

    it('should ensure bookmark has metadata', () => {
      const root = createTestRoot();
      const newBookmark: Bookmark = {
        id: '5',
        title: 'New Site',
        url: 'https://newsite.com',
        order: 2
      };
      
      const result = addBookmarkToTree(
        root,
        'Work',
        'Project A',
        newBookmark
      );
      
      const addedBookmark = result.categories[0].bundles[0].bookmarks[2];
      expect(addedBookmark.metadata).toBeDefined();
      expect(addedBookmark.metadata?.lastModified).toBeDefined();
      expect(addedBookmark.metadata?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(addedBookmark.metadata?.lastSynced).toBeDefined();
      expect(addedBookmark.metadata?.lastSynced).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('removeBookmarkFromTree', () => {
    it('should remove bookmark and propagate timestamp', () => {
      const root = createTestRoot();
      
      const result = removeBookmarkFromTree(
        root,
        'Work',
        'Project A',
        '1'
      );
      
      const bookmarks = result.categories[0].bundles[0].bookmarks;
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].id).toBe('2');
      
      // Check propagation - all should have timestamps
      expect(result.metadata?.lastModified).toBeDefined();
      expect(result.metadata?.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.categories[0].metadata?.lastModified).toBe(result.metadata?.lastModified);
      expect(result.categories[0].bundles[0].metadata?.lastModified).toBe(result.metadata?.lastModified);
    });

    it('should handle removing non-existent bookmark', () => {
      const root = createTestRoot();
      
      const result = removeBookmarkFromTree(
        root,
        'Work',
        'Project A',
        'non-existent'
      );
      
      // Should still have 2 bookmarks
      const bookmarks = result.categories[0].bundles[0].bookmarks;
      expect(bookmarks).toHaveLength(2);
    });

    it('should preserve other bundles unchanged', () => {
      const root = createTestRoot();
      
      const result = removeBookmarkFromTree(
        root,
        'Work',
        'Project A',
        '1'
      );
      
      // Other bundle should be unchanged
      const otherBundle = result.categories[0].bundles[1];
      expect(otherBundle.bookmarks).toHaveLength(1);
      expect(otherBundle.metadata).toBeUndefined();
    });
  });
});