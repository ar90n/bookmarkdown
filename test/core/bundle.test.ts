import { describe, it, expect } from 'vitest';
import {
  createBundle,
  updateBundleName,
  addBookmarkToBundle,
  updateBookmarkInBundle,
  removeBookmarkFromBundle,
  findBundleByName,
  addBundle,
  updateBundleByName,
  removeBundleByName,
  renameBundleByName,
  markBundleAsDeleted
} from '../../web/src/lib/core/bundle.js';
import { Bundle, BookmarkInput, BookmarkUpdate } from '../../web/src/lib/types/index.js';

describe('bundle core functions', () => {
  describe('createBundle', () => {
    it('should create empty bundle with name', () => {
      const bundle = createBundle('Test Bundle');

      expect(bundle.name).toBe('Test Bundle');
      expect(bundle.bookmarks).toEqual([]);
    });
  });

  describe('updateBundleName', () => {
    it('should update bundle name while preserving bookmarks', () => {
      const bundle: Bundle = {
        name: 'Old Name',
        bookmarks: [
          { id: '1', title: 'Test', url: 'https://test.com' }
        ]
      };

      const updated = updateBundleName(bundle, 'New Name');

      expect(updated.name).toBe('New Name');
      expect(updated.bookmarks).toEqual(bundle.bookmarks);
      expect(bundle.name).toBe('Old Name'); // immutability
    });
  });

  describe('addBookmarkToBundle', () => {
    it('should add bookmark to bundle', () => {
      const bundle = createBundle('Test Bundle');
      const bookmarkInput: BookmarkInput = {
        title: 'New Bookmark',
        url: 'https://new.com',
        tags: ['test'],
        notes: 'Test notes'
      };

      const updated = addBookmarkToBundle(bundle, bookmarkInput);

      expect(updated.bookmarks).toHaveLength(1);
      expect(updated.bookmarks[0].title).toBe('New Bookmark');
      expect(updated.bookmarks[0].url).toBe('https://new.com');
      expect(updated.bookmarks[0].id).toMatch(/^[0-9a-f-]{36}$/);
      expect(bundle.bookmarks).toHaveLength(0); // immutability
    });

    it('should preserve existing bookmarks when adding new one', () => {
      const existingBookmark = { id: '1', title: 'Existing', url: 'https://existing.com' };
      const bundle: Bundle = {
        name: 'Test Bundle',
        bookmarks: [existingBookmark]
      };
      const bookmarkInput: BookmarkInput = {
        title: 'New Bookmark',
        url: 'https://new.com'
      };

      const updated = addBookmarkToBundle(bundle, bookmarkInput);

      expect(updated.bookmarks).toHaveLength(2);
      expect(updated.bookmarks[0]).toEqual(existingBookmark);
      expect(updated.bookmarks[1].title).toBe('New Bookmark');
    });
  });

  describe('updateBookmarkInBundle', () => {
    it('should update specific bookmark in bundle', () => {
      const bundle: Bundle = {
        name: 'Test Bundle',
        bookmarks: [
          { id: '1', title: 'First', url: 'https://first.com' },
          { id: '2', title: 'Second', url: 'https://second.com' },
          { id: '3', title: 'Third', url: 'https://third.com' }
        ]
      };
      const update: BookmarkUpdate = { title: 'Updated Second' };

      const updated = updateBookmarkInBundle(bundle, '2', update);

      expect(updated.bookmarks).toHaveLength(3);
      expect(updated.bookmarks[0].title).toBe('First');
      expect(updated.bookmarks[1].title).toBe('Updated Second');
      expect(updated.bookmarks[1].url).toBe('https://second.com');
      expect(updated.bookmarks[2].title).toBe('Third');
      expect(bundle.bookmarks[1].title).toBe('Second'); // immutability
    });

    it('should preserve bundle when bookmark not found', () => {
      const bundle: Bundle = {
        name: 'Test Bundle',
        bookmarks: [
          { id: '1', title: 'First', url: 'https://first.com' }
        ]
      };
      const update: BookmarkUpdate = { title: 'Not Found' };

      const updated = updateBookmarkInBundle(bundle, 'non-existing', update);

      expect(updated.bookmarks).toEqual(bundle.bookmarks);
      expect(updated).not.toBe(bundle); // still creates new object
    });
  });

  describe('removeBookmarkFromBundle', () => {
    it('should remove specific bookmark from bundle', () => {
      const bundle: Bundle = {
        name: 'Test Bundle',
        bookmarks: [
          { id: '1', title: 'First', url: 'https://first.com' },
          { id: '2', title: 'Second', url: 'https://second.com' },
          { id: '3', title: 'Third', url: 'https://third.com' }
        ]
      };

      const updated = removeBookmarkFromBundle(bundle, '2');

      // Should have 2 bookmarks after hard delete
      expect(updated.bookmarks).toHaveLength(2);
      
      // Bookmark '2' should be completely removed
      const deletedBookmark = updated.bookmarks.find(b => b.id === '2');
      expect(deletedBookmark).toBeUndefined();
      
      // Other bookmarks should not be marked as deleted
      const activeBookmarks = updated.bookmarks.filter(b => b.id !== '2');
      activeBookmarks.forEach(bookmark => {
        expect(bookmark.metadata?.isDeleted).toBeUndefined();
      });
      
      expect(bundle.bookmarks).toHaveLength(3); // immutability
    });

    it('should preserve bundle when bookmark not found', () => {
      const bundle: Bundle = {
        name: 'Test Bundle',
        bookmarks: [
          { id: '1', title: 'First', url: 'https://first.com' }
        ]
      };

      const updated = removeBookmarkFromBundle(bundle, 'non-existing');

      expect(updated.bookmarks).toEqual(bundle.bookmarks);
      expect(updated).not.toBe(bundle); // still creates new object
    });
  });

  describe('bundle array functions', () => {
    const bundles: readonly Bundle[] = [
      { name: 'First Bundle', bookmarks: [] },
      { name: 'Second Bundle', bookmarks: [] },
      { name: 'Third Bundle', bookmarks: [] }
    ];

    describe('findBundleByName', () => {
      it('should find existing bundle', () => {
        const found = findBundleByName(bundles, 'Second Bundle');
        expect(found?.name).toBe('Second Bundle');
      });

      it('should return undefined for non-existing bundle', () => {
        const found = findBundleByName(bundles, 'Non Existing');
        expect(found).toBeUndefined();
      });
    });

    describe('addBundle', () => {
      it('should add bundle to array', () => {
        const newBundle = createBundle('Fourth Bundle');
        const result = addBundle(bundles, newBundle);

        expect(result).toHaveLength(4);
        expect(result[3]).toEqual(newBundle);
        expect(bundles).toHaveLength(3); // immutability
      });
    });

    describe('updateBundleByName', () => {
      it('should update existing bundle', () => {
        const updater = (bundle: Bundle) => updateBundleName(bundle, 'Updated Second');
        const result = updateBundleByName(bundles, 'Second Bundle', updater);

        expect(result).toHaveLength(3);
        expect(result[1].name).toBe('Updated Second');
        expect(bundles[1].name).toBe('Second Bundle'); // immutability
      });

      it('should preserve array when bundle not found', () => {
        const updater = (bundle: Bundle) => updateBundleName(bundle, 'Not Found');
        const result = updateBundleByName(bundles, 'Non Existing', updater);

        expect(result).toEqual(bundles);
        expect(result).not.toBe(bundles); // still creates new array
      });
    });

    describe('removeBundleByName', () => {
      it('should remove bundle by name', () => {
        const result = removeBundleByName(bundles, 'Second Bundle');

        expect(result).toHaveLength(2);
        expect(result.map(b => b.name)).toEqual(['First Bundle', 'Third Bundle']);
        expect(bundles).toHaveLength(3); // immutability
      });

      it('should preserve array when bundle not found', () => {
        const result = removeBundleByName(bundles, 'Non Existing');

        expect(result).toEqual(bundles);
        expect(result).not.toBe(bundles); // still creates new array
      });
    });

    describe('renameBundleByName', () => {
      it('should rename existing bundle', () => {
        const result = renameBundleByName(bundles, 'Second Bundle', 'Renamed Bundle');

        expect(result).toHaveLength(3);
        expect(result[1].name).toBe('Renamed Bundle');
        expect(bundles[1].name).toBe('Second Bundle'); // immutability
      });

      it('should preserve array when bundle not found', () => {
        const result = renameBundleByName(bundles, 'Non Existing', 'New Name');

        expect(result).toEqual(bundles);
        expect(result).not.toBe(bundles); // still creates new array
      });
    });

    describe('markBundleAsDeleted', () => {
      it('should mark bundle and all contained bookmarks as deleted', () => {
        const bundle: Bundle = {
          name: 'Test Bundle',
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
        };

        const result = markBundleAsDeleted(bundle);

        // Bundle should be marked as deleted
        expect(result.metadata?.isDeleted).toBe(true);
        expect(result.metadata?.lastModified).not.toBe('2023-01-01T00:00:00.000Z');

        // All bookmarks should be marked as deleted
        expect(result.bookmarks).toHaveLength(2);
        result.bookmarks.forEach(bookmark => {
          expect(bookmark.metadata?.isDeleted).toBe(true);
          expect(bookmark.metadata?.lastModified).not.toBe('2023-01-01T00:00:00.000Z');
        });

        // Original bundle should remain unchanged
        expect(bundle.metadata?.isDeleted).toBeUndefined();
        bundle.bookmarks.forEach(bookmark => {
          expect(bookmark.metadata?.isDeleted).toBeUndefined();
        });
      });

      it('should handle empty bundle', () => {
        const bundle: Bundle = {
          name: 'Empty Bundle',
          bookmarks: [],
          metadata: { lastModified: '2023-01-01T00:00:00.000Z' }
        };

        const result = markBundleAsDeleted(bundle);

        expect(result.metadata?.isDeleted).toBe(true);
        expect(result.bookmarks).toHaveLength(0);
      });
    });
  });
});