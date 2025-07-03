import { BookmarkService } from '../services/BookmarkService';

export class BookmarksPage {
  constructor(private bookmarkService: BookmarkService) {}

  render(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'page bookmarks-page';
    
    const service = this.bookmarkService.getService();
    const data = service.getRoot();
    const stats = service.getStats();
    
    page.innerHTML = `
      <div class="page-header">
        <h1>My Bookmarks</h1>
        <div class="page-actions">
          <button class="btn btn-primary" id="add-bookmark-btn">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Bookmark
          </button>
        </div>
      </div>

      <div class="search-bar">
        <input type="text" 
               id="search-input" 
               class="search-input" 
               placeholder="Search bookmarks..."
               autocomplete="off">
      </div>

      <div class="stats-bar">
        <span class="stat">
          <strong>${stats.categoriesCount}</strong> categories
        </span>
        <span class="stat">
          <strong>${stats.bundlesCount}</strong> bundles
        </span>
        <span class="stat">
          <strong>${stats.bookmarksCount}</strong> bookmarks
        </span>
      </div>

      <div id="bookmarks-container" class="bookmarks-container">
        ${this.renderBookmarks(data)}
      </div>

      ${this.renderAddBookmarkModal()}
    `;

    this.attachEventListeners(page);
    
    return page;
  }

  private renderBookmarks(data: any): string {
    if (!data.categories || data.categories.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <h2>No bookmarks yet</h2>
          <p>Start by adding your first bookmark!</p>
          <button class="btn btn-primary" onclick="document.getElementById('add-bookmark-btn').click()">
            Add First Bookmark
          </button>
        </div>
      `;
    }

    return data.categories.map((category: any) => `
      <div class="category" data-category="${category.name}">
        <div class="category-header">
          <h2 class="category-title">
            <span class="category-icon">📂</span>
            ${category.name}
          </h2>
          <button class="btn btn-sm btn-ghost add-bundle-btn" data-category="${category.name}">
            Add Bundle
          </button>
        </div>
        <div class="bundles">
          ${category.bundles.map((bundle: any) => this.renderBundle(category.name, bundle)).join('')}
        </div>
      </div>
    `).join('');
  }

  private renderBundle(categoryName: string, bundle: any): string {
    return `
      <div class="bundle" data-bundle="${bundle.name}">
        <div class="bundle-header">
          <h3 class="bundle-title">
            <span class="bundle-icon">🧳</span>
            ${bundle.name}
          </h3>
          <button class="btn btn-sm btn-ghost add-to-bundle-btn" 
                  data-category="${categoryName}" 
                  data-bundle="${bundle.name}">
            Add Bookmark
          </button>
        </div>
        <div class="bookmarks">
          ${bundle.bookmarks.map((bookmark: any) => this.renderBookmark(bookmark)).join('')}
        </div>
      </div>
    `;
  }

  private renderBookmark(bookmark: any): string {
    const tags = bookmark.tags && bookmark.tags.length > 0
      ? `<div class="bookmark-tags">
           ${bookmark.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
         </div>`
      : '';

    const notes = bookmark.notes
      ? `<div class="bookmark-notes">${bookmark.notes}</div>`
      : '';

    return `
      <div class="bookmark" data-id="${bookmark.id}">
        <a href="${bookmark.url}" target="_blank" rel="noopener noreferrer" class="bookmark-link">
          ${bookmark.title}
        </a>
        <div class="bookmark-meta">
          ${tags}
        </div>
        ${notes}
        <div class="bookmark-actions">
          <button class="btn-icon btn-sm edit-bookmark-btn" data-id="${bookmark.id}">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon btn-sm delete-bookmark-btn" data-id="${bookmark.id}">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private renderAddBookmarkModal(): string {
    return `
      <div id="add-bookmark-modal" class="modal hidden">
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Bookmark</h2>
            <button class="btn-close" id="close-modal">×</button>
          </div>
          <form id="add-bookmark-form" class="modal-body">
            <div class="form-group">
              <label for="bookmark-title">Title</label>
              <input type="text" id="bookmark-title" required>
            </div>
            <div class="form-group">
              <label for="bookmark-url">URL</label>
              <input type="url" id="bookmark-url" required>
            </div>
            <div class="form-group">
              <label for="bookmark-category">Category</label>
              <input type="text" id="bookmark-category" list="categories-list" required>
              <datalist id="categories-list"></datalist>
            </div>
            <div class="form-group">
              <label for="bookmark-bundle">Bundle</label>
              <input type="text" id="bookmark-bundle" list="bundles-list" required>
              <datalist id="bundles-list"></datalist>
            </div>
            <div class="form-group">
              <label for="bookmark-tags">Tags (comma-separated)</label>
              <input type="text" id="bookmark-tags">
            </div>
            <div class="form-group">
              <label for="bookmark-notes">Notes</label>
              <textarea id="bookmark-notes" rows="3"></textarea>
            </div>
          </form>
          <div class="modal-footer">
            <button type="submit" form="add-bookmark-form" class="btn btn-primary">Save Bookmark</button>
            <button type="button" class="btn btn-secondary" id="cancel-modal">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(page: HTMLElement) {
    // Search functionality
    const searchInput = page.querySelector('#search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.handleSearch(query);
      });
    }

    // Add bookmark button
    const addBtn = page.querySelector('#add-bookmark-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddBookmarkModal());
    }

    // Modal controls
    const modal = page.querySelector('#add-bookmark-modal');
    const closeBtn = page.querySelector('#close-modal');
    const cancelBtn = page.querySelector('#cancel-modal');
    const form = page.querySelector('#add-bookmark-form') as HTMLFormElement;

    if (modal && closeBtn && cancelBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
      cancelBtn.addEventListener('click', () => this.hideModal());
      
      // Close on backdrop click
      const backdrop = modal.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this.hideModal());
      }
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddBookmark();
      });
    }

    // Category input change - update bundles list
    const categoryInput = page.querySelector('#bookmark-category') as HTMLInputElement;
    if (categoryInput) {
      categoryInput.addEventListener('input', () => this.updateBundlesList());
    }
  }

  private handleSearch(query: string) {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;

    const service = this.bookmarkService.getService();
    
    if (!query) {
      // Show all bookmarks
      const data = service.getRoot();
      container.innerHTML = this.renderBookmarks(data);
    } else {
      // Show filtered results
      const results = service.searchBookmarks({ searchTerm: query });
      
      if (results.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h2>No results found</h2>
            <p>Try a different search term</p>
          </div>
        `;
      } else {
        // Group results by category and bundle
        const grouped = this.groupSearchResults(results);
        container.innerHTML = this.renderBookmarks(grouped);
      }
    }
  }

  private groupSearchResults(results: any[]): any {
    const grouped: any = { version: 1, categories: [] };
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

    categoryMap.forEach(category => {
      const bundles: any[] = [];
      category.bundles.forEach((bundle: any) => bundles.push(bundle));
      grouped.categories.push({
        name: category.name,
        bundles
      });
    });

    return grouped;
  }

  private showAddBookmarkModal() {
    const modal = document.getElementById('add-bookmark-modal');
    if (modal) {
      modal.classList.remove('hidden');
      this.populateCategories();
    }
  }

  private hideModal() {
    const modal = document.getElementById('add-bookmark-modal');
    const form = document.getElementById('add-bookmark-form') as HTMLFormElement;
    
    if (modal) {
      modal.classList.add('hidden');
    }
    
    if (form) {
      form.reset();
    }
  }

  private populateCategories() {
    const service = this.bookmarkService.getService();
    const data = service.getRoot();
    const datalist = document.getElementById('categories-list');
    
    if (datalist) {
      datalist.innerHTML = data.categories
        .map((cat: any) => `<option value="${cat.name}">`)
        .join('');
    }
  }

  private updateBundlesList() {
    const categoryInput = document.getElementById('bookmark-category') as HTMLInputElement;
    const bundlesList = document.getElementById('bundles-list');
    
    if (!categoryInput || !bundlesList) return;
    
    const service = this.bookmarkService.getService();
    const data = service.getRoot();
    const category = data.categories.find((cat: any) => cat.name === categoryInput.value);
    
    if (category) {
      bundlesList.innerHTML = category.bundles
        .map((bundle: any) => `<option value="${bundle.name}">`)
        .join('');
    } else {
      bundlesList.innerHTML = '';
    }
  }

  private async handleAddBookmark() {
    const form = document.getElementById('add-bookmark-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const title = (formData.get('bookmark-title') as string)?.trim();
    const url = (formData.get('bookmark-url') as string)?.trim();
    const category = (formData.get('bookmark-category') as string)?.trim();
    const bundle = (formData.get('bookmark-bundle') as string)?.trim();
    const tags = (formData.get('bookmark-tags') as string)?.trim();
    const notes = (formData.get('bookmark-notes') as string)?.trim();

    const service = this.bookmarkService.getService();
    
    // Add category if it doesn't exist
    service.addCategory(category);
    
    // Add bundle if it doesn't exist
    service.addBundle(category, bundle);
    
    // Add bookmark
    const result = service.addBookmark(category, bundle, {
      title,
      url,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      notes
    });

    if (result.success) {
      // Save to local storage
      await this.bookmarkService.saveToLocal();
      
      // Refresh the page
      const container = document.getElementById('bookmarks-container');
      if (container) {
        container.innerHTML = this.renderBookmarks(service.getRoot());
      }
      
      // Update stats
      this.updateStats();
      
      // Close modal
      this.hideModal();
    } else {
      alert('Failed to add bookmark: ' + result.error.message);
    }
  }

  private updateStats() {
    const service = this.bookmarkService.getService();
    const stats = service.getStats();
    const statsBar = document.querySelector('.stats-bar');
    
    if (statsBar) {
      statsBar.innerHTML = `
        <span class="stat">
          <strong>${stats.categoriesCount}</strong> categories
        </span>
        <span class="stat">
          <strong>${stats.bundlesCount}</strong> bundles
        </span>
        <span class="stat">
          <strong>${stats.bookmarksCount}</strong> bookmarks
        </span>
      `;
    }
  }
}