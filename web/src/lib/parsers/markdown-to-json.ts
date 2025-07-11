import { Root, Category, Bundle, Bookmark } from '../types/index.js';
import { RootSchema } from '../schemas/index.js';
import { generateBookmarkId } from '../utils/index.js';

export class MarkdownParser {
  parse(markdown: string): Root {
    const lines = markdown.split('\n');
    
    let rootMetadata: { lastModified?: string; lastSynced?: string } | undefined;
    
    // Check for YAML front matter
    let i = 0;
    if (lines[0] === '---') {
      const frontMatterEnd = lines.indexOf('---', 1);
      if (frontMatterEnd > 0) {
        rootMetadata = {};
        for (let j = 1; j < frontMatterEnd; j++) {
          const line = lines[j].trim();
          if (line.startsWith('lastModified:')) {
            rootMetadata.lastModified = line.substring('lastModified:'.length).trim();
          }
          // lastSynced is NOT parsed from Gist - it's local-only state managed by localStorage
          // Ignore any lastSync/lastSynced lines in the YAML for backward compatibility
        }
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
      const line = lines[i].trim();
      
      if (line.startsWith('# ')) {
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
        
        const categoryName = this.extractCategoryName(line);
        currentCategoryData = {
          name: categoryName,
          bundles: []
        };
        
        // Check for category metadata in next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const metadataMatch = nextLine.match(/<!--\s*lastModified:\s*([^-]+)\s*-->/);
          if (metadataMatch) {
            currentCategoryData.metadata = {
              lastModified: metadataMatch[1].trim()
            };
            i++; // Skip the metadata line
          }
        }
        
      } else if (line.startsWith('## ')) {
        // Save previous bundle data before starting new bundle
        if (currentBookmarkData && currentBundleData) {
          currentBundleData.bookmarks = [...currentBundleData.bookmarks, this.createBookmark(currentBookmarkData)];
          currentBookmarkData = null;
        }
        if (currentBundleData && currentCategoryData) {
          currentCategoryData.bundles = [...currentCategoryData.bundles, this.createBundle(currentBundleData)];
        }
        
        const bundleName = this.extractBundleName(line);
        currentBundleData = {
          name: bundleName,
          bookmarks: []
        };
        
      } else if (line.startsWith('- [')) {
        // Save previous bookmark before starting new one
        if (currentBookmarkData && currentBundleData) {
          currentBundleData.bookmarks = [...currentBundleData.bookmarks, this.createBookmark(currentBookmarkData)];
        }
        
        const bookmarkInfo = this.extractBookmarkInfo(line);
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
      metadata: rootMetadata && rootMetadata.lastModified ? {
        lastModified: rootMetadata.lastModified,
        lastSynced: new Date().toISOString(), // Set parse time as lastSynced
      } : {
        lastModified: new Date().toISOString(),
        lastSynced: new Date().toISOString(), // Default metadata with parse time
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