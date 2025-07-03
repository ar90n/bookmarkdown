import { describe, it, expect } from 'vitest';
import {
  createRoot,
  addCategoryToRoot,
  removeCategoryFromRoot,
  renameCategoryInRoot,
  addBundleToRoot,
  removeBundleFromRoot,
  renameBundleInRoot,
  addBookmarkToRoot,
  updateBookmarkInRoot,
  removeBookmarkFromRoot,
  searchBookmarksInRoot,
  getStatsFromRoot
} from '../../src/core/root.js';
import { Root, BookmarkInput, BookmarkUpdate, BookmarkFilter } from '../../src/types/index.js';

describe('root core functions', () => {
  describe('createRoot', () => {
    it('should create empty root with version 1', () => {
      const root = createRoot();

      expect(root.version).toBe(1);
      expect(root.categories).toEqual([]);
    });
  });

  describe('category operations', () => {
    describe('addCategoryToRoot', () => {
      it('should add category to empty root', () => {
        const root = createRoot();
        const updated = addCategoryToRoot(root, 'Test Category');

        expect(updated.categories).toHaveLength(1);
        expect(updated.categories[0].name).toBe('Test Category');
        expect(updated.categories[0].bundles).toEqual([]);
        expect(root.categories).toHaveLength(0); // immutability
      });

      it('should add category to existing root', () => {
        const root: Root = {
          version: 1,
          categories: [
            { name: 'Existing Category', bundles: [] }
          ]
        };
        const updated = addCategoryToRoot(root, 'New Category');

        expect(updated.categories).toHaveLength(2);
        expect(updated.categories[1].name).toBe('New Category');
      });
    });

    describe('removeCategoryFromRoot', () => {
      it('should remove existing category', () => {
        const root: Root = {
          version: 1,
          categories: [
            { name: 'First Category', bundles: [] },
            { name: 'Second Category', bundles: [] },
            { name: 'Third Category', bundles: [] }
          ]
        };
        const updated = removeCategoryFromRoot(root, 'Second Category');

        expect(updated.categories).toHaveLength(2);
        expect(updated.categories.map(c => c.name)).toEqual(['First Category', 'Third Category']);
        expect(root.categories).toHaveLength(3); // immutability
      });

      it('should preserve root when category not found', () => {
        const root = createRoot();
        const updated = removeCategoryFromRoot(root, 'Non Existing');

        expect(updated.categories).toEqual([]);
        expect(updated).not.toBe(root); // still creates new object
      });
    });

    describe('renameCategoryInRoot', () => {
      it('should rename existing category', () => {
        const root: Root = {
          version: 1,
          categories: [
            { name: 'Old Name', bundles: [] }
          ]
        };
        const updated = renameCategoryInRoot(root, 'Old Name', 'New Name');

        expect(updated.categories[0].name).toBe('New Name');
        expect(root.categories[0].name).toBe('Old Name'); // immutability
      });
    });
  });

  describe('bundle operations', () => {
    const rootWithCategory: Root = {
      version: 1,
      categories: [
        { name: 'Test Category', bundles: [] }
      ]
    };

    describe('addBundleToRoot', () => {
      it('should add bundle to existing category', () => {
        const updated = addBundleToRoot(rootWithCategory, 'Test Category', 'New Bundle');

        expect(updated.categories[0].bundles).toHaveLength(1);
        expect(updated.categories[0].bundles[0].name).toBe('New Bundle');
        expect(rootWithCategory.categories[0].bundles).toHaveLength(0); // immutability
      });
    });

    describe('removeBundleFromRoot', () => {
      it('should remove bundle from category', () => {
        const root: Root = {
          version: 1,
          categories: [
            {
              name: 'Test Category',
              bundles: [
                { name: 'Bundle 1', bookmarks: [] },
                { name: 'Bundle 2', bookmarks: [] }
              ]
            }
          ]
        };
        const updated = removeBundleFromRoot(root, 'Test Category', 'Bundle 1');

        expect(updated.categories[0].bundles).toHaveLength(1);
        expect(updated.categories[0].bundles[0].name).toBe('Bundle 2');
      });
    });

    describe('renameBundleInRoot', () => {
      it('should rename bundle in category', () => {
        const root: Root = {
          version: 1,
          categories: [
            {
              name: 'Test Category',
              bundles: [
                { name: 'Old Bundle Name', bookmarks: [] }
              ]
            }
          ]
        };
        const updated = renameBundleInRoot(root, 'Test Category', 'Old Bundle Name', 'New Bundle Name');

        expect(updated.categories[0].bundles[0].name).toBe('New Bundle Name');
        expect(root.categories[0].bundles[0].name).toBe('Old Bundle Name'); // immutability
      });
    });
  });

  describe('bookmark operations', () => {
    const rootWithStructure: Root = {
      version: 1,
      categories: [
        {
          name: 'Test Category',
          bundles: [
            { name: 'Test Bundle', bookmarks: [] }
          ]
        }
      ]
    };

    describe('addBookmarkToRoot', () => {
      it('should add bookmark to bundle', () => {
        const bookmarkInput: BookmarkInput = {
          title: 'Test Bookmark',
          url: 'https://test.com',
          tags: ['test'],
          notes: 'Test notes'
        };
        const updated = addBookmarkToRoot(rootWithStructure, 'Test Category', 'Test Bundle', bookmarkInput);

        expect(updated.categories[0].bundles[0].bookmarks).toHaveLength(1);
        expect(updated.categories[0].bundles[0].bookmarks[0].title).toBe('Test Bookmark');
        expect(rootWithStructure.categories[0].bundles[0].bookmarks).toHaveLength(0); // immutability
      });
    });

    describe('updateBookmarkInRoot', () => {
      it('should update bookmark in bundle', () => {
        const root: Root = {
          version: 1,
          categories: [
            {
              name: 'Test Category',
              bundles: [
                {
                  name: 'Test Bundle',
                  bookmarks: [
                    { id: 'test-id', title: 'Original Title', url: 'https://original.com' }
                  ]
                }
              ]
            }
          ]
        };
        const update: BookmarkUpdate = { title: 'Updated Title' };
        const updated = updateBookmarkInRoot(root, 'Test Category', 'Test Bundle', 'test-id', update);

        expect(updated.categories[0].bundles[0].bookmarks[0].title).toBe('Updated Title');
        expect(root.categories[0].bundles[0].bookmarks[0].title).toBe('Original Title'); // immutability
      });
    });

    describe('removeBookmarkFromRoot', () => {
      it('should remove bookmark from bundle', () => {
        const root: Root = {
          version: 1,
          categories: [
            {
              name: 'Test Category',
              bundles: [
                {
                  name: 'Test Bundle',
                  bookmarks: [
                    { id: 'test-id', title: 'Test Bookmark', url: 'https://test.com' }
                  ]
                }
              ]
            }
          ]
        };
        const updated = removeBookmarkFromRoot(root, 'Test Category', 'Test Bundle', 'test-id');

        expect(updated.categories[0].bundles[0].bookmarks).toHaveLength(0);
        expect(root.categories[0].bundles[0].bookmarks).toHaveLength(1); // immutability
      });
    });
  });

  describe('searchBookmarksInRoot', () => {
    const rootWithBookmarks: Root = {
      version: 1,
      categories: [
        {
          name: 'Development',
          bundles: [
            {
              name: 'React',
              bookmarks: [
                {
                  id: '1',
                  title: 'React Documentation',
                  url: 'https://react.dev',
                  tags: ['react', 'documentation'],
                  notes: 'Official React docs'
                }
              ]
            },
            {
              name: 'TypeScript',
              bookmarks: [
                {
                  id: '2',
                  title: 'TypeScript Handbook',
                  url: 'https://typescriptlang.org',
                  tags: ['typescript', 'documentation'],
                  notes: 'TypeScript reference'
                }
              ]
            }
          ]
        },
        {
          name: 'Design',
          bundles: [
            {
              name: 'UI Libraries',
              bookmarks: [
                {
                  id: '3',
                  title: 'Material UI',
                  url: 'https://mui.com',
                  tags: ['react', 'ui', 'components'],
                  notes: 'React component library'
                }
              ]
            }
          ]
        }
      ]
    };

    it('should return all bookmarks when no filter is provided', () => {
      const results = searchBookmarksInRoot(rootWithBookmarks);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.bookmark.title)).toEqual([
        'React Documentation',
        'TypeScript Handbook',
        'Material UI'
      ]);
    });

    it('should filter by category name', () => {
      const filter: BookmarkFilter = { categoryName: 'Development' };
      const results = searchBookmarksInRoot(rootWithBookmarks, filter);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.bookmark.title)).toEqual([
        'React Documentation',
        'TypeScript Handbook'
      ]);
    });

    it('should filter by bundle name', () => {
      const filter: BookmarkFilter = { bundleName: 'React' };
      const results = searchBookmarksInRoot(rootWithBookmarks, filter);

      expect(results).toHaveLength(1);
      expect(results[0].bookmark.title).toBe('React Documentation');
    });

    it('should filter by category and bundle name', () => {
      const filter: BookmarkFilter = {
        categoryName: 'Design',
        bundleName: 'UI Libraries'
      };
      const results = searchBookmarksInRoot(rootWithBookmarks, filter);

      expect(results).toHaveLength(1);
      expect(results[0].bookmark.title).toBe('Material UI');
    });

    it('should filter by search term', () => {
      const filter: BookmarkFilter = { searchTerm: 'react' };
      const results = searchBookmarksInRoot(rootWithBookmarks, filter);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.bookmark.title)).toEqual([
        'React Documentation',
        'Material UI'
      ]);
    });

    it('should filter by tags', () => {
      const filter: BookmarkFilter = { tags: ['documentation'] };
      const results = searchBookmarksInRoot(rootWithBookmarks, filter);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.bookmark.title)).toEqual([
        'React Documentation',
        'TypeScript Handbook'
      ]);
    });

    it('should return search results with context', () => {
      const filter: BookmarkFilter = { searchTerm: 'material' };
      const results = searchBookmarksInRoot(rootWithBookmarks, filter);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        bookmark: expect.objectContaining({ title: 'Material UI' }),
        categoryName: 'Design',
        bundleName: 'UI Libraries'
      });
    });
  });

  describe('getStatsFromRoot', () => {
    it('should return stats for empty root', () => {
      const root = createRoot();
      const stats = getStatsFromRoot(root);

      expect(stats).toEqual({
        categoriesCount: 0,
        bundlesCount: 0,
        bookmarksCount: 0,
        tagsCount: 0
      });
    });

    it('should calculate stats correctly', () => {
      const root: Root = {
        version: 1,
        categories: [
          {
            name: 'Category 1',
            bundles: [
              {
                name: 'Bundle 1',
                bookmarks: [
                  {
                    id: '1',
                    title: 'Bookmark 1',
                    url: 'https://test1.com',
                    tags: ['tag1', 'tag2']
                  },
                  {
                    id: '2',
                    title: 'Bookmark 2',
                    url: 'https://test2.com',
                    tags: ['tag2', 'tag3']
                  }
                ]
              },
              {
                name: 'Bundle 2',
                bookmarks: [
                  {
                    id: '3',
                    title: 'Bookmark 3',
                    url: 'https://test3.com',
                    tags: ['tag1']
                  }
                ]
              }
            ]
          },
          {
            name: 'Category 2',
            bundles: [
              {
                name: 'Bundle 3',
                bookmarks: []
              }
            ]
          }
        ]
      };

      const stats = getStatsFromRoot(root);

      expect(stats).toEqual({
        categoriesCount: 2,
        bundlesCount: 3,
        bookmarksCount: 3,
        tagsCount: 3 // tag1, tag2, tag3 (case-insensitive count)
      });
    });

    it('should count unique tags case-insensitively', () => {
      const root: Root = {
        version: 1,
        categories: [
          {
            name: 'Category',
            bundles: [
              {
                name: 'Bundle',
                bookmarks: [
                  {
                    id: '1',
                    title: 'Bookmark',
                    url: 'https://test.com',
                    tags: ['React', 'react', 'REACT', 'typescript', 'TypeScript']
                  }
                ]
              }
            ]
          }
        ]
      };

      const stats = getStatsFromRoot(root);

      expect(stats.tagsCount).toBe(2); // react and typescript (case-insensitive)
    });
  });
});