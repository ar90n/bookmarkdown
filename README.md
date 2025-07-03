# BookMarkDown

A simple and portable bookmark management service using GitHub Gist as data storage with Markdown format. Inspired by Toby, BookMarkDown prioritizes human-readable data, avoiding vendor lock-in, and maintaining simplicity.

## ✨ Key Features

- **Secure OAuth Authentication**: GitHub OAuth flow via Cloudflare Worker - no more manual token management
- **Human-readable**: Stores data in Markdown format for easy reading and editing
- **No vendor lock-in**: Uses GitHub Gist as an open platform for data storage
- **React Web App**: Modern SPA with Tailwind CSS for beautiful UI
- **Context API**: Centralized state management for consistent data handling
- **Hierarchical organization**: Categories → Bundles → Bookmarks structure
- **TypeScript support**: Full type safety with Zod schema validation
- **Dual UI**: Both Chrome extension and web application
- **Functional architecture**: Immutable data structures with functional core + imperative shell
- **Test-driven development**: Comprehensive tests with Vitest
- **Multi-target builds**: Library, extension, and web builds with Vite
- **Real-time sync**: Automatic synchronization with GitHub Gist

## 🧱 Data Structure

```
Root
└── Category (name)
    └── Bundle (name)
        └── Bookmark (id, title, url, tags, notes)
```

## 📄 Markdown Format

Bookmarks are stored in GitHub Gist using this human-readable format:

```markdown
# 📂 Development Tools

## 🧳 Terminal

- [iTerm2](https://iterm2.com/)
  - tags: mac, terminal
  - notes: Split pane is convenient

- [Oh My Zsh](https://ohmyz.sh/)
  - tags: zsh, shell, productivity
  - notes: Framework for managing zsh configuration

## 🧳 Editors

- [VSCode](https://code.visualstudio.com/)
  - tags: ide, editor
  - notes: GitHub Copilot support
```

## 🚀 Quick Start

### Option 1: Web Application (Recommended)

Visit the live demo at [GitHub Pages](https://yourusername.github.io/bookmarkdown) or run locally:

```bash
# Install dependencies
npm install

# Set up environment variables (optional for local dev)
cp web/.env.example web/.env.local

# Start development server
npm run dev:web
```

The app will open at `http://localhost:3000` with secure OAuth authentication.

### Option 2: Chrome Extension

1. Download the latest release from [Releases](https://github.com/yourusername/bookmarkdown/releases)
2. Extract `bookmarkdown-extension.zip`
3. Load as unpacked extension in Chrome
4. Sign in with GitHub OAuth when prompted

### Option 3: Library Usage

```bash
npm install bookmarkdown
```

#### Using with Context API (Recommended)

```javascript
import { createAppContext } from 'bookmarkdown';

// Create app context with OAuth configuration
const context = createAppContext({
  oauthServiceUrl: 'https://your-oauth-service.workers.dev',
  autoSync: true,
  syncInterval: 5 // minutes
});

// Access bookmark operations
const bookmarkContext = context.getBookmarkContext();

// Add category
const result = await bookmarkContext.addCategory('Development Tools');
if (result.success) {
  console.log('Category added!');
}

// Add bookmark
await bookmarkContext.addBookmark('Development Tools', 'Terminal', {
  title: 'iTerm2',
  url: 'https://iterm2.com/',
  tags: ['mac', 'terminal'],
  notes: 'Split pane is convenient'
});

// Search bookmarks
const bookmarks = bookmarkContext.searchBookmarks({ searchTerm: 'terminal' });
console.log('Found:', bookmarks);

// Sync with GitHub
await bookmarkContext.syncWithRemote();
```

#### Direct Service Usage

```javascript
import { createBookmarkService, createGitHubSyncShell } from 'bookmarkdown';

// For environments with direct token access
const syncShell = createGitHubSyncShell({
  accessToken: 'github-token-from-oauth',
  gistId: 'optional-existing-gist-id'
});
const service = createBookmarkService(syncShell);

// Use service methods directly...
```

#### Browser Usage

```html
<script src="https://unpkg.com/bookmarkdown/dist/browser/bookmarkdown.umd.js"></script>
<script>
  const service = BookMarkDown.createBookmarkAppForBrowser();
  // Use the service...
</script>
```

## 🎯 Chrome Extension

The extension provides a new tab page for bookmark management:

1. **Installation**: Load the `extension` folder as an unpacked extension in Chrome
2. **Setup**: Configure your GitHub access token in settings
3. **Usage**: Use the new tab page to view and manage bookmarks
4. **Sync**: Sync bookmarks with your GitHub Gist

### Extension Features

- **New Tab Override**: Beautiful bookmark dashboard
- **Search**: Real-time bookmark search
- **Add Bookmarks**: Quick bookmark addition
- **Sync**: Two-way synchronization with GitHub Gist
- **Settings**: GitHub token and Gist configuration

## 📦 Project Structure

```
├── src/
│   ├── core/           # Functional core - pure business logic
│   ├── context/        # Context API - centralized state management
│   ├── adapters/       # Service layer bridging core and shell  
│   ├── shell/          # Imperative shell - I/O operations
│   ├── types/          # Immutable type definitions
│   ├── parsers/        # Markdown ↔ JSON conversion
│   ├── schemas/        # Zod validation schemas
│   └── utils/          # Utility functions
├── web/                # React SPA with Tailwind CSS
│   ├── src/            # React components and pages
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Route pages
│   │   └── contexts/   # React context providers
│   ├── styles/         # Global CSS and Tailwind
│   └── public/         # Static assets
├── github-oauth/       # Cloudflare Worker OAuth service
│   ├── src/            # OAuth service implementation
│   ├── wrangler.toml   # Cloudflare configuration
│   └── package.json    # OAuth service dependencies
├── extension/          # Chrome extension
│   ├── scripts/        # Extension JavaScript
│   ├── styles/         # Extension CSS
│   └── manifest.json   # Extension manifest V3
├── test/               # Test suite (Vitest)
├── dist/               # Compiled outputs
│   ├── browser/        # Browser library builds
│   ├── extension/      # Extension build
│   └── web/            # SPA build
└── .github/workflows/  # CI/CD pipeline
```

## 🔧 Development

### Available Scripts

#### Development
- `npm run dev` - Development with file watching
- `npm run dev:web` - Start SPA development server
- `npm test` - Run test suite (66 tests)
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run E2E tests (Playwright)

#### Building
- `npm run build` - Compile TypeScript
- `npm run build:lib` - Build browser library (UMD/ES)
- `npm run build:extension` - Build Chrome extension
- `npm run build:web` - Build SPA for deployment
- `npm run build:all` - Build all targets

#### Code Quality
- `npm run lint` - Lint TypeScript code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking

### Running the Tests

```bash
# Run all tests (66 tests)
npm test

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🔐 OAuth Setup

BookMarkDown uses secure OAuth authentication instead of manual token management.

### For Users

Simply click "Sign in with GitHub" - no token creation needed!

### For Developers - Setting up GitHub OAuth Service

1. **Create GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Fill in:
     - Application name: `BookMarkDown`
     - Homepage URL: Your app URL
     - Authorization callback URL: `https://your-oauth-service.workers.dev/auth/callback`
   - Save Client ID and Client Secret

2. **Deploy Cloudflare Worker**
   ```bash
   cd github-oauth
   npm install
   
   # Configure secrets (one-time setup)
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   
   # Update wrangler.toml with your allowed origins
   # Deploy
   npm run deploy
   ```

3. **Configure Web App**
   ```bash
   # Set OAuth service URL in environment
   echo "VITE_OAUTH_SERVICE_URL=https://your-oauth-service.workers.dev" > web/.env.local
   ```

### Security Benefits

- ✅ No manual token creation or management
- ✅ Client Secret never exposed to browsers
- ✅ CSRF protection with state parameter
- ✅ Tokens can be revoked anytime
- ✅ Standard OAuth 2.0 flow

## 📋 API Reference

### Context API (Recommended)

The Context API provides centralized state management with authentication and bookmark operations.

#### AppContext
```typescript
const context = createAppContext(config);

// Access sub-contexts
const bookmarkContext = context.getBookmarkContext();
const authContext = context.getAuthContext();

// Initialize and cleanup
await context.initialize();
context.cleanup();
```

#### BookmarkContext
- `addCategory(name): Promise<Result<Root>>` - Add a new category
- `addBundle(categoryName, bundleName): Promise<Result<Root>>` - Add a bundle
- `addBookmark(categoryName, bundleName, bookmark): Promise<Result<Root>>` - Add bookmark
- `updateBookmark(...): Promise<Result<Root>>` - Update bookmark
- `removeBookmark(...): Promise<Result<Root>>` - Remove bookmark
- `searchBookmarks(filter): BookmarkSearchResult[]` - Search bookmarks
- `getStats(): BookmarkStats` - Get statistics
- `syncWithRemote(): Promise<Result<...>>` - Sync with GitHub
- `loadFromRemote(): Promise<Result<Root>>` - Load from GitHub
- `saveToRemote(): Promise<Result<...>>` - Save to GitHub

#### AuthContext
- `loginWithOAuth(): Promise<Result<GitHubUser>>` - OAuth login flow
- `logout(): Promise<Result<void>>` - Sign out
- `refreshAuth(): Promise<Result<GitHubUser>>` - Refresh authentication
- `isAuthenticated: boolean` - Check auth status
- `user: GitHubUser | null` - Current user info

### Direct Service API

For advanced use cases or non-browser environments:

#### BookmarkService
- `addCategory(name): Result<Root>` - Add a new category
- `addBundle(categoryName, bundleName): Result<Root>` - Add a bundle
- `addBookmark(categoryName, bundleName, bookmark): Result<Root>` - Add bookmark
- `searchBookmarks(filter): BookmarkSearchResult[]` - Search bookmarks
- `loadFromMarkdown(markdown): Result<Root>` - Parse from Markdown
- `exportToMarkdown(): Result<string>` - Export to Markdown

### Data Types

```typescript
// Immutable data structures with readonly properties
interface Bookmark {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly tags?: readonly string[];
  readonly notes?: string;
}

interface Bundle {
  readonly name: string;
  readonly bookmarks: readonly Bookmark[];
}

interface Category {
  readonly name: string;
  readonly bundles: readonly Bundle[];
}

interface Root {
  readonly version: number;
  readonly categories: readonly Category[];
}

// Functional error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Search and filter types
interface BookmarkFilter {
  searchTerm?: string;
  tags?: string[];
  categoryName?: string;
  bundleName?: string;
}

interface BookmarkSearchResult {
  bookmark: Bookmark;
  categoryName: string;
  bundleName: string;
}
```

## 🔄 Sync Strategy

BookMarkDown uses a **last-write-wins** approach for conflict resolution:

- Local changes are always saved to the Gist
- No complex merge strategies to maintain simplicity
- Markdown format allows manual conflict resolution if needed
- Data corruption is unlikely due to the simple structure

## 🎨 Design Philosophy

### Core Principles
1. **Human-readable first**: All data should be readable without special tools
2. **No vendor lock-in**: Data stored in open, accessible formats
3. **Simplicity over features**: Prefer simple solutions over complex ones
4. **Progressive enhancement**: Start simple, add features as needed

### Functional Architecture
5. **Immutable data**: All data structures use readonly properties
6. **Pure functions**: Core business logic has no side effects
7. **Functional core + imperative shell**: Separate pure logic from I/O operations
8. **Result type**: Functional error handling instead of exceptions
9. **Test-driven development**: t-wada style TDD with comprehensive coverage

## 📄 License

Apache License 2.0 - See [LICENSE](LICENSE) file for details.

## 🛡️ Security

BookMarkDown prioritizes security through:

- **OAuth 2.0 Authentication**: No manual token handling
- **Server-side Secrets**: Client secrets never exposed to browsers
- **CSRF Protection**: State parameter validation
- **Secure Storage**: Tokens encrypted in localStorage
- **Token Revocation**: Users can revoke access anytime
- **HTTPS Only**: All communication encrypted

## 🤝 Contributing

Contributions are welcome! Please ensure any changes maintain:

- **Functional architecture**: Pure functions in core, I/O in shell
- **Test coverage**: Add tests for all new functionality  
- **Type safety**: Use strict TypeScript with readonly types
- **Code quality**: Pass linting and formatting checks
- **Documentation**: Update README and add JSDoc comments

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed implementation guidelines.

## 🔗 Related Projects

- [Toby](https://www.gettoby.com/) - Original inspiration
- [GitHub Gist](https://gist.github.com/) - Data storage platform