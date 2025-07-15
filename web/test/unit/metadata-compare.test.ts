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
});