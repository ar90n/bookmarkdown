import { describe, it, expect } from 'vitest';
import {
  createBookmark,
  updateBookmark,
  bookmarkMatchesFilter,
  findBookmarkById,
  removeBookmarkById,
  addBookmark,
  updateBookmarkById
} from '../../src/core/bookmark.js';
import { Bookmark, BookmarkInput, BookmarkUpdate, BookmarkFilter } from '../../src/types/index.js';

describe('bookmark core functions', () => {
  describe('createBookmark', () => {
    it('should create a bookmark with generated ID', () => {
      const input: BookmarkInput = {
        title: 'Test',
        url: 'https://example.com',
        tags: ['test'],
        notes: 'Test notes'
      };

      const bookmark = createBookmark(input);

      expect(bookmark).toMatchObject({
        title: 'Test',
        url: 'https://example.com',
        tags: ['test'],
        notes: 'Test notes'
      });
      expect(bookmark.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should create a bookmark without optional fields', () => {
      const input: BookmarkInput = {
        title: 'Test',
        url: 'https://example.com'
      };

      const bookmark = createBookmark(input);

      expect(bookmark.title).toBe('Test');
      expect(bookmark.url).toBe('https://example.com');
      expect(bookmark.tags).toBeUndefined();
      expect(bookmark.notes).toBeUndefined();
    });

    it('should preserve immutability of input tags array', () => {
      const tags = ['tag1', 'tag2'];
      const input: BookmarkInput = {
        title: 'Test',
        url: 'https://example.com',
        tags
      };

      const bookmark = createBookmark(input);
      bookmark.tags!.push('tag3');

      expect(tags).toEqual(['tag1', 'tag2']);
      expect(input.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('updateBookmark', () => {
    const baseBookmark: Bookmark = {
      id: 'test-id',
      title: 'Original',
      url: 'https://original.com',
      tags: ['original'],
      notes: 'Original notes'
    };

    it('should update title', () => {
      const update: BookmarkUpdate = { title: 'Updated' };
      const updated = updateBookmark(baseBookmark, update);

      expect(updated.title).toBe('Updated');
      expect(updated.url).toBe('https://original.com');
      expect(baseBookmark.title).toBe('Original'); // immutability
    });

    it('should update url', () => {
      const update: BookmarkUpdate = { url: 'https://updated.com' };
      const updated = updateBookmark(baseBookmark, update);

      expect(updated.url).toBe('https://updated.com');
      expect(updated.title).toBe('Original');
    });

    it('should update tags with immutability', () => {
      const newTags = ['new', 'tags'];
      const update: BookmarkUpdate = { tags: newTags };
      const updated = updateBookmark(baseBookmark, update);

      expect(updated.tags).toEqual(['new', 'tags']);
      expect(updated.tags).not.toBe(newTags); // should be a copy
      expect(baseBookmark.tags).toEqual(['original']);
    });

    it('should remove tags when set to undefined', () => {
      const update: BookmarkUpdate = { tags: undefined };
      const updated = updateBookmark(baseBookmark, update);

      expect(updated.tags).toBeUndefined();
    });

    it('should update multiple fields', () => {
      const update: BookmarkUpdate = {
        title: 'Multi Update',
        notes: 'Multi notes'
      };
      const updated = updateBookmark(baseBookmark, update);

      expect(updated.title).toBe('Multi Update');
      expect(updated.notes).toBe('Multi notes');
      expect(updated.url).toBe('https://original.com');
    });
  });

  describe('bookmarkMatchesFilter', () => {
    const bookmark: Bookmark = {
      id: 'test-id',
      title: 'React Tutorial',
      url: 'https://react.dev/tutorial',
      tags: ['react', 'javascript', 'tutorial'],
      notes: 'Great tutorial for beginners'
    };

    it('should match when no filter is provided', () => {
      const filter: BookmarkFilter = {};
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should match when searchTerm matches title', () => {
      const filter: BookmarkFilter = { searchTerm: 'react' };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should match when searchTerm matches url', () => {
      const filter: BookmarkFilter = { searchTerm: 'react.dev' };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should match when searchTerm matches notes', () => {
      const filter: BookmarkFilter = { searchTerm: 'beginners' };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should match when searchTerm matches tags', () => {
      const filter: BookmarkFilter = { searchTerm: 'javascript' };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should not match when searchTerm does not match anything', () => {
      const filter: BookmarkFilter = { searchTerm: 'python' };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(false);
    });

    it('should match when all required tags are present', () => {
      const filter: BookmarkFilter = { tags: ['react', 'tutorial'] };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should not match when not all required tags are present', () => {
      const filter: BookmarkFilter = { tags: ['react', 'python'] };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(false);
    });

    it('should not match when bookmark has no tags but filter requires tags', () => {
      const noTagsBookmark = { ...bookmark, tags: undefined };
      const filter: BookmarkFilter = { tags: ['react'] };
      expect(bookmarkMatchesFilter(noTagsBookmark, filter)).toBe(false);
    });

    it('should match with case insensitive search', () => {
      const filter: BookmarkFilter = { searchTerm: 'REACT' };
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });

    it('should match with partial tag match', () => {
      const filter: BookmarkFilter = { tags: ['java'] }; // partial match for 'javascript'
      expect(bookmarkMatchesFilter(bookmark, filter)).toBe(true);
    });
  });

  describe('array manipulation functions', () => {
    const bookmarks: readonly Bookmark[] = [
      { id: '1', title: 'First', url: 'https://first.com' },
      { id: '2', title: 'Second', url: 'https://second.com' },
      { id: '3', title: 'Third', url: 'https://third.com' }
    ];

    describe('findBookmarkById', () => {
      it('should find existing bookmark', () => {
        const found = findBookmarkById(bookmarks, '2');
        expect(found?.title).toBe('Second');
      });

      it('should return undefined for non-existing bookmark', () => {
        const found = findBookmarkById(bookmarks, 'non-existing');
        expect(found).toBeUndefined();
      });
    });

    describe('removeBookmarkById', () => {
      it('should remove bookmark by id', () => {
        const result = removeBookmarkById(bookmarks, '2');
        expect(result).toHaveLength(2);
        expect(result.map(b => b.id)).toEqual(['1', '3']);
      });

      it('should return original array when id not found', () => {
        const result = removeBookmarkById(bookmarks, 'non-existing');
        expect(result).toHaveLength(3);
        expect(result).toEqual(bookmarks);
      });

      it('should preserve immutability', () => {
        const result = removeBookmarkById(bookmarks, '2');
        expect(bookmarks).toHaveLength(3); // original unchanged
        expect(result).not.toBe(bookmarks); // new array
      });
    });

    describe('addBookmark', () => {
      it('should add bookmark to array', () => {
        const newBookmark: Bookmark = {
          id: '4',
          title: 'Fourth',
          url: 'https://fourth.com'
        };
        const result = addBookmark(bookmarks, newBookmark);

        expect(result).toHaveLength(4);
        expect(result[3]).toEqual(newBookmark);
        expect(bookmarks).toHaveLength(3); // original unchanged
      });
    });

    describe('updateBookmarkById', () => {
      it('should update existing bookmark', () => {
        const update: BookmarkUpdate = { title: 'Updated Second' };
        const result = updateBookmarkById(bookmarks, '2', update);

        expect(result).toHaveLength(3);
        expect(result[1].title).toBe('Updated Second');
        expect(result[1].url).toBe('https://second.com');
        expect(bookmarks[1].title).toBe('Second'); // original unchanged
      });

      it('should return original array when id not found', () => {
        const update: BookmarkUpdate = { title: 'Not Found' };
        const result = updateBookmarkById(bookmarks, 'non-existing', update);

        expect(result).toEqual(bookmarks);
        expect(result).not.toBe(bookmarks); // still creates new array
      });
    });
  });
});