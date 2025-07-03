// OAuth-enabled bookmark app context for Chrome extension
// This provides the Context API pattern for extension use

export class ExtensionAppContext {
  constructor() {
    this.config = {
      oauthServiceUrl: 'https://bookmarkdown-github-oauth.workers.dev',
      autoSync: true,
      syncInterval: 5
    };
    
    this.authContext = new ExtensionAuthContext(this.config);
    this.bookmarkContext = new ExtensionBookmarkContext(this.config, this.authContext);
    
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.authContext.initialize();
    await this.bookmarkContext.initialize();
    
    this.initialized = true;
  }

  getAuthContext() {
    return this.authContext;
  }

  getBookmarkContext() {
    return this.bookmarkContext;
  }

  cleanup() {
    if (this.authContext) {
      this.authContext.cleanup();
    }
    if (this.bookmarkContext) {
      this.bookmarkContext.cleanup();
    }
  }
}

export class ExtensionAuthContext {
  constructor(config) {
    this.config = config;
    this.user = null;
    this.accessToken = null;
    this.isAuthenticated = false;
    this.callbacks = new Set();
  }

  async initialize() {
    // Try to restore authentication from storage
    try {
      const result = await chrome.storage.sync.get(['githubToken', 'githubUser']);
      if (result.githubToken && result.githubUser) {
        this.accessToken = result.githubToken;
        this.user = result.githubUser;
        this.isAuthenticated = true;
        
        // Validate token is still valid
        await this.refreshAuth();
      }
    } catch (error) {
      console.error('Failed to restore auth:', error);
    }
  }

  async loginWithOAuth() {
    try {
      // Create OAuth URL with state parameter for CSRF protection
      const state = this.generateRandomString(32);
      const redirectUri = chrome.identity.getRedirectURL();
      
      const oauthUrl = new URL(`${this.config.oauthServiceUrl}/auth/github`);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('state', state);

      // Store state for validation
      await chrome.storage.local.set({ oauthState: state });

      // Launch OAuth flow
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: oauthUrl.toString(),
          interactive: true
        }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(responseUrl);
          }
        });
      });

      // Parse response
      const url = new URL(responseUrl);
      const params = new URLSearchParams(url.search);
      
      // Validate state
      const returnedState = params.get('state');
      const { oauthState } = await chrome.storage.local.get(['oauthState']);
      
      if (returnedState !== oauthState) {
        throw new Error('Invalid OAuth state - possible CSRF attack');
      }

      // Extract auth data
      const authDataStr = params.get('data');
      if (!authDataStr) {
        throw new Error('No auth data received from OAuth service');
      }

      const authData = JSON.parse(decodeURIComponent(authDataStr));
      
      // Store authentication
      this.user = authData.user;
      this.accessToken = authData.tokens.accessToken;
      this.isAuthenticated = true;

      // Persist to storage
      await chrome.storage.sync.set({
        githubToken: this.accessToken,
        githubUser: this.user
      });

      // Cleanup
      await chrome.storage.local.remove(['oauthState']);

      this.notifyCallbacks();

      return { success: true, data: this.user };
    } catch (error) {
      console.error('OAuth login failed:', error);
      return { success: false, error };
    }
  }

  async logout() {
    try {
      // Revoke token if we have one
      if (this.accessToken) {
        try {
          await fetch(`${this.config.oauthServiceUrl}/auth/revoke`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              accessToken: this.accessToken
            })
          });
        } catch (error) {
          console.warn('Failed to revoke token:', error);
        }
      }

      // Clear local state
      this.user = null;
      this.accessToken = null;
      this.isAuthenticated = false;

      // Clear storage
      await chrome.storage.sync.remove(['githubToken', 'githubUser']);

      this.notifyCallbacks();

      return { success: true, data: null };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, error };
    }
  }

  async refreshAuth() {
    if (!this.accessToken) {
      return { success: false, error: new Error('No access token') };
    }

    try {
      const response = await fetch(`${this.config.oauthServiceUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: this.accessToken
        })
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const authData = await response.json();
      
      // Update user info
      this.user = authData.user;
      this.isAuthenticated = true;

      // Update storage
      await chrome.storage.sync.set({
        githubUser: this.user
      });

      this.notifyCallbacks();

      return { success: true, data: this.user };
    } catch (error) {
      console.error('Auth refresh failed:', error);
      
      // Token is invalid, clear auth
      await this.logout();
      
      return { success: false, error };
    }
  }

  onAuthChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback({
          isAuthenticated: this.isAuthenticated,
          user: this.user
        });
      } catch (error) {
        console.error('Auth callback error:', error);
      }
    });
  }

  generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  cleanup() {
    this.callbacks.clear();
  }
}

export class ExtensionBookmarkContext {
  constructor(config, authContext) {
    this.config = config;
    this.authContext = authContext;
    this.rootData = { version: 1, categories: [] };
    this.loading = false;
    this.error = null;
    this.dirty = false;
    this.callbacks = new Set();
    this.gistId = null;
  }

  async initialize() {
    // Load gist ID from storage
    try {
      const result = await chrome.storage.sync.get(['gistId']);
      this.gistId = result.gistId || null;
    } catch (error) {
      console.error('Failed to load gist ID:', error);
    }

    // Load bookmarks from local storage first
    await this.loadFromStorage();

    // Listen for auth changes
    this.authContext.onAuthChange(async (authState) => {
      if (authState.isAuthenticated) {
        // Auto-load from remote when authenticated
        await this.loadFromRemote();
      } else {
        // Clear bookmarks when logged out
        this.rootData = { version: 1, categories: [] };
        this.notifyCallbacks();
      }
    });
  }

  async loadFromStorage() {
    try {
      const result = await chrome.storage.sync.get(['bookmarkData']);
      if (result.bookmarkData) {
        this.rootData = result.bookmarkData;
        this.notifyCallbacks();
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
      this.setError('Failed to load bookmarks from local storage');
    }
  }

  async saveToStorage() {
    try {
      await chrome.storage.sync.set({ 
        bookmarkData: this.rootData,
        gistId: this.gistId 
      });
    } catch (error) {
      console.error('Failed to save to storage:', error);
      this.setError('Failed to save bookmarks to local storage');
    }
  }

  async loadFromRemote() {
    if (!this.authContext.isAuthenticated) {
      return { success: false, error: new Error('Not authenticated') };
    }

    return this.withAsyncOperation(async () => {
      if (!this.gistId) {
        // No gist ID, create initial data structure
        this.rootData = { version: 1, categories: [] };
        await this.saveToStorage();
        return { success: true, data: this.rootData };
      }

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.authContext.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load bookmarks from GitHub');
      }

      const gist = await response.json();
      const markdownContent = gist.files['bookmarks.md']?.content || '';
      
      // Parse markdown (simplified parser)
      this.rootData = this.parseMarkdown(markdownContent);
      await this.saveToStorage();
      
      return { success: true, data: this.rootData };
    });
  }

  async saveToRemote() {
    if (!this.authContext.isAuthenticated) {
      return { success: false, error: new Error('Not authenticated') };
    }

    return this.withAsyncOperation(async () => {
      const markdownContent = this.generateMarkdown(this.rootData);
      const method = this.gistId ? 'PATCH' : 'POST';
      const url = this.gistId 
        ? `https://api.github.com/gists/${this.gistId}`
        : 'https://api.github.com/gists';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `token ${this.authContext.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'BookMarkDown - Bookmark Collection',
          files: {
            'bookmarks.md': {
              content: markdownContent
            }
          },
          public: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save bookmarks to GitHub');
      }

      const result = await response.json();
      if (!this.gistId) {
        this.gistId = result.id;
        await this.saveToStorage();
      }

      this.dirty = false;
      return { success: true, data: result.id };
    });
  }

  async syncWithRemote() {
    const saveResult = await this.saveToRemote();
    if (saveResult.success) {
      return await this.loadFromRemote();
    }
    return saveResult;
  }

  async addCategory(name) {
    return this.withAsyncOperation(async () => {
      if (this.rootData.categories.find(c => c.name === name)) {
        throw new Error('Category already exists');
      }

      this.rootData = {
        ...this.rootData,
        categories: [...this.rootData.categories, { name, bundles: [] }]
      };

      await this.saveToStorage();
      return { success: true, data: this.rootData };
    });
  }

  async addBundle(categoryName, bundleName) {
    return this.withAsyncOperation(async () => {
      const category = this.rootData.categories.find(c => c.name === categoryName);
      if (!category) {
        throw new Error('Category not found');
      }

      if (category.bundles.find(b => b.name === bundleName)) {
        throw new Error('Bundle already exists');
      }

      const updatedCategories = this.rootData.categories.map(c => 
        c.name === categoryName 
          ? { ...c, bundles: [...c.bundles, { name: bundleName, bookmarks: [] }] }
          : c
      );

      this.rootData = { ...this.rootData, categories: updatedCategories };
      await this.saveToStorage();
      return { success: true, data: this.rootData };
    });
  }

  async addBookmark(categoryName, bundleName, bookmark) {
    return this.withAsyncOperation(async () => {
      const category = this.rootData.categories.find(c => c.name === categoryName);
      if (!category) {
        throw new Error('Category not found');
      }

      const bundle = category.bundles.find(b => b.name === bundleName);
      if (!bundle) {
        throw new Error('Bundle not found');
      }

      const newBookmark = {
        id: Date.now() + Math.random(),
        title: bookmark.title,
        url: bookmark.url,
        tags: bookmark.tags || [],
        notes: bookmark.notes || ''
      };

      const updatedCategories = this.rootData.categories.map(c => 
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
      );

      this.rootData = { ...this.rootData, categories: updatedCategories };
      await this.saveToStorage();
      return { success: true, data: this.rootData };
    });
  }

  searchBookmarks(filter) {
    const results = [];
    const searchTerm = filter.searchTerm?.toLowerCase() || '';
    
    for (const category of this.rootData.categories) {
      for (const bundle of category.bundles) {
        for (const bookmark of bundle.bookmarks) {
          const matches = 
            !searchTerm ||
            bookmark.title.toLowerCase().includes(searchTerm) ||
            bookmark.url.toLowerCase().includes(searchTerm) ||
            (bookmark.notes && bookmark.notes.toLowerCase().includes(searchTerm)) ||
            (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
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

  async withAsyncOperation(operation) {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await operation();
      this.setDirty(true);
      this.notifyCallbacks();
      return result;
    } catch (error) {
      this.setError(error.message);
      return { success: false, error };
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    this.loading = loading;
    this.notifyCallbacks();
  }

  setError(error) {
    this.error = error;
    this.notifyCallbacks();
  }

  setDirty(dirty) {
    this.dirty = dirty;
    this.notifyCallbacks();
  }

  onStateChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks() {
    const state = {
      data: this.rootData,
      loading: this.loading,
      error: this.error,
      dirty: this.dirty,
      isAuthenticated: this.authContext.isAuthenticated,
      user: this.authContext.user
    };

    this.callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Bookmark callback error:', error);
      }
    });
  }

  cleanup() {
    this.callbacks.clear();
  }

  // Simplified markdown parser
  parseMarkdown(markdown) {
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
}