import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '../../src/lib/parsers/markdown-to-json.js';
import { MarkdownGenerator } from '../../src/lib/parsers/json-to-markdown.js';
import { Root } from '../../src/lib/types/index.js';

describe('Remove lastModified from content', () => {
  const parser = new MarkdownParser();
  const generator = new MarkdownGenerator();
  
  const testRoot: Root = {
    version: 1,
    categories: [
      {
        name: 'Development',
        bundles: [
          {
            name: 'TypeScript',
            bookmarks: [
              {
                id: 'ts-1',
                title: 'TypeScript Docs',
                url: 'https://www.typescriptlang.org/',
                tags: ['docs', 'typescript']
              }
            ]
          }
        ]
      }
    ]
  };
  
  describe('MarkdownGenerator', () => {
    it('should not output lastModified in YAML front matter', () => {
      const markdown = generator.generate(testRoot);
      
      expect(markdown).not.toContain('lastModified:');
      expect(markdown).toContain('# Development');
      expect(markdown).toContain('## TypeScript');
      expect(markdown).toContain('[TypeScript Docs](https://www.typescriptlang.org/)');
    });
    
    it('should not output category metadata comments', () => {
      const rootWithMetadata: Root = {
        ...testRoot,
        categories: [
          {
            ...testRoot.categories[0],
            metadata: { lastModified: '2024-01-15T10:00:00Z' }
          }
        ]
      };
      
      const markdown = generator.generate(rootWithMetadata);
      
      expect(markdown).not.toContain('<!-- lastModified:');
      expect(markdown).not.toContain('2024-01-15T10:00:00Z');
    });
    
    it('should not include root metadata in output', () => {
      const rootWithMetadata: Root = {
        ...testRoot,
        metadata: {
          lastModified: '2024-01-15T10:00:00Z',
          lastSynced: '2024-01-15T11:00:00Z'
        }
      };
      
      const markdown = generator.generate(rootWithMetadata);
      
      expect(markdown).not.toContain('lastModified:');
      expect(markdown).not.toContain('lastSynced:');
      expect(markdown).not.toMatch(/^---/);
    });
  });
  
  describe('MarkdownParser', () => {
    it('should ignore lastModified in YAML front matter', () => {
      const markdown = `---
lastModified: 2024-01-15T10:00:00Z
---

# Development

## TypeScript

- [TypeScript Docs](https://www.typescriptlang.org/)
  - tags: docs, typescript`;
      
      const root = parser.parse(markdown);
      
      // Parser should still create metadata but with current timestamp
      expect(root.metadata?.lastModified).toBeDefined();
      expect(root.metadata?.lastSynced).toBeDefined();
      // Should not use the value from YAML
      expect(root.metadata?.lastModified).not.toBe('2024-01-15T10:00:00Z');
    });
    
    it('should ignore category metadata comments', () => {
      const markdown = `# Development
<!-- lastModified: 2024-01-15T10:00:00Z -->

## TypeScript

- [TypeScript Docs](https://www.typescriptlang.org/)`;
      
      const root = parser.parse(markdown);
      
      expect(root.categories[0].metadata).toBeUndefined();
      expect(root.categories[0].name).toBe('Development');
    });
    
    it('should parse content without any metadata', () => {
      const markdown = `# Development

## TypeScript

- [TypeScript Docs](https://www.typescriptlang.org/)
  - tags: docs, typescript`;
      
      const root = parser.parse(markdown);
      
      expect(root.categories).toHaveLength(1);
      expect(root.categories[0].name).toBe('Development');
      expect(root.categories[0].bundles[0].bookmarks[0].title).toBe('TypeScript Docs');
      // Parser should create default metadata
      expect(root.metadata?.lastModified).toBeDefined();
      expect(root.metadata?.lastSynced).toBeDefined();
    });
  });
  
  describe('Round-trip without metadata', () => {
    it('should maintain content structure without metadata', () => {
      const markdown1 = generator.generate(testRoot);
      const parsed = parser.parse(markdown1);
      const markdown2 = generator.generate(parsed);
      
      // Both should not contain lastModified
      expect(markdown1).not.toContain('lastModified:');
      expect(markdown2).not.toContain('lastModified:');
      
      // The generated markdown should be the same
      expect(markdown1).toBe(markdown2);
      
      // Check the parsed structure matches (ignoring generated IDs)
      expect(parsed.categories).toHaveLength(1);
      expect(parsed.categories[0].name).toBe('Development');
      expect(parsed.categories[0].bundles[0].name).toBe('TypeScript');
      expect(parsed.categories[0].bundles[0].bookmarks[0].title).toBe('TypeScript Docs');
      expect(parsed.categories[0].bundles[0].bookmarks[0].url).toBe('https://www.typescriptlang.org/');
      expect(parsed.categories[0].bundles[0].bookmarks[0].tags).toEqual(['docs', 'typescript']);
    });
  });
});