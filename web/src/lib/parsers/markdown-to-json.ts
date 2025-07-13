import { Root, Category, Bundle, Bookmark } from '../types/index.js';
import { RootSchema } from '../schemas/index.js';
import { generateBookmarkId } from '../utils/index.js';

export class MarkdownParser {
  parse(markdown: string): Root {
    const lines = markdown.split('\n');
    
    // Skip YAML front matter if present (for backward compatibility)
    let i = 0;
    if (lines[0] === '---') {
      const frontMatterEnd = lines.indexOf('---', 1);
      if (frontMatterEnd > 0) {
        // Skip the entire YAML front matter section
        // We no longer parse lastModified from content
        i = frontMatterEnd + 1;
      }
    }
    
    // Build categories with immutable structures
    const categories: Category[] = [];
    let currentCategoryData: {
      name: string;
      bundles: Bundle[];
      metadata?: { lastModified: string };
    } | null = null;
    let currentBundleData: {
      name: string;
      bookmarks: Bookmark[];
    } | null = null;
    let currentBookmarkData: {
      id: string;
      title: string;
      url: string;
      tags?: string[];
      notes?: string;
    } | null = null;
    
    for (; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('# ')) {
        // Save previous data before starting new category
        if (currentBookmarkData && currentBundleData) {
          currentBundleData.bookmarks = [...currentBundleData.bookmarks, this.createBookmark(currentBookmarkData)];
          currentBookmarkData = null;
        }
        if (currentBundleData && currentCategoryData) {
          currentCategoryData.bundles = [...currentCategoryData.bundles, this.createBundle(currentBundleData)];
          currentBundleData = null;
        }
        if (currentCategoryData) {
          categories.push(this.createCategory(currentCategoryData));
        }
        
        const categoryName = this.extractCategoryName(trimmedLine);
        currentCategoryData = {
          name: categoryName,
          bundles: []
        };
        
        // Skip category metadata comments if present (for backward compatibility)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.match(/<!--\s*lastModified:\s*([^-]+)\s*-->/)) {
            i++; // Skip the metadata line - we no longer parse it
          }
        }
        
      } else if (trimmedLine.startsWith('## ')) {
        // Save previous bundle data before starting new bundle
        if (currentBookmarkData && currentBundleData) {
          currentBundleData.bookmarks = [...currentBundleData.bookmarks, this.createBookmark(currentBookmarkData)];
          currentBookmarkData = null;
        }
        if (currentBundleData && currentCategoryData) {
          currentCategoryData.bundles = [...currentCategoryData.bundles, this.createBundle(currentBundleData)];
        }
        
        const bundleName = this.extractBundleName(trimmedLine);
        currentBundleData = {
          name: bundleName,
          bookmarks: []
        };
        
      } else if (trimmedLine.startsWith('- [')) {
        // Save previous bookmark before starting new one
        if (currentBookmarkData && currentBundleData) {
          currentBundleData.bookmarks = [...currentBundleData.bookmarks, this.createBookmark(currentBookmarkData)];
        }
        
        const bookmarkInfo = this.extractBookmarkInfo(trimmedLine);
        if (bookmarkInfo) {
          currentBookmarkData = {
            id: generateBookmarkId(),
            title: bookmarkInfo.title,
            url: bookmarkInfo.url
          };
        }
        
      } else if (line.startsWith('  - tags:') && currentBookmarkData) {
        // Tags for current bookmark
        const tags = this.extractTags(line);
        if (tags.length > 0) {
          currentBookmarkData.tags = tags;
        }
        
      } else if (line.startsWith('  - notes:') && currentBookmarkData) {
        // Notes for current bookmark
        const notes = this.extractNotes(line);
        if (notes) {
          currentBookmarkData.notes = notes;
        }
      }
    }
    
    // Add remaining items
    if (currentBookmarkData && currentBundleData) {
      currentBundleData.bookmarks = [...currentBundleData.bookmarks, this.createBookmark(currentBookmarkData)];
    }
    if (currentBundleData && currentCategoryData) {
      currentCategoryData.bundles = [...currentCategoryData.bundles, this.createBundle(currentBundleData)];
    }
    if (currentCategoryData) {
      categories.push(this.createCategory(currentCategoryData));
    }
    
    const root: Root = {
      version: 1,
      categories: categories,
      // Always create metadata with current timestamps
      // We no longer parse lastModified from content
      metadata: {
        lastModified: new Date().toISOString(),
        lastSynced: new Date().toISOString()
      }
    };
    
    // Validate the result
    return RootSchema.parse(root);
  }
  
  private createBookmark(data: {
    id: string;
    title: string;
    url: string;
    tags?: string[];
    notes?: string;
  }): Bookmark {
    return {
      id: data.id,
      title: data.title,
      url: data.url,
      tags: data.tags,
      notes: data.notes
    };
  }
  
  private createBundle(data: {
    name: string;
    bookmarks: Bookmark[];
  }): Bundle {
    return {
      name: data.name,
      bookmarks: data.bookmarks
    };
  }
  
  private createCategory(data: {
    name: string;
    bundles: Bundle[];
    metadata?: { lastModified: string };
  }): Category {
    return {
      name: data.name,
      bundles: data.bundles,
      metadata: data.metadata
    };
  }
  
  private extractCategoryName(line: string): string {
    const match = line.match(/^#\s+(.+)$/);
    return match ? match[1].trim() : 'Untitled Category';
  }
  
  private extractBundleName(line: string): string {
    const match = line.match(/^##\s+(.+)$/);
    return match ? match[1].trim() : 'Untitled Bundle';
  }
  
  private extractBookmarkInfo(line: string): { title: string; url: string } | null {
    const match = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      return {
        title: match[1].trim(),
        url: match[2].trim()
      };
    }
    return null;
  }
  
  private extractTags(line: string): string[] {
    const match = line.match(/^ {2}- tags:\s*(.+)$/);
    if (match) {
      return match[1].split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    return [];
  }
  
  private extractNotes(line: string): string | null {
    const match = line.match(/^ {2}- notes:\s*(.+)$/);
    return match ? match[1].trim() : null;
  }
}