import { Root } from '../types/bookmark.js';

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
}