import { Root, Category, Bundle, Bookmark, RootSchema } from '../schemas/index.js';
import { generateBookmarkId } from '../utils/index.js';

export class MarkdownParser {
  parse(markdown: string): Root {
    const lines = markdown.split('\n');
    const categories: Category[] = [];
    
    let currentCategory: Category | null = null;
    let currentBundle: Bundle | null = null;
    let currentBookmark: Bookmark | null = null;
    let rootMetadata: { lastModified?: string; lastSync?: string } | undefined;
    
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
          } else if (line.startsWith('lastSync:')) {
            rootMetadata.lastSync = line.substring('lastSync:'.length).trim();
          }
        }
        i = frontMatterEnd + 1;
      }
    }
    
    for (; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('# ')) {
        // Category header
        if (currentCategory && currentBundle) {
          currentCategory.bundles.push(currentBundle);
        }
        if (currentCategory) {
          categories.push(currentCategory);
        }
        
        const categoryName = this.extractCategoryName(line);
        currentCategory = {
          name: categoryName,
          bundles: []
        };
        currentBundle = null;
        currentBookmark = null;
        
        // Check for category metadata in next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const metadataMatch = nextLine.match(/<!--\s*lastModified:\s*([^-]+)\s*-->/);
          if (metadataMatch) {
            currentCategory.metadata = {
              lastModified: metadataMatch[1].trim()
            };
            i++; // Skip the metadata line
          }
        }
        
      } else if (line.startsWith('## ')) {
        // Bundle header
        if (currentBundle && currentCategory) {
          currentCategory.bundles.push(currentBundle);
        }
        
        const bundleName = this.extractBundleName(line);
        currentBundle = {
          name: bundleName,
          bookmarks: []
        };
        currentBookmark = null;
        
      } else if (line.startsWith('- [')) {
        // Bookmark entry
        if (currentBookmark && currentBundle) {
          currentBundle.bookmarks.push(currentBookmark);
        }
        
        const bookmarkInfo = this.extractBookmarkInfo(line);
        if (bookmarkInfo) {
          currentBookmark = {
            id: generateBookmarkId(),
            title: bookmarkInfo.title,
            url: bookmarkInfo.url,
            tags: undefined,
            notes: undefined
          };
        }
        
      } else if (line.startsWith('  - tags:')) {
        // Tags for current bookmark
        if (currentBookmark) {
          const tags = this.extractTags(line);
          currentBookmark.tags = tags.length > 0 ? tags : undefined;
        }
        
      } else if (line.startsWith('  - notes:')) {
        // Notes for current bookmark
        if (currentBookmark) {
          const notes = this.extractNotes(line);
          currentBookmark.notes = notes || undefined;
        }
      }
    }
    
    // Add remaining items
    if (currentBookmark && currentBundle) {
      currentBundle.bookmarks.push(currentBookmark);
    }
    if (currentBundle && currentCategory) {
      currentCategory.bundles.push(currentBundle);
    }
    if (currentCategory) {
      categories.push(currentCategory);
    }
    
    const root: Root = {
      version: 1,
      categories: categories,
      metadata: rootMetadata
    };
    
    // Validate the result
    return RootSchema.parse(root);
  }
  
  private extractCategoryName(line: string): string {
    // Remove # and emoji, trim whitespace
    return line.replace(/^#\s*/, '').replace(/^📂\s*/, '').trim();
  }
  
  private extractBundleName(line: string): string {
    // Remove ## and emoji, trim whitespace
    return line.replace(/^##\s*/, '').replace(/^🧳\s*/, '').trim();
  }
  
  private extractBookmarkInfo(line: string): { title: string; url: string } | null {
    // Parse: - [Title](URL)
    const match = line.match(/^-\s*\[(.+?)\]\((.+?)\)$/);
    if (match) {
      return {
        title: match[1].trim(),
        url: match[2].trim()
      };
    }
    return null;
  }
  
  private extractTags(line: string): string[] {
    // Parse: - tags: tag1, tag2, tag3
    const match = line.match(/^ {2}- tags:\s*(.+)$/);
    if (match) {
      return match[1].split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    return [];
  }
  
  private extractNotes(line: string): string | null {
    // Parse: - notes: Some notes
    const match = line.match(/^ {2}- notes:\s*(.+)$/);
    if (match) {
      return match[1].trim();
    }
    return null;
  }
}