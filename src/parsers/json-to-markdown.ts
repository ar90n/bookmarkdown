import { Root, Category, Bundle, Bookmark } from '../schemas/index.js';

export class MarkdownGenerator {
  generate(root: Root): string {
    const lines: string[] = [];
    
    // Add header comment for empty roots
    if (root.categories.length === 0) {
      lines.push('# 📚 BookMarkDown');
      lines.push('');
      lines.push('Your bookmark collection is empty. Start adding bookmarks!');
      return lines.join('\n');
    }
    
    for (const category of root.categories) {
      this.addCategory(lines, category);
      
      for (const bundle of category.bundles) {
        this.addBundle(lines, bundle);
        
        for (const bookmark of bundle.bookmarks) {
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
    lines.push(`# 📂 ${category.name}`);
    lines.push('');
  }
  
  private addBundle(lines: string[], bundle: Bundle): void {
    lines.push(`## 🧳 ${bundle.name}`);
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