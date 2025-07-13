import { Root, Category } from '../types/bookmark.js';

export class RootEntity {
  private constructor(private readonly data: Root) {}
  
  static create(): RootEntity {
    return new RootEntity({
      version: 1,
      categories: []
    });
  }
  
  static fromRoot(root: Root): RootEntity {
    return new RootEntity(root);
  }
  
  get version(): number {
    return this.data.version;
  }
  
  get categories() {
    return this.data.categories;
  }
  
  toRoot(): Root {
    return this.data;
  }
  
  /**
   * Add a new category
   * Creates a new instance with the added category
   */
  addCategory(name: string): RootEntity {
    if (this.hasCategory(name)) {
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
   * Remove a category by name
   * Creates a new instance without the specified category
   */
  removeCategory(name: string): RootEntity {
    const categoryIndex = this.findCategoryIndex(name);
    
    if (categoryIndex === -1) {
      throw new Error(`Category "${name}" not found`);
    }
    
    const newCategories = this.data.categories.filter((_, index) => index !== categoryIndex);
    
    return new RootEntity({
      ...this.data,
      categories: newCategories
    });
  }
  
  /**
   * Rename a category
   * Creates a new instance with the renamed category
   */
  renameCategory(oldName: string, newName: string): RootEntity {
    // Allow renaming to same name
    if (oldName === newName) {
      return this;
    }
    
    const categoryIndex = this.findCategoryIndex(oldName);
    
    if (categoryIndex === -1) {
      throw new Error(`Category "${oldName}" not found`);
    }
    
    if (this.hasCategory(newName)) {
      throw new Error(`Category "${newName}" already exists`);
    }
    
    const newCategories = [...this.data.categories];
    newCategories[categoryIndex] = {
      ...newCategories[categoryIndex],
      name: newName
    };
    
    return new RootEntity({
      ...this.data,
      categories: newCategories
    });
  }
  
  /**
   * Check if a category exists
   */
  private hasCategory(name: string): boolean {
    return this.data.categories.some(cat => cat.name === name);
  }
  
  /**
   * Find category index by name
   */
  private findCategoryIndex(name: string): number {
    return this.data.categories.findIndex(cat => cat.name === name);
  }
}