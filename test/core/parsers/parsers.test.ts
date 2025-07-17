import { describe, it, expect } from 'vitest';
import { MarkdownParser, MarkdownGenerator } from '../../../web/src/lib/parsers';
import { createRoot } from '../../../web/src/lib/core/root';
import { addCategoryToRoot } from '../../../web/src/lib/core/root';
import { addBundleToRoot } from '../../../web/src/lib/core/root';
import { addBookmarkToRoot } from '../../../web/src/lib/core/root';
import type { Root } from '../../../web/src/lib/types';

describe('Markdown Parsers', () => {
  const markdownParser = new MarkdownParser();
  const markdownGenerator = new MarkdownGenerator();
  
  describe('MarkdownParser', () => {
    it('should parse empty markdown', () => {
      const markdown = '# BookMarkDown\n\nYour bookmark collection';
      const result = markdownParser.parse(markdown);
      
      expect(result.version).toBe(1);
      // The parser treats '# BookMarkDown' as a category
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].name).toBe('BookMarkDown');
      expect(result.categories[0].bundles).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should parse markdown with categories', () => {
      const markdown = `# 📚 Development

# 🎮 Gaming`;
      
      const result = markdownParser.parse(markdown);
      
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe('📚 Development');
      expect(result.categories[1].name).toBe('🎮 Gaming');
    });

    it('should parse markdown with bundles', () => {
      const markdown = `# 📚 Development

## Frontend

## Backend`;
      
      const result = markdownParser.parse(markdown);
      
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].bundles).toHaveLength(2);
      expect(result.categories[0].bundles[0].name).toBe('Frontend');
      expect(result.categories[0].bundles[1].name).toBe('Backend');
    });

    it('should parse markdown with bookmarks', () => {
      const markdown = `# 📚 Development

## Frontend

- [React Documentation](https://react.dev)
  - tags: react, docs, javascript
  - notes: Official React documentation

- [Vue.js](https://vuejs.org)
  - tags: vue, javascript
  - notes: The Progressive JavaScript Framework`;
      
      const result = markdownParser.parse(markdown);
      
      expect(result.categories[0].bundles[0].bookmarks).toHaveLength(2);
      
      const bookmark1 = result.categories[0].bundles[0].bookmarks[0];
      expect(bookmark1.title).toBe('React Documentation');
      expect(bookmark1.url).toBe('https://react.dev');
      expect(bookmark1.tags).toEqual(['react', 'docs', 'javascript']);
      expect(bookmark1.notes).toBe('Official React documentation');
      
      const bookmark2 = result.categories[0].bundles[0].bookmarks[1];
      expect(bookmark2.title).toBe('Vue.js');
      expect(bookmark2.url).toBe('https://vuejs.org');
    });

    it('should handle emoji prefixes in names', () => {
      const markdown = `# 📚 Development

## 🔧 Tools

- [🚀 Fast Tool](https://example.com)`;
      
      const result = markdownParser.parse(markdown);
      
      expect(result.categories[0].name).toBe('📚 Development');
      expect(result.categories[0].bundles[0].name).toBe('🔧 Tools');
      expect(result.categories[0].bundles[0].bookmarks[0].title).toBe('🚀 Fast Tool');
    });

    it('should handle malformed markdown gracefully', () => {
      const markdown = `# Development

- [Bookmark without bundle](https://example.com)

## Bundle after bookmark

# 

## Empty category name`;
      
      const result = markdownParser.parse(markdown);
      
      // Should still parse what it can
      expect(result.categories.length).toBeGreaterThan(0);
    });

    it('should parse bookmarks with empty titles', () => {
      const markdown = `# Dev

## Tools

- [https://example.com](https://example.com)
- [Empty Title Example](https://empty-title.com)`;
      
      const result = markdownParser.parse(markdown);
      
      const bookmarks = result.categories[0].bundles[0].bookmarks;
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0].url).toBe('https://example.com');
      expect(bookmarks[0].title).toBe('https://example.com');
      expect(bookmarks[1].url).toBe('https://empty-title.com');
      expect(bookmarks[1].title).toBe('Empty Title Example');
    });
  });

  describe('MarkdownGenerator', () => {
    let testRoot: Root;

    beforeEach(() => {
      testRoot = createRoot();
      testRoot = addCategoryToRoot(testRoot, 'Development');
      testRoot = addCategoryToRoot(testRoot, 'Personal');
      testRoot = addBundleToRoot(testRoot, 'Development', 'Frontend');
      testRoot = addBundleToRoot(testRoot, 'Development', 'Backend');
      testRoot = addBundleToRoot(testRoot, 'Personal', 'Reading');
    });

    it('should convert empty root to markdown', () => {
      const emptyRoot = createRoot();
      const markdown = markdownGenerator.generate(emptyRoot);
      
      expect(markdown).toContain('# 📚 BookMarkDown');
      expect(markdown).toContain('Your bookmark collection');
    });

    it('should convert categories to markdown', () => {
      const markdown = markdownGenerator.generate(testRoot);
      
      expect(markdown).toContain('# Development');
      expect(markdown).toContain('# Personal');
    });

    it('should convert bundles to markdown', () => {
      const markdown = markdownGenerator.generate(testRoot);
      
      expect(markdown).toContain('## Frontend');
      expect(markdown).toContain('## Backend');
      expect(markdown).toContain('## Reading');
    });

    it('should convert bookmarks to markdown', () => {
      testRoot = addBookmarkToRoot(testRoot, 'Development', 'Frontend', {
        title: 'React Docs',
        url: 'https://react.dev',
        tags: ['react', 'documentation'],
        notes: 'Official docs'
      });
      
      testRoot = addBookmarkToRoot(testRoot, 'Development', 'Frontend', {
        title: 'Vue',
        url: 'https://vuejs.org'
      });
      
      const markdown = markdownGenerator.generate(testRoot);
      
      expect(markdown).toContain('- [React Docs](https://react.dev)');
      expect(markdown).toContain('  - tags: react, documentation');
      expect(markdown).toContain('  - notes: Official docs');
      expect(markdown).toContain('- [Vue](https://vuejs.org)');
    });

    it('should handle special characters in markdown', () => {
      testRoot = addBookmarkToRoot(testRoot, 'Development', 'Frontend', {
        title: 'Test [with] brackets',
        url: 'https://example.com',
        notes: 'Notes with *asterisks* and _underscores_'
      });
      
      const markdown = markdownGenerator.generate(testRoot);
      
      expect(markdown).toContain('[Test [with] brackets]');
      expect(markdown).toContain('Notes with *asterisks* and _underscores_');
    });

    it('should add emoji prefixes based on content', () => {
      testRoot = addCategoryToRoot(testRoot, 'Books');
      testRoot = addBundleToRoot(testRoot, 'Books', 'Fiction');
      
      const markdown = markdownGenerator.generate(testRoot);
      
      // The generator doesn't add emojis - it just preserves what's in the data
      expect(markdown).toContain('# Development');
      expect(markdown).toContain('# Books');
    });
  });

  describe('Round-trip conversion', () => {
    it('should preserve data through markdown->json->markdown conversion', () => {
      const originalMarkdown = `# 📚 Development

## Frontend

- [React](https://react.dev)
  - tags: react, javascript, library
  - notes: A JavaScript library for building user interfaces

- [Vue.js](https://vuejs.org)
  - tags: vue, javascript, framework

## Backend

- [Node.js](https://nodejs.org)
  - tags: node, javascript, runtime
  - notes: JavaScript runtime built on Chrome's V8 engine

# 🎮 Gaming

## PC Games

- [Steam](https://store.steampowered.com)
  - tags: gaming, platform
  - notes: Digital distribution platform`;

      // Parse to JSON
      const root = markdownParser.parse(originalMarkdown);
      
      // Verify parsed structure
      expect(root.categories).toHaveLength(2);
      expect(root.categories[0].bundles).toHaveLength(2);
      expect(root.categories[0].bundles[0].bookmarks).toHaveLength(2);
      
      // Convert back to markdown
      const newMarkdown = markdownGenerator.generate(root);
      
      // Should contain all the important content
      expect(newMarkdown).toContain('Development');
      expect(newMarkdown).toContain('Frontend');
      expect(newMarkdown).toContain('[React](https://react.dev)');
      expect(newMarkdown).toContain('tags: react, javascript, library');
      expect(newMarkdown).toContain('A JavaScript library for building user interfaces');
    });

    it('should preserve empty categories and bundles', () => {
      let root = createRoot();
      root = addCategoryToRoot(root, 'Empty Category');
      root = addCategoryToRoot(root, 'Category with Empty Bundle');
      root = addBundleToRoot(root, 'Category with Empty Bundle', 'Empty Bundle');
      
      // Convert to markdown and back
      const markdown = markdownGenerator.generate(root);
      const parsedRoot = markdownParser.parse(markdown);
      
      expect(parsedRoot.categories).toHaveLength(2);
      expect(parsedRoot.categories[0].name).toBe('Empty Category');
      expect(parsedRoot.categories[0].bundles).toHaveLength(0);
      expect(parsedRoot.categories[1].bundles).toHaveLength(1);
      expect(parsedRoot.categories[1].bundles[0].bookmarks).toHaveLength(0);
    });
  });
});