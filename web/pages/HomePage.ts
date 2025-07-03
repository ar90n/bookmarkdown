export class HomePage {
  render(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'page home-page';
    
    page.innerHTML = `
      <div class="hero">
        <h1 class="hero-title">
          <span class="hero-icon">📚</span>
          BookMarkDown
        </h1>
        <p class="hero-subtitle">
          Simple, portable bookmark management using Markdown and GitHub Gist
        </p>
        <div class="hero-actions">
          <a href="/bookmarks" class="btn btn-primary btn-lg">
            Get Started
          </a>
          <a href="https://github.com/yourusername/bookmarkdown" target="_blank" rel="noopener" class="btn btn-secondary btn-lg">
            View on GitHub
          </a>
        </div>
      </div>

      <div class="features">
        <div class="feature">
          <div class="feature-icon">📝</div>
          <h3 class="feature-title">Human-Readable</h3>
          <p class="feature-description">
            Store your bookmarks in Markdown format that's easy to read and edit, even without special tools.
          </p>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🔓</div>
          <h3 class="feature-title">No Lock-In</h3>
          <p class="feature-description">
            Your data lives in GitHub Gist. Access it anywhere, anytime, with or without BookMarkDown.
          </p>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🚀</div>
          <h3 class="feature-title">Simple & Fast</h3>
          <p class="feature-description">
            Minimal complexity, maximum functionality. Organize bookmarks in categories and bundles effortlessly.
          </p>
        </div>
      </div>

      <div class="how-it-works">
        <h2>How It Works</h2>
        <ol class="steps">
          <li class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <h4>Connect GitHub</h4>
              <p>Login with your GitHub token to enable Gist storage</p>
            </div>
          </li>
          <li class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <h4>Organize Bookmarks</h4>
              <p>Create categories and bundles to organize your links</p>
            </div>
          </li>
          <li class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <h4>Sync Everywhere</h4>
              <p>Access your bookmarks from any device via GitHub Gist</p>
            </div>
          </li>
        </ol>
      </div>

      <div class="cta">
        <h2>Ready to organize your bookmarks?</h2>
        <p>Start using BookMarkDown today - it's free and open source!</p>
        <a href="/bookmarks" class="btn btn-primary btn-lg">
          Start Now
        </a>
      </div>
    `;
    
    return page;
  }
}