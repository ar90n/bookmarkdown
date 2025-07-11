import { Root, Category, Bundle, Bookmark } from '../types/index.js';

export class MarkdownGenerator {
  generate(root: Root): string {
    const lines: string[] = [];
    
    // Add metadata as YAML front matter if present
    if (root.metadata) {
      lines.push('---');
      lines.push(`lastModified: ${root.metadata.lastModified}`);
      // lastSynced is NOT stored in Gist - it's local-only state managed by localStorage
      lines.push('---');
      lines.push('');
    }
    
    // Add header comment for empty roots
    if (root.categories.length === 0) {
      lines.push('# 📚 BookMarkDown');
      lines.push('');
      lines.push('Your bookmark collection is empty. Start adding bookmarks!');
      return lines.join('\n');
    }
    
    // Filter out deleted categories
    const activeCategories = root.categories.filter(category => !category.metadata?.isDeleted);
    
    for (const category of activeCategories) {
      this.addCategory(lines, category);
      
      // Filter out deleted bundles
      const activeBundles = category.bundles.filter(bundle => !bundle.metadata?.isDeleted);
      
      for (const bundle of activeBundles) {
        this.addBundle(lines, bundle);
        
        for (const bookmark of bundle.bookmarks) {
          // Skip deleted bookmarks
          if (bookmark.metadata?.isDeleted) {
            continue;
          }
          this.addBookmark(lines, bookmark);
        }
        
        // Add empty line after each bundle
        lines.push('');
      }
    }
    
    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    
    return lines.join('\n');
  }
  
  private addCategory(lines: string[], category: Category): void {
    lines.push(`# ${category.name}`);
    // Add category metadata as HTML comment if present
    if (category.metadata) {
      lines.push(`<!-- lastModified: ${category.metadata.lastModified} -->`);
    }
    lines.push('');
  }
  
  private addBundle(lines: string[], bundle: Bundle): void {
    lines.push(`## ${bundle.name}`);
    lines.push('');
  }
  
  private addBookmark(lines: string[], bookmark: Bookmark): void {
    // Add the main bookmark line
    lines.push(`- [${bookmark.title}](${bookmark.url})`);
    
    // Add tags if present
    if (bookmark.tags && bookmark.tags.length > 0) {
      const tagsString = bookmark.tags.join(', ');
      lines.push(`  - tags: ${tagsString}`);
    }
    
    // Add notes if present
    if (bookmark.notes && bookmark.notes.trim()) {
      lines.push(`  - notes: ${bookmark.notes}`);
    }
    
    // Add empty line after bookmark
    lines.push('');
  }
}