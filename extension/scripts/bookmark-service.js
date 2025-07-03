// This file will be replaced by the bundled library in production
// For now, it provides the interface that the extension scripts expect

export class ExtensionBookmarkService {
  constructor() {
    this.rootData = null;
  }

  async loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['bookmarkData'], (result) => {
        if (result.bookmarkData) {
          this.rootData = result.bookmarkData;
          resolve(true);
        } else {
          this.rootData = {
            version: 1,
            categories: []
          };
          resolve(false);
        }
      });
    });
  }

  async saveToStorage() {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ bookmarkData: this.rootData }, () => {
        resolve(true);
      });
    });
  }

  async loadFromGist(gistId, token) {
    if (!gistId || !token) {
      throw new Error('Gist ID and token required');
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gist');
      }

      const gist = await response.json();
      const markdownContent = gist.files['bookmarks.md']?.content || '';
      
      // Parse markdown to data structure
      this.rootData = this.parseMarkdown(markdownContent);
      await this.saveToStorage();
      
      return this.rootData;
    } catch (error) {
      console.error('Error loading from gist:', error);
      throw error;
    }
  }

  async saveToGist(gistId, token, description) {
    if (!token) {
      throw new Error('Token required');
    }

    const markdownContent = this.generateMarkdown(this.rootData);
    const method = gistId ? 'PATCH' : 'POST';
    const url = gistId 
      ? `https://api.github.com/gists/${gistId}`
      : 'https://api.github.com/gists';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description || 'BookMarkDown - Bookmark Collection',
          files: {
            'bookmarks.md': {
              content: markdownContent
            }
          },
          public: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save gist');
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error saving to gist:', error);
      throw error;
    }
  }

  parseMarkdown(markdown) {
    // Simplified parser - in production, use the real parser
    const lines = markdown.split('\n');
    const categories = [];
    
    let currentCategory = null;
    let currentBundle = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# ')) {
        if (currentCategory && currentBundle) {
          currentCategory.bundles.push(currentBundle);
        }
        if (currentCategory) {
          categories.push(currentCategory);
        }
        
        currentCategory = {
          name: trimmed.replace(/^#\s*/, '').replace(/^📂\s*/, ''),
          bundles: []
        };
        currentBundle = null;
        
      } else if (trimmed.startsWith('## ')) {
        if (currentBundle && currentCategory) {
          currentCategory.bundles.push(currentBundle);
        }
        
        currentBundle = {
          name: trimmed.replace(/^##\s*/, '').replace(/^🧳\s*/, ''),
          bookmarks: []
        };
        
      } else if (trimmed.startsWith('- [')) {
        const match = trimmed.match(/^-\s*\[(.+?)\]\((.+?)\)$/);
        if (match && currentBundle) {
          currentBundle.bookmarks.push({
            id: Date.now() + Math.random(),
            title: match[1],
            url: match[2],
            tags: [],
            notes: ''
          });
        }
      }
    }
    
    if (currentBundle && currentCategory) {
      currentCategory.bundles.push(currentBundle);
    }
    if (currentCategory) {
      categories.push(currentCategory);
    }
    
    return { version: 1, categories };
  }

  generateMarkdown(data) {
    let markdown = '';
    
    for (const category of data.categories) {
      markdown += `# 📂 ${category.name}\n\n`;
      
      for (const bundle of category.bundles) {
        markdown += `## 🧳 ${bundle.name}\n\n`;
        
        for (const bookmark of bundle.bookmarks) {
          markdown += `- [${bookmark.title}](${bookmark.url})\n`;
          
          if (bookmark.tags && bookmark.tags.length > 0) {
            markdown += `  - tags: ${bookmark.tags.join(', ')}\n`;
          }
          
          if (bookmark.notes) {
            markdown += `  - notes: ${bookmark.notes}\n`;
          }
          
          markdown += '\n';
        }
      }
    }
    
    return markdown;
  }

  getData() {
    return this.rootData;
  }

  addCategory(name) {
    if (!this.rootData.categories.find(c => c.name === name)) {
      this.rootData.categories.push({
        name,
        bundles: []
      });
      this.saveToStorage();
      return true;
    }
    return false;
  }

  addBundle(categoryName, bundleName) {
    const category = this.rootData.categories.find(c => c.name === categoryName);
    if (category && !category.bundles.find(b => b.name === bundleName)) {
      category.bundles.push({
        name: bundleName,
        bookmarks: []
      });
      this.saveToStorage();
      return true;
    }
    return false;
  }

  addBookmark(categoryName, bundleName, bookmark) {
    const category = this.rootData.categories.find(c => c.name === categoryName);
    if (category) {
      const bundle = category.bundles.find(b => b.name === bundleName);
      if (bundle) {
        bundle.bookmarks.push({
          id: Date.now() + Math.random(),
          title: bookmark.title,
          url: bookmark.url,
          tags: bookmark.tags || [],
          notes: bookmark.notes || ''
        });
        this.saveToStorage();
        return true;
      }
    }
    return false;
  }

  searchBookmarks(searchTerm) {
    const results = [];
    const term = searchTerm.toLowerCase();
    
    for (const category of this.rootData.categories) {
      for (const bundle of category.bundles) {
        for (const bookmark of bundle.bookmarks) {
          const matches = 
            bookmark.title.toLowerCase().includes(term) ||
            bookmark.url.toLowerCase().includes(term) ||
            (bookmark.notes && bookmark.notes.toLowerCase().includes(term)) ||
            (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(term)));
            
          if (matches) {
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

  getStats() {
    let bundlesCount = 0;
    let bookmarksCount = 0;
    const allTags = new Set();
    
    for (const category of this.rootData.categories) {
      bundlesCount += category.bundles.length;
      
      for (const bundle of category.bundles) {
        bookmarksCount += bundle.bookmarks.length;
        
        for (const bookmark of bundle.bookmarks) {
          if (bookmark.tags) {
            bookmark.tags.forEach(tag => allTags.add(tag.toLowerCase()));
          }
        }
      }
    }
    
    return {
      categoriesCount: this.rootData.categories.length,
      bundlesCount,
      bookmarksCount,
      tagsCount: allTags.size
    };
  }
}