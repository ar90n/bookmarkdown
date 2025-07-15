import { describe, it, expect } from 'vitest';
import { compareRootsContent, compareCategoriesContent, compareBundlesContent } from '../../src/lib/utils/metadata';
import { Root, Category, Bundle } from '../../src/lib/types';

describe('Metadata Comparison Functions', () => {
  describe('compareRootsContent', () => {
    it('should return true for identical roots', () => {
      const root1: Root = {
        version: '1.0',
        categories: [
          {
            name: 'Work',
            bundles: [
              {
                name: 'Project A',
                bookmarks: [
                  { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
                ]
              }
            ]
          }
        ]
      };
      
      const root2: Root = {
        version: '1.0',
        categories: [
          {
            name: 'Work',
            bundles: [
              {
                name: 'Project A',
                bookmarks: [
                  { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
                ]
              }
            ]
          }
        ]
      };
      
      expect(compareRootsContent(root1, root2)).toBe(true);
    });

    it('should return false for different versions', () => {
      const root1: Root = { version: '1.0', categories: [] };
      const root2: Root = { version: '2.0', categories: [] };
      
      expect(compareRootsContent(root1, root2)).toBe(false);
    });

    it('should return false for different number of categories', () => {
      const root1: Root = {
        version: '1.0',
        categories: [
          { name: 'Work', bundles: [] },
          { name: 'Personal', bundles: [] }
        ]
      };
      
      const root2: Root = {
        version: '1.0',
        categories: [
          { name: 'Work', bundles: [] }
        ]
      };
      
      expect(compareRootsContent(root1, root2)).toBe(false);
    });

    it('should handle categories in different order', () => {
      const root1: Root = {
        version: '1.0',
        categories: [
          { name: 'Personal', bundles: [] },
          { name: 'Work', bundles: [] }
        ]
      };
      
      const root2: Root = {
        version: '1.0',
        categories: [
          { name: 'Work', bundles: [] },
          { name: 'Personal', bundles: [] }
        ]
      };
      
      expect(compareRootsContent(root1, root2)).toBe(true);
    });

    it('should return false when category content differs', () => {
      const root1: Root = {
        version: '1.0',
        categories: [
          {
            name: 'Work',
            bundles: [
              { name: 'Project A', bookmarks: [] }
            ]
          }
        ]
      };
      
      const root2: Root = {
        version: '1.0',
        categories: [
          {
            name: 'Work',
            bundles: [
              { name: 'Project B', bookmarks: [] }
            ]
          }
        ]
      };
      
      expect(compareRootsContent(root1, root2)).toBe(false);
    });

    it('should handle empty categories arrays', () => {
      const root1: Root = { version: '1.0', categories: [] };
      const root2: Root = { version: '1.0', categories: [] };
      
      expect(compareRootsContent(root1, root2)).toBe(true);
    });

    it('should handle roots with metadata fields', () => {
      const root1: Root = {
        version: '1.0',
        categories: [],
        metadata: {
          lastModified: '2024-01-01',
          lastSynced: '2024-01-01'
        }
      };
      
      const root2: Root = {
        version: '1.0',
        categories: [],
        metadata: {
          lastModified: '2024-01-02',
          lastSynced: '2024-01-02'
        }
      };
      
      // compareRootsContent should only compare content, not metadata
      expect(compareRootsContent(root1, root2)).toBe(true);
    });
  });

  describe('compareCategoriesContent', () => {
    it('should return true for identical categories', () => {
      const category1: Category = {
        name: 'Work',
        bundles: [
          {
            name: 'Project A',
            bookmarks: [
              { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
            ]
          }
        ]
      };
      
      const category2: Category = {
        name: 'Work',
        bundles: [
          {
            name: 'Project A',
            bookmarks: [
              { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
            ]
          }
        ]
      };
      
      expect(compareCategoriesContent(category1, category2)).toBe(true);
    });

    it('should return false for different names', () => {
      const category1: Category = { name: 'Work', bundles: [] };
      const category2: Category = { name: 'Personal', bundles: [] };
      
      expect(compareCategoriesContent(category1, category2)).toBe(false);
    });

    it('should return false for different number of bundles', () => {
      const category1: Category = {
        name: 'Work',
        bundles: [
          { name: 'Project A', bookmarks: [] },
          { name: 'Project B', bookmarks: [] }
        ]
      };
      
      const category2: Category = {
        name: 'Work',
        bundles: [
          { name: 'Project A', bookmarks: [] }
        ]
      };
      
      expect(compareCategoriesContent(category1, category2)).toBe(false);
    });

    it('should handle bundles in different order', () => {
      const category1: Category = {
        name: 'Work',
        bundles: [
          { name: 'Project B', bookmarks: [] },
          { name: 'Project A', bookmarks: [] }
        ]
      };
      
      const category2: Category = {
        name: 'Work',
        bundles: [
          { name: 'Project A', bookmarks: [] },
          { name: 'Project B', bookmarks: [] }
        ]
      };
      
      expect(compareCategoriesContent(category1, category2)).toBe(true);
    });

    it('should return false when bundle content differs', () => {
      const category1: Category = {
        name: 'Work',
        bundles: [
          {
            name: 'Project A',
            bookmarks: [
              { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
            ]
          }
        ]
      };
      
      const category2: Category = {
        name: 'Work',
        bundles: [
          {
            name: 'Project A',
            bookmarks: [
              { id: '2', title: 'GitHub', url: 'https://github.com', order: 0 }
            ]
          }
        ]
      };
      
      expect(compareCategoriesContent(category1, category2)).toBe(false);
    });

    it('should handle empty bundles arrays', () => {
      const category1: Category = { name: 'Work', bundles: [] };
      const category2: Category = { name: 'Work', bundles: [] };
      
      expect(compareCategoriesContent(category1, category2)).toBe(true);
    });

    it('should handle categories with metadata fields', () => {
      const category1: Category = {
        name: 'Work',
        bundles: [],
        metadata: {
          lastModified: '2024-01-01',
          lastSynced: '2024-01-01'
        }
      };
      
      const category2: Category = {
        name: 'Work',
        bundles: [],
        metadata: {
          lastModified: '2024-01-02',
          lastSynced: '2024-01-02'
        }
      };
      
      // compareCategoriesContent should only compare content, not metadata
      expect(compareCategoriesContent(category1, category2)).toBe(true);
    });
  });

  describe('compareBundlesContent', () => {
    it('should return true for identical bundles', () => {
      const bundle1: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 },
          { id: '2', title: 'GitHub', url: 'https://github.com', order: 1 }
        ]
      };
      
      const bundle2: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 },
          { id: '2', title: 'GitHub', url: 'https://github.com', order: 1 }
        ]
      };
      
      expect(compareBundlesContent(bundle1, bundle2)).toBe(true);
    });

    it('should return false for different names', () => {
      const bundle1: Bundle = { name: 'Project A', bookmarks: [] };
      const bundle2: Bundle = { name: 'Project B', bookmarks: [] };
      
      expect(compareBundlesContent(bundle1, bundle2)).toBe(false);
    });

    it('should return false for different number of bookmarks', () => {
      const bundle1: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 },
          { id: '2', title: 'GitHub', url: 'https://github.com', order: 1 }
        ]
      };
      
      const bundle2: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
        ]
      };
      
      expect(compareBundlesContent(bundle1, bundle2)).toBe(false);
    });

    it('should handle bookmarks in different order', () => {
      const bundle1: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '2', title: 'GitHub', url: 'https://github.com', order: 1 },
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
        ]
      };
      
      const bundle2: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 },
          { id: '2', title: 'GitHub', url: 'https://github.com', order: 1 }
        ]
      };
      
      expect(compareBundlesContent(bundle1, bundle2)).toBe(true);
    });

    it('should return false when bookmark content differs', () => {
      const bundle1: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
        ]
      };
      
      const bundle2: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'DuckDuckGo', url: 'https://duckduckgo.com', order: 0 }
        ]
      };
      
      expect(compareBundlesContent(bundle1, bundle2)).toBe(false);
    });

    it('should handle empty bookmarks arrays', () => {
      const bundle1: Bundle = { name: 'Project A', bookmarks: [] };
      const bundle2: Bundle = { name: 'Project A', bookmarks: [] };
      
      expect(compareBundlesContent(bundle1, bundle2)).toBe(true);
    });

    it('should handle bundles with metadata fields', () => {
      const bundle1: Bundle = {
        name: 'Project A',
        bookmarks: [],
        metadata: {
          lastModified: '2024-01-01',
          lastSynced: '2024-01-01'
        }
      };
      
      const bundle2: Bundle = {
        name: 'Project A',
        bookmarks: [],
        metadata: {
          lastModified: '2024-01-02',
          lastSynced: '2024-01-02'
        }
      };
      
      // compareBundlesContent should only compare content, not metadata
      expect(compareBundlesContent(bundle1, bundle2)).toBe(true);
    });

    it('should handle bookmarks with different IDs but same content', () => {
      const bundle1: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '1', title: 'Google', url: 'https://google.com', order: 0 }
        ]
      };
      
      const bundle2: Bundle = {
        name: 'Project A',
        bookmarks: [
          { id: '2', title: 'Google', url: 'https://google.com', order: 0 }
        ]
      };
      
      // IDs are excluded from content comparison (they're only for React keys)
      expect(compareBundlesContent(bundle1, bundle2)).toBe(true);
    });
  });
});