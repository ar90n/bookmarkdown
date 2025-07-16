import { describe, it, expect, beforeEach } from 'vitest';
import { createBookmarkService } from '../../src/lib/adapters/bookmark-service';

describe('BookmarkService Basic Operations', () => {
  let service: ReturnType<typeof createBookmarkService>;

  beforeEach(() => {
    service = createBookmarkService();
  });

  describe('Category operations', () => {
    it('should add a category', () => {
      const result = service.addCategory('Development');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const root = result.data;
        expect(root.categories).toHaveLength(1);
        expect(root.categories[0].name).toBe('Development');
      }
    });

    it('should fail on duplicate category', () => {
      service.addCategory('Development');
      const result = service.addCategory('Development');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('already exists');
      }
    });

    it('should remove a category', () => {
      service.addCategory('Development');
      const result = service.removeCategory('Development');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.categories).toHaveLength(0);
      }
    });
  });

  describe('Bundle operations', () => {
    beforeEach(() => {
      service.addCategory('Development');
    });

    it('should add a bundle', () => {
      const result = service.addBundle('Development', 'Frontend');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const category = result.data.categories[0];
        expect(category.bundles).toHaveLength(1);
        expect(category.bundles[0].name).toBe('Frontend');
      }
    });

    it('should fail on non-existent category', () => {
      const result = service.addBundle('NonExistent', 'Frontend');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });
  });

  describe('Bookmark operations', () => {
    beforeEach(() => {
      service.addCategory('Development');
      service.addBundle('Development', 'Frontend');
    });

    it('should add a bookmark', () => {
      const result = service.addBookmark('Development', 'Frontend', {
        title: 'React Docs',
        url: 'https://react.dev'
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const bundle = result.data.categories[0].bundles[0];
        expect(bundle.bookmarks).toHaveLength(1);
        expect(bundle.bookmarks[0].title).toBe('React Docs');
      }
    });

    it('should add multiple bookmarks', () => {
      const result = service.addBookmarksBatch('Development', 'Frontend', [
        { title: 'React', url: 'https://react.dev' },
        { title: 'Vue', url: 'https://vuejs.org' }
      ]);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.success) {
        const bundle = result.data.categories[0].bundles[0];
        expect(bundle.bookmarks).toHaveLength(2);
      }
    });
  });

  describe('Search and stats', () => {
    beforeEach(() => {
      service.addCategory('Development');
      service.addBundle('Development', 'Frontend');
      service.addBookmark('Development', 'Frontend', {
        title: 'React Documentation',
        url: 'https://react.dev',
        tags: ['react', 'docs']
      });
    });

    it('should search bookmarks', () => {
      const results = service.searchBookmarks({ query: 'react' });
      
      expect(results).toHaveLength(1);
      expect(results[0].bookmark.title).toBe('React Documentation');
    });

    it('should get stats', () => {
      const stats = service.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.categoriesCount).toBe(1);
      expect(stats.bundlesCount).toBe(1);
      expect(stats.bookmarksCount).toBe(1);
    });
  });

  describe('Dirty state', () => {
    it('should track dirty state', () => {
      expect(service.isDirty()).toBe(false);
      
      service.addCategory('Test');
      
      expect(service.isDirty()).toBe(true);
    });
  });
});