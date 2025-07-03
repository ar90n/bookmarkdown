import { Router } from './Router';
import { BookmarkService } from '../services/BookmarkService';
import { AuthService } from '../services/AuthService';
import { Header } from '../components/Header';
import { HomePage } from '../pages/HomePage';
import { BookmarksPage } from '../pages/BookmarksPage';
import { SettingsPage } from '../pages/SettingsPage';

export class Application {
  private router: Router;
  private bookmarkService: BookmarkService;
  private authService: AuthService;

  constructor() {
    this.bookmarkService = new BookmarkService();
    this.authService = new AuthService();
    this.router = new Router();
  }

  async init() {
    // Remove loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }

    // Initialize services
    await this.authService.init();
    await this.bookmarkService.init();

    // Render header
    const header = new Header(this.authService, this.bookmarkService);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = '';
      app.appendChild(header.render());
      
      // Add main content area
      const main = document.createElement('main');
      main.id = 'main-content';
      main.className = 'main-content';
      app.appendChild(main);
    }

    // Setup routes
    this.setupRoutes();

    // Start router
    this.router.init();
  }

  private setupRoutes() {
    // Home page
    this.router.addRoute('/', () => {
      const page = new HomePage();
      this.renderPage(page.render());
    });

    // Bookmarks page
    this.router.addRoute('/bookmarks', () => {
      const page = new BookmarksPage(this.bookmarkService);
      this.renderPage(page.render());
    });

    // Settings page
    this.router.addRoute('/settings', () => {
      const page = new SettingsPage(this.authService, this.bookmarkService);
      this.renderPage(page.render());
    });

    // 404 handler
    this.router.setNotFoundHandler(() => {
      this.renderPage(this.render404());
    });
  }

  private renderPage(content: HTMLElement) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = '';
      mainContent.appendChild(content);
    }
  }

  private render404(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'page-404';
    container.innerHTML = `
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/" class="btn btn-primary">Go Home</a>
    `;
    return container;
  }
}