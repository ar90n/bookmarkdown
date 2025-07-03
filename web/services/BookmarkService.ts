// Import types from the bundled library
declare const BookMarkDown: any; // This will be available from the bundled library

export interface BookmarkData {
  version: 1;
  categories: any[];
}

export class BookmarkService {
  private service: any;
  private gistId?: string;
  private token?: string;

  constructor() {
    // Initialize with the browser-compatible service
    // In production, this will use the bundled library
    this.service = this.createLocalService();
  }

  async init() {
    // Load settings from localStorage
    const settings = this.loadSettings();
    this.gistId = settings.gistId;
    this.token = settings.token;

    // Load bookmarks from localStorage
    await this.loadFromLocal();

    // If we have credentials, try to sync with Gist
    if (this.gistId && this.token) {
      try {
        await this.syncWithGist();
      } catch (error) {
        console.error('Failed to sync with Gist:', error);
      }
    }
  }

  private createLocalService() {
    // For now, create a simple in-memory service
    // In production, this will use the actual BookMarkDown library
    let data: BookmarkData = {
      version: 1,
      categories: []
    };

    return {
      getRoot: () => data,
      setRoot: (newData: BookmarkData) => { data = newData; },
      addCategory: (name: string) => {
        if (!data.categories.find(c => c.name === name)) {
          data.categories.push({ name, bundles: [] });
          return { success: true, data };
        }
        return { success: false, error: new Error('Category already exists') };
      },
      addBundle: (categoryName: string, bundleName: string) => {
        const category = data.categories.find(c => c.name === categoryName);
        if (category && !category.bundles.find((b: any) => b.name === bundleName)) {
          category.bundles.push({ name: bundleName, bookmarks: [] });
          return { success: true, data };
        }
        return { success: false, error: new Error('Bundle already exists or category not found') };
      },
      addBookmark: (categoryName: string, bundleName: string, bookmark: any) => {
        const category = data.categories.find(c => c.name === categoryName);
        if (category) {
          const bundle = category.bundles.find((b: any) => b.name === bundleName);
          if (bundle) {
            bundle.bookmarks.push({
              id: Date.now().toString(),
              ...bookmark
            });
            return { success: true, data };
          }
        }
        return { success: false, error: new Error('Category or bundle not found') };
      },
      searchBookmarks: (filter: any) => {
        const results: any[] = [];
        const searchTerm = filter.searchTerm?.toLowerCase() || '';
        
        data.categories.forEach(category => {
          category.bundles.forEach((bundle: any) => {
            bundle.bookmarks.forEach((bookmark: any) => {
              if (!searchTerm || 
                  bookmark.title.toLowerCase().includes(searchTerm) ||
                  bookmark.url.toLowerCase().includes(searchTerm)) {
                results.push({
                  bookmark,
                  categoryName: category.name,
                  bundleName: bundle.name
                });
              }
            });
          });
        });
        
        return results;
      },
      getStats: () => {
        let bundlesCount = 0;
        let bookmarksCount = 0;
        
        data.categories.forEach(category => {
          bundlesCount += category.bundles.length;
          category.bundles.forEach((bundle: any) => {
            bookmarksCount += bundle.bookmarks.length;
          });
        });
        
        return {
          categoriesCount: data.categories.length,
          bundlesCount,
          bookmarksCount,
          tagsCount: 0
        };
      }
    };
  }

  getService() {
    return this.service;
  }

  async loadFromLocal() {
    const stored = localStorage.getItem('bookmarkData');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.service.setRoot(data);
      } catch (error) {
        console.error('Failed to parse stored bookmarks:', error);
      }
    }
  }

  async saveToLocal() {
    const data = this.service.getRoot();
    localStorage.setItem('bookmarkData', JSON.stringify(data));
  }

  async syncWithGist() {
    if (!this.gistId || !this.token) {
      throw new Error('GitHub credentials not configured');
    }

    // For now, just log
    console.log('Syncing with Gist:', this.gistId);
    // In production, this will use the actual sync implementation
  }

  private loadSettings() {
    const stored = localStorage.getItem('bookmarkSettings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  saveSettings(settings: { gistId?: string; token?: string }) {
    this.gistId = settings.gistId;
    this.token = settings.token;
    localStorage.setItem('bookmarkSettings', JSON.stringify(settings));
  }
}