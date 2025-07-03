// BookMarkDown - New Tab Script
import { ExtensionAppContext } from './bookmark-app-context.js';

class BookMarkDownApp {
  constructor() {
    this.appContext = new ExtensionAppContext();
    this.authContext = null;
    this.bookmarkContext = null;
    this.state = {
      isAuthenticated: false,
      user: null,
      bookmarks: { version: 1, categories: [] },
      loading: false,
      error: null
    };
    
    this.init();
  }

  async init() {
    try {
      await this.appContext.initialize();
      this.authContext = this.appContext.getAuthContext();
      this.bookmarkContext = this.appContext.getBookmarkContext();
      
      this.setupContextListeners();
      this.setupEventListeners();
      this.updateUI();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupContextListeners() {
    // Listen for authentication changes
    this.authContext.onAuthChange((authState) => {
      this.state.isAuthenticated = authState.isAuthenticated;
      this.state.user = authState.user;
      this.updateUI();
    });

    // Listen for bookmark changes
    this.bookmarkContext.onStateChange((bookmarkState) => {
      this.state.bookmarks = bookmarkState.data;
      this.state.loading = bookmarkState.loading;
      this.state.error = bookmarkState.error;
      this.updateUI();
    });
  }

  updateUI() {
    this.renderAuthSection();
    this.renderBookmarks();
    this.updateStats();
    this.updateLoadingState();
    this.updateErrorState();
  }

  renderAuthSection() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    if (this.state.isAuthenticated && this.state.user) {
      authSection.innerHTML = `
        <div class="user-info">
          <img src="${this.escapeHtml(this.state.user.avatar_url)}" alt="Avatar" class="user-avatar">
          <span class="user-name">${this.escapeHtml(this.state.user.name || this.state.user.login)}</span>
          <button id="logout-btn" class="btn btn-secondary">Sign Out</button>
        </div>
      `;
      this.hideEmptyState();
    } else {
      authSection.innerHTML = `
        <div class="auth-prompt">
          <button id="login-btn" class="btn btn-primary">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>
      `;
      this.showEmptyState();
    }
  }

  setupEventListeners() {
    // Use event delegation for dynamic buttons
    document.addEventListener('click', (e) => {
      if (e.target.id === 'login-btn') {
        this.handleLogin();
      } else if (e.target.id === 'logout-btn') {
        this.handleLogout();
      } else if (e.target.id === 'add-bookmark-fab') {
        this.openAddBookmark();
      } else if (e.target.id === 'sync-btn') {
        this.syncBookmarks();
      } else if (e.target.id === 'close-add-bookmark') {
        this.closeAddBookmark();
      } else if (e.target.id === 'save-bookmark') {
        this.saveBookmark();
      } else if (e.target.id === 'cancel-bookmark') {
        this.closeAddBookmark();
      }
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    // Modal background clicks
    const addBookmarkModal = document.getElementById('add-bookmark-modal');
    if (addBookmarkModal) {
      addBookmarkModal.addEventListener('click', (e) => {
        if (e.target.id === 'add-bookmark-modal') this.closeAddBookmark();
      });
    }
  }

  async handleLogin() {
    const result = await this.authContext.loginWithOAuth();
    if (!result.success) {
      this.showError(`Login failed: ${result.error.message}`);
    }
  }

  async handleLogout() {
    const result = await this.authContext.logout();
    if (!result.success) {
      this.showError(`Logout failed: ${result.error.message}`);
    }
  }

  renderBookmarks() {
    this.renderBookmarksData(this.state.bookmarks);
  }



  renderBookmarksData(data) {
    const container = document.getElementById('bookmarks-container');
    container.innerHTML = '';

    for (const category of data.categories) {
      const categoryEl = document.createElement('div');
      categoryEl.className = 'category';
      
      categoryEl.innerHTML = `
        <div class="category-header">
          <h2 class="category-title">📂 ${this.escapeHtml(category.name)}</h2>
        </div>
        <div class="bundles"></div>
      `;

      const bundlesContainer = categoryEl.querySelector('.bundles');
      
      for (const bundle of category.bundles) {
        const bundleEl = document.createElement('div');
        bundleEl.className = 'bundle';
        
        bundleEl.innerHTML = `
          <div class="bundle-header">
            <h3 class="bundle-title">🧳 ${this.escapeHtml(bundle.name)}</h3>
          </div>
          <div class="bookmarks"></div>
        `;

        const bookmarksContainer = bundleEl.querySelector('.bookmarks');
        
        for (const bookmark of bundle.bookmarks) {
          const bookmarkEl = document.createElement('div');
          bookmarkEl.className = 'bookmark';
          
          const tagsHtml = bookmark.tags && bookmark.tags.length > 0 
            ? `<div class="bookmark-tags">${bookmark.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>`
            : '';
          
          const notesHtml = bookmark.notes 
            ? `<div class="bookmark-notes">${this.escapeHtml(bookmark.notes)}</div>`
            : '';
          
          bookmarkEl.innerHTML = `
            <a href="${this.escapeHtml(bookmark.url)}" class="bookmark-link" target="_blank" rel="noopener noreferrer">
              ${this.escapeHtml(bookmark.title)}
            </a>
            <div class="bookmark-meta">
              ${tagsHtml}
            </div>
            ${notesHtml}
          `;
          
          bookmarksContainer.appendChild(bookmarkEl);
        }
        
        bundlesContainer.appendChild(bundleEl);
      }
      
      container.appendChild(categoryEl);
    }
  }

  showEmptyState() {
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('bookmarks-container').classList.add('hidden');
  }

  hideEmptyState() {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('bookmarks-container').classList.remove('hidden');
  }

  updateStats() {
    const stats = this.bookmarkContext.getStats();
    const statsElement = document.getElementById('stats-text');
    if (statsElement) {
      statsElement.textContent = 
        `${stats.categoriesCount} categories, ${stats.bundlesCount} bundles, ${stats.bookmarksCount} bookmarks`;
    }
  }

  updateLoadingState() {
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      if (this.state.loading) {
        syncBtn.disabled = true;
        syncBtn.textContent = '🔄 Loading...';
      } else {
        syncBtn.disabled = false;
        syncBtn.textContent = '🔄 Sync';
      }
    }
  }

  updateErrorState() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      if (this.state.error) {
        errorElement.textContent = this.state.error;
        errorElement.classList.remove('hidden');
      } else {
        errorElement.classList.add('hidden');
      }
    }
  }

  showError(message) {
    this.state.error = message;
    this.updateErrorState();
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      this.state.error = null;
      this.updateErrorState();
    }, 5000);
  }


  async openAddBookmark() {
    // Pre-fill with current tab if available
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        document.getElementById('bookmark-title').value = tab.title || '';
        document.getElementById('bookmark-url').value = tab.url || '';
      }
    } catch (error) {
      console.error('Could not get current tab:', error);
    }
    
    document.getElementById('add-bookmark-modal').classList.remove('hidden');
  }

  closeAddBookmark() {
    document.getElementById('add-bookmark-modal').classList.add('hidden');
    // Clear form
    document.getElementById('bookmark-title').value = '';
    document.getElementById('bookmark-url').value = '';
    document.getElementById('bookmark-category').value = '';
    document.getElementById('bookmark-bundle').value = '';
    document.getElementById('bookmark-tags').value = '';
    document.getElementById('bookmark-notes').value = '';
  }

  async saveBookmark() {
    const title = document.getElementById('bookmark-title')?.value.trim();
    const url = document.getElementById('bookmark-url')?.value.trim();
    const category = document.getElementById('bookmark-category')?.value.trim();
    const bundle = document.getElementById('bookmark-bundle')?.value.trim();
    const tags = document.getElementById('bookmark-tags')?.value.trim();
    const notes = document.getElementById('bookmark-notes')?.value.trim();
    
    if (!title || !url || !category || !bundle) {
      this.showError('Please fill in all required fields');
      return;
    }
    
    if (!this.state.isAuthenticated) {
      this.showError('Please sign in to add bookmarks');
      return;
    }
    
    try {
      // Add category if it doesn't exist
      await this.bookmarkContext.addCategory(category);
      
      // Add bundle if it doesn't exist
      await this.bookmarkContext.addBundle(category, bundle);
      
      // Add bookmark
      const result = await this.bookmarkContext.addBookmark(category, bundle, {
        title,
        url,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        notes
      });
      
      if (result.success) {
        this.closeAddBookmark();
        
        // Auto-sync with remote
        await this.bookmarkContext.syncWithRemote();
      } else {
        this.showError(result.error.message);
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
      this.showError('Error saving bookmark');
    }
  }

  handleSearch(query) {
    if (!query) {
      // Show all bookmarks
      this.renderBookmarksData(this.state.bookmarks);
      return;
    }
    
    const results = this.bookmarkContext.searchBookmarks({ searchTerm: query });
    
    // Create a filtered data structure
    const filteredData = { version: 1, categories: [] };
    const categoryMap = new Map();
    
    results.forEach(result => {
      if (!categoryMap.has(result.categoryName)) {
        categoryMap.set(result.categoryName, {
          name: result.categoryName,
          bundles: new Map()
        });
      }
      
      const category = categoryMap.get(result.categoryName);
      if (!category.bundles.has(result.bundleName)) {
        category.bundles.set(result.bundleName, {
          name: result.bundleName,
          bookmarks: []
        });
      }
      
      category.bundles.get(result.bundleName).bookmarks.push(result.bookmark);
    });
    
    // Convert maps back to arrays
    categoryMap.forEach(category => {
      const bundles = [];
      category.bundles.forEach(bundle => bundles.push(bundle));
      filteredData.categories.push({
        name: category.name,
        bundles
      });
    });
    
    this.renderBookmarksData(filteredData);
  }

  async syncBookmarks() {
    if (!this.state.isAuthenticated) {
      this.showError('Please sign in to sync bookmarks');
      return;
    }
    
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.textContent = '🔄 Syncing...';
    }
    
    try {
      const result = await this.bookmarkContext.syncWithRemote();
      
      if (result.success) {
        if (syncBtn) {
          syncBtn.textContent = '✅ Synced';
          setTimeout(() => {
            syncBtn.textContent = '🔄 Sync';
            syncBtn.disabled = false;
          }, 2000);
        }
      } else {
        this.showError(`Sync failed: ${result.error.message}`);
        if (syncBtn) {
          syncBtn.textContent = '❌ Sync Failed';
          setTimeout(() => {
            syncBtn.textContent = '🔄 Sync';
            syncBtn.disabled = false;
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.showError('Sync failed');
      if (syncBtn) {
        syncBtn.textContent = '❌ Sync Failed';
        setTimeout(() => {
          syncBtn.textContent = '🔄 Sync';
          syncBtn.disabled = false;
        }, 2000);
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BookMarkDownApp();
});