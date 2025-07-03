import { AuthService } from '../services/AuthService';
import { BookmarkService } from '../services/BookmarkService';

export class SettingsPage {
  constructor(
    private authService: AuthService,
    private bookmarkService: BookmarkService
  ) {}

  render(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'page settings-page';
    
    const isAuthenticated = this.authService.isAuthenticated();
    const user = this.authService.getUser();
    
    page.innerHTML = `
      <div class="page-header">
        <h1>Settings</h1>
      </div>

      <div class="settings-sections">
        ${this.renderAuthSection(isAuthenticated, user)}
        ${this.renderSyncSection()}
        ${this.renderDataSection()}
        ${this.renderAboutSection()}
      </div>
    `;

    this.attachEventListeners(page);
    
    return page;
  }

  private renderAuthSection(isAuthenticated: boolean, user: any): string {
    if (isAuthenticated) {
      return `
        <section class="settings-section">
          <h2>GitHub Account</h2>
          <div class="user-info">
            <img src="${user?.avatar_url || '/assets/default-avatar.svg'}" alt="${user?.login}" class="user-avatar-large">
            <div class="user-details">
              <h3>${user?.name || user?.login || 'Unknown User'}</h3>
              <p class="text-muted">@${user?.login || 'unknown'}</p>
              <button class="btn btn-secondary btn-sm" id="logout-btn">Logout</button>
            </div>
          </div>
        </section>
      `;
    } else {
      return `
        <section class="settings-section">
          <h2>GitHub Authentication</h2>
          <p class="section-description">
            Connect your GitHub account to sync bookmarks with GitHub Gist.
          </p>
          <form id="auth-form" class="auth-form">
            <div class="form-group">
              <label for="github-token">Personal Access Token</label>
              <input type="password" id="github-token" placeholder="ghp_..." required>
              <small class="form-help">
                Generate a token with 'gist' scope at 
                <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" rel="noopener">
                  GitHub Settings
                </a>
              </small>
            </div>
            <button type="submit" class="btn btn-primary">Connect GitHub</button>
          </form>
        </section>
      `;
    }
  }

  private renderSyncSection(): string {
    const settings = JSON.parse(localStorage.getItem('bookmarkSettings') || '{}');
    
    return `
      <section class="settings-section">
        <h2>Sync Settings</h2>
        <form id="sync-form" class="sync-form">
          <div class="form-group">
            <label for="gist-id">Gist ID (optional)</label>
            <input type="text" id="gist-id" value="${settings.gistId || ''}" placeholder="Leave empty to create new">
            <small class="form-help">
              Existing gist ID to sync with. Leave empty to create a new gist.
            </small>
          </div>
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </form>
      </section>
    `;
  }

  private renderDataSection(): string {
    return `
      <section class="settings-section">
        <h2>Data Management</h2>
        <div class="data-actions">
          <div class="action-group">
            <h3>Export Data</h3>
            <p class="text-muted">Download your bookmarks as a Markdown file.</p>
            <button class="btn btn-secondary" id="export-btn">Export Bookmarks</button>
          </div>
          <div class="action-group">
            <h3>Import Data</h3>
            <p class="text-muted">Import bookmarks from a Markdown file.</p>
            <input type="file" id="import-file" accept=".md,.markdown" class="hidden">
            <button class="btn btn-secondary" id="import-btn">Import Bookmarks</button>
          </div>
          <div class="action-group danger">
            <h3>Clear Data</h3>
            <p class="text-muted">Remove all local bookmarks. This cannot be undone.</p>
            <button class="btn btn-danger" id="clear-btn">Clear All Data</button>
          </div>
        </div>
      </section>
    `;
  }

  private renderAboutSection(): string {
    return `
      <section class="settings-section">
        <h2>About</h2>
        <div class="about-content">
          <p>
            <strong>BookMarkDown</strong> v1.0.0<br>
            A simple and portable bookmark management service.
          </p>
          <p class="text-muted">
            Your bookmarks are stored in Markdown format on GitHub Gist, 
            ensuring you always have access to your data.
          </p>
          <div class="about-links">
            <a href="https://github.com/yourusername/bookmarkdown" target="_blank" rel="noopener">
              GitHub Repository
            </a>
            <a href="https://github.com/yourusername/bookmarkdown/issues" target="_blank" rel="noopener">
              Report an Issue
            </a>
          </div>
        </div>
      </section>
    `;
  }

  private attachEventListeners(page: HTMLElement) {
    // Auth form
    const authForm = page.querySelector('#auth-form') as HTMLFormElement;
    if (authForm) {
      authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAuth();
      });
    }

    // Logout button
    const logoutBtn = page.querySelector('#logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Sync form
    const syncForm = page.querySelector('#sync-form') as HTMLFormElement;
    if (syncForm) {
      syncForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSyncSettings();
      });
    }

    // Export button
    const exportBtn = page.querySelector('#export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }

    // Import button
    const importBtn = page.querySelector('#import-btn');
    const importFile = page.querySelector('#import-file') as HTMLInputElement;
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', () => this.handleImport());
    }

    // Clear data button
    const clearBtn = page.querySelector('#clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClearData());
    }
  }

  private async handleAuth() {
    const tokenInput = document.getElementById('github-token') as HTMLInputElement;
    if (!tokenInput) return;

    const token = tokenInput.value.trim();
    if (!token) return;

    const button = document.querySelector('#auth-form button[type="submit"]') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.textContent = 'Connecting...';
    }

    const success = await this.authService.login(token);
    
    if (success) {
      // Reload the page to show authenticated state
      window.location.reload();
    } else {
      alert('Invalid token. Please check and try again.');
      if (button) {
        button.disabled = false;
        button.textContent = 'Connect GitHub';
      }
    }
  }

  private handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      window.location.reload();
    }
  }

  private handleSyncSettings() {
    const gistIdInput = document.getElementById('gist-id') as HTMLInputElement;
    if (!gistIdInput) return;

    const settings = {
      gistId: gistIdInput.value.trim(),
      token: this.authService.getToken()
    };

    this.bookmarkService.saveSettings(settings);
    this.showNotification('Settings saved successfully!', 'success');
  }

  private handleExport() {
    // TODO: Implement actual markdown generation
    const service = this.bookmarkService.getService();
    const data = service.getRoot();
    
    // Simple JSON export for now
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Bookmarks exported successfully!', 'success');
  }

  private async handleImport() {
    const fileInput = document.getElementById('import-file') as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        // TODO: Implement actual markdown parsing
        // For now, assume JSON
        const data = JSON.parse(content);
        
        const service = this.bookmarkService.getService();
        service.setRoot(data);
        await this.bookmarkService.saveToLocal();
        
        this.showNotification('Bookmarks imported successfully!', 'success');
        setTimeout(() => {
          window.location.href = '/bookmarks';
        }, 1500);
      } catch (error) {
        console.error('Import error:', error);
        this.showNotification('Failed to import bookmarks', 'error');
      }
    };
    
    reader.readAsText(file);
  }

  private handleClearData() {
    if (confirm('Are you sure you want to clear all bookmarks? This cannot be undone.')) {
      const service = this.bookmarkService.getService();
      service.setRoot({ version: 1, categories: [] });
      this.bookmarkService.saveToLocal();
      
      this.showNotification('All data cleared', 'success');
      setTimeout(() => {
        window.location.href = '/bookmarks';
      }, 1500);
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
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