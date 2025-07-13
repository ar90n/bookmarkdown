import { Root, Category, Bundle, Bookmark } from '../types/bookmark.js';

/**
 * RootEntity - Business logic for Root data structure
 * Immutable entity that encapsulates operations on bookmark data
 */
export class RootEntity {
  private constructor(private readonly data: Root) {}
  
  /**
   * Create an empty RootEntity
   */
  static create(): RootEntity {
    return new RootEntity({
      version: 1,
      categories: []
    });
  }
  
  /**
   * Create RootEntity from existing Root data
   */
  static fromRoot(root: Root): RootEntity {
    return new RootEntity(root);
  }
  
  /**
   * Get version
   */
  get version(): number {
    return this.data.version;
  }
  
  /**
   * Get categories
   */
  get categories(): readonly Category[] {
    return this.data.categories;
  }
  
  /**
   * Convert back to Root data structure
   */
  toRoot(): Root {
    return this.data;
  }
  
  // Category operations
  
  /**
   * Add a new category
   */
  addCategory(name: string): RootEntity {
    if (this.findCategory(name)) {
      throw new Error(`Category "${name}" already exists`);
    }
    
    const newCategory: Category = {
      name,
      bundles: []
    };
    
    return new RootEntity({
      ...this.data,
      categories: [...this.data.categories, newCategory]
    });
  }
  
  /**
   * Remove a category
   */
  removeCategory(name: string): RootEntity {
    const category = this.findCategory(name);
    if (!category) {
      throw new Error(`Category "${name}" not found`);
    }
    
    return new RootEntity({
      ...this.data,
      categories: this.data.categories.filter(c => c.name !== name)
    });
  }
  
  /**
   * Rename a category
   */
  renameCategory(oldName: string, newName: string): RootEntity {
    if (!this.findCategory(oldName)) {
      throw new Error(`Category "${oldName}" not found`);
    }
    
    if (oldName !== newName && this.findCategory(newName)) {
      throw new Error(`Category "${newName}" already exists`);
    }
    
    return new RootEntity({
      ...this.data,
      categories: this.data.categories.map(c => 
        c.name === oldName ? { ...c, name: newName } : c
      )
    });
  }
  
  // Bundle operations
  
  /**
   * Add a bundle to a category
   */
  addBundle(categoryName: string, bundleName: string): RootEntity {
    const category = this.findCategory(categoryName);
    if (!category) {
      throw new Error(`Category "${categoryName}" not found`);
    }
    
    if (category.bundles.some(b => b.name === bundleName)) {
      throw new Error(`Bundle "${bundleName}" already exists in category "${categoryName}"`);
    }
    
    const newBundle: Bundle = {
      name: bundleName,
      bookmarks: []
    };
    
    return new RootEntity({
      ...this.data,
      categories: this.data.categories.map(c => 
        c.name === categoryName 
          ? { ...c, bundles: [...c.bundles, newBundle] }
          : c
      )
    });
  }
  
  /**
   * Remove a bundle from a category
   */
  removeBundle(categoryName: string, bundleName: string): RootEntity {
    const category = this.findCategory(categoryName);
    if (!category) {
      throw new Error(`Category "${categoryName}" not found`);
    }
    
    const bundle = category.bundles.find(b => b.name === bundleName);
    if (!bundle) {
      throw new Error(`Bundle "${bundleName}" not found in category "${categoryName}"`);
    }
    
    return new RootEntity({
      ...this.data,
      categories: this.data.categories.map(c => 
        c.name === categoryName 
          ? { ...c, bundles: c.bundles.filter(b => b.name !== bundleName) }
          : c
      )
    });
  }
  
  // Bookmark operations
  
  /**
   * Add a bookmark to a bundle
   */
  addBookmark(categoryName: string, bundleName: string, bookmark: Omit<Bookmark, 'id'>): RootEntity {
    const category = this.findCategory(categoryName);
    if (!category) {
      throw new Error(`Category "${categoryName}" not found`);
    }
    
    const bundle = category.bundles.find(b => b.name === bundleName);
    if (!bundle) {
      throw new Error(`Bundle "${bundleName}" not found in category "${categoryName}"`);
    }
    
    // Check for duplicate URL in the same bundle
    if (bundle.bookmarks.some(b => b.url === bookmark.url)) {
      throw new Error(`Bookmark with URL "${bookmark.url}" already exists in bundle "${bundleName}"`);
    }
    
    const newBookmark: Bookmark = {
      ...bookmark,
      id: this.generateBookmarkId()
    };
    
    return new RootEntity({
      ...this.data,
      categories: this.data.categories.map(c => 
        c.name === categoryName 
          ? {
              ...c,
              bundles: c.bundles.map(b => 
                b.name === bundleName
                  ? { ...b, bookmarks: [...b.bookmarks, newBookmark] }
                  : b
              )
            }
          : c
      )
    });
  }
  
  /**
   * Remove a bookmark
   */
  removeBookmark(categoryName: string, bundleName: string, bookmarkId: string): RootEntity {
    const location = this.findBookmarkById(bookmarkId);
    if (!location) {
      throw new Error(`Bookmark with ID "${bookmarkId}" not found`);
    }
    
    return new RootEntity({
      ...this.data,
      categories: this.data.categories.map(c => 
        c.name === categoryName 
          ? {
              ...c,
              bundles: c.bundles.map(b => 
                b.name === bundleName
                  ? { ...b, bookmarks: b.bookmarks.filter(bm => bm.id !== bookmarkId) }
                  : b
              )
            }
          : c
      )
    });
  }
  
  // Search operations
  
  /**
   * Find a category by name
   */
  findCategory(name: string): Category | undefined {
    return this.data.categories.find(c => c.name === name);
  }
  
  /**
   * Find a bookmark by URL
   */
  findBookmarkByUrl(url: string): { bookmark: Bookmark; categoryName: string; bundleName: string } | null {
    for (const category of this.data.categories) {
      for (const bundle of category.bundles) {
        const bookmark = bundle.bookmarks.find(b => b.url === url);
        if (bookmark) {
          return {
            bookmark,
            categoryName: category.name,
            bundleName: bundle.name
          };
        }
      }
    }
    return null;
  }
  
  /**
   * Find a bookmark by ID
   */
  findBookmarkById(id: string): { bookmark: Bookmark; categoryName: string; bundleName: string } | null {
    for (const category of this.data.categories) {
      for (const bundle of category.bundles) {
        const bookmark = bundle.bookmarks.find(b => b.id === id);
        if (bookmark) {
          return {
            bookmark,
            categoryName: category.name,
            bundleName: bundle.name
          };
        }
      }
    }
    return null;
  }
  
  /**
   * Search bookmarks by query
   */
  searchBookmarks(query: string): Array<{ bookmark: Bookmark; categoryName: string; bundleName: string }> {
    const results: Array<{ bookmark: Bookmark; categoryName: string; bundleName: string }> = [];
    const lowerQuery = query.toLowerCase();
    
    for (const category of this.data.categories) {
      for (const bundle of category.bundles) {
        for (const bookmark of bundle.bookmarks) {
          if (
            bookmark.title.toLowerCase().includes(lowerQuery) ||
            bookmark.url.toLowerCase().includes(lowerQuery) ||
            bookmark.notes?.toLowerCase().includes(lowerQuery) ||
            bookmark.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
          ) {
            results.push({
              bookmark,
              categoryName: category.name,
              bundleName: bundle.name
            });
          }
        }
      }
    }
    
    return results;
  }
  
  // Statistics
  
  /**
   * Get statistics about the bookmarks
   */
  getStats(): { categories: number; bundles: number; bookmarks: number; tags: number } {
    let bundlesCount = 0;
    let bookmarksCount = 0;
    const uniqueTags = new Set<string>();
    
    for (const category of this.data.categories) {
      bundlesCount += category.bundles.length;
      for (const bundle of category.bundles) {
        bookmarksCount += bundle.bookmarks.length;
        for (const bookmark of bundle.bookmarks) {
          bookmark.tags?.forEach(tag => uniqueTags.add(tag));
        }
      }
    }
    
    return {
      categories: this.data.categories.length,
      bundles: bundlesCount,
      bookmarks: bookmarksCount,
      tags: uniqueTags.size
    };
  }
  
  // Validation
  
  /**
   * Validate the data structure
   */
  validate(): string[] {
    const errors: string[] = [];
    const categoryNames = new Set<string>();
    
    for (const category of this.data.categories) {
      if (!category.name || category.name.trim() === '') {
        errors.push('Category name cannot be empty');
      }
      
      if (categoryNames.has(category.name)) {
        errors.push(`Duplicate category name: "${category.name}"`);
      }
      categoryNames.add(category.name);
      
      const bundleNames = new Set<string>();
      for (const bundle of category.bundles) {
        if (!bundle.name || bundle.name.trim() === '') {
          errors.push(`Bundle name cannot be empty in category "${category.name}"`);
        }
        
        if (bundleNames.has(bundle.name)) {
          errors.push(`Duplicate bundle name: "${bundle.name}" in category "${category.name}"`);
        }
        bundleNames.add(bundle.name);
        
        const urls = new Set<string>();
        for (const bookmark of bundle.bookmarks) {
          if (!bookmark.title || bookmark.title.trim() === '') {
            errors.push(`Bookmark title cannot be empty in bundle "${bundle.name}"`);
          }
          
          if (!bookmark.url || bookmark.url.trim() === '') {
            errors.push(`Bookmark URL cannot be empty in bundle "${bundle.name}"`);
          }
          
          if (urls.has(bookmark.url)) {
            errors.push(`Duplicate URL: "${bookmark.url}" in bundle "${bundle.name}"`);
          }
          urls.add(bookmark.url);
        }
      }
    }
    
    return errors;
  }
  
  // Private helpers
  
  private generateBookmarkId(): string {
    return `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}