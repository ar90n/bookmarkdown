export class Router {
  private routes: Map<string, () => void> = new Map();
  private notFoundHandler?: () => void;

  addRoute(path: string, handler: () => void) {
    this.routes.set(path, handler);
  }

  setNotFoundHandler(handler: () => void) {
    this.notFoundHandler = handler;
  }

  init() {
    // Handle initial route
    this.handleRoute();

    // Listen for route changes
    window.addEventListener('popstate', () => this.handleRoute());

    // Handle link clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const path = link.href.substring(window.location.origin.length);
        this.navigate(path);
      }
    });
  }

  navigate(path: string) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  private handleRoute() {
    const path = window.location.pathname;
    const handler = this.routes.get(path);
    
    if (handler) {
      handler();
    } else if (this.notFoundHandler) {
      this.notFoundHandler();
    }
  }
}