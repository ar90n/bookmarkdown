import { AuthService } from '../services/AuthService';
import { BookmarkService } from '../services/BookmarkService';

export class Header {
  constructor(
    private authService: AuthService,
    private bookmarkService: BookmarkService
  ) {}

  render(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'header';
    
    header.innerHTML = `
      <div class="header-container">
        <div class="header-left">
          <a href="/" class="logo">
            <span class="logo-icon">📚</span>
            <span class="logo-text">BookMarkDown</span>
          </a>
          <nav class="nav">
            <a href="/" class="nav-link">Home</a>
            <a href="/bookmarks" class="nav-link">Bookmarks</a>
            <a href="/settings" class="nav-link">Settings</a>
          </nav>
        </div>
        <div class="header-right">
          <button id="sync-btn" class="btn btn-icon" title="Sync with GitHub">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
          <div class="user-menu">
            ${this.renderUserMenu()}
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(header);

    return header;
  }

  private renderUserMenu(): string {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getUser();
      return `
        <button class="user-menu-button" id="user-menu-btn">
          <img src="${user?.avatar_url || '/assets/default-avatar.svg'}" alt="User" class="user-avatar">
          <span class="user-name">${user?.login || 'User'}</span>
        </button>
        <div class="user-dropdown hidden" id="user-dropdown">
          <a href="/settings" class="dropdown-item">Settings</a>
          <button class="dropdown-item" id="logout-btn">Logout</button>
        </div>
      `;
    } else {
      return `
        <a href="/settings" class="btn btn-primary">Login with GitHub</a>
      `;
    }
  }

  private attachEventListeners(header: HTMLElement) {
    // Sync button
    const syncBtn = header.querySelector('#sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSync());
    }

    // User menu
    const userMenuBtn = header.querySelector('#user-menu-btn');
    const userDropdown = header.querySelector('#user-dropdown');
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target as Node) && !userDropdown.contains(e.target as Node)) {
          userDropdown.classList.add('hidden');
        }
      });
    }

    // Logout button
    const logoutBtn = header.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  private async handleSync() {
    const syncBtn = document.querySelector('#sync-btn') as HTMLButtonElement;
    if (!syncBtn) return;

    syncBtn.disabled = true;
    syncBtn.classList.add('loading');

    try {
      await this.bookmarkService.syncWithGist();
      this.showNotification('Bookmarks synced successfully!', 'success');
    } catch (error) {
      this.showNotification('Failed to sync bookmarks', 'error');
      console.error('Sync error:', error);
    } finally {
      syncBtn.disabled = false;
      syncBtn.classList.remove('loading');
    }
  }

  private handleLogout() {
    this.authService.logout();
    window.location.href = '/';
  }

  private showNotification(message: string, type: 'success' | 'error') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}