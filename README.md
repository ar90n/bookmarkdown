# BookMarkDown

A simple and portable bookmark management service using GitHub Gist as data storage with Markdown format. Inspired by Toby, BookMarkDown prioritizes human-readable data, avoiding vendor lock-in, and maintaining simplicity.

## ✨ Key Features

- **Secure OAuth Authentication**: GitHub OAuth flow via Cloudflare Worker - no more manual token management
- **Human-readable**: Stores data in Markdown format for easy reading and editing
- **No vendor lock-in**: Uses GitHub Gist as an open platform for data storage
- **React Web App**: Modern SPA with Tailwind CSS for beautiful UI
- **Drag & Drop Support**: Intuitive bookmark and bundle organization with react-dnd
- **Mobile Responsive**: Fully responsive design with automatic drag & drop disable on mobile
- **Context API**: Centralized state management for consistent data handling
- **Hierarchical organization**: Categories → Bundles → Bookmarks structure
- **TypeScript support**: Full type safety with Zod schema validation
- **Chrome extension**: Future support for browser extension (in development)
- **Test-driven development**: Comprehensive unit and E2E tests with Vitest and Playwright
- **Modern build system**: Built with Vite for fast development and optimized production
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

### Web Application

Visit the live application at [https://bookmarkdown.ar90n.net](https://bookmarkdown.ar90n.net) or run locally:

```bash
# Install dependencies
npm install

# Set up environment variables (optional for local dev)
cp web/.env.example web/.env.local
# Edit web/.env.local with your OAuth service URL

# Start development server
npm run dev:web
```

The app will open at `http://localhost:3000` with secure OAuth authentication.

## 🎯 Chrome Extension

*Chrome extension is in development and will be available in future releases. It will provide tab information to the web application for seamless bookmark management.*

## 📦 Project Structure

```
├── src/
│   ├── core/           # Core business logic
│   ├── context/        # Context API - centralized state management
│   ├── adapters/       # Service layer
│   ├── shell/          # I/O operations and external integrations
│   ├── types/          # TypeScript type definitions
│   ├── parsers/        # Markdown ↔ JSON conversion
│   ├── schemas/        # Zod validation schemas
│   └── utils/          # Utility functions
├── web/                # React SPA with Tailwind CSS
│   ├── src/            # React components and pages
│   │   ├── components/ # Reusable UI components
│   │   │   └── dnd/    # Drag & drop components
│   │   ├── pages/      # Route pages
│   │   └── contexts/   # React context providers
│   ├── styles/         # Global CSS and Tailwind
│   └── public/         # Static assets
├── github-oauth/       # Cloudflare Worker OAuth service
│   ├── src/            # OAuth service implementation
│   ├── wrangler.toml   # Cloudflare configuration
│   └── package.json    # OAuth service dependencies
├── extension/          # Chrome extension (in development)
│   └── ...             # Extension files
├── test/               # Test suite
│   ├── core/           # Unit tests for core logic
│   ├── react/          # React component tests
│   └── e2e/            # End-to-end tests (Playwright)
├── dist/               # Compiled outputs
│   └── web/            # Web application build
└── .github/workflows/  # CI/CD pipeline
```

## 🔧 Development

### Available Scripts

#### Development
- `npm run dev` - Development with file watching
- `npm run dev:web` - Start SPA development server
- `npm test` - Run all tests (unit + integration)
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run E2E tests with Playwright (14 tests across 7 browsers/devices)
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI mode

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
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run E2E tests (14 tests)
npm run test:e2e

# Run E2E tests for specific browser
npm run test:e2e -- --project=chromium

# Run E2E tests in UI mode
npm run test:e2e:ui
```

#### E2E Testing

BookMarkDown uses Playwright for end-to-end testing across multiple browsers and devices:

- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: Mobile Chrome, Mobile Safari
- **Features tested**: Authentication, bookmark operations, responsive design
- **Note**: Drag & drop tests are temporarily skipped due to react-dnd compatibility

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
   
   # Or use the example configuration
   cp web/.env.example web/.env.local
   # Edit web/.env.local with your OAuth service URL
   ```

### Security Benefits

- ✅ No manual token creation or management
- ✅ Client Secret never exposed to browsers
- ✅ CSRF protection with state parameter
- ✅ Tokens can be revoked anytime
- ✅ Standard OAuth 2.0 flow

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

### Technical Approach
- **Component-based architecture**: Modular React components with clear separation of concerns
- **Type-first development**: Extensive TypeScript usage with strict type checking
- **Test-driven development**: Comprehensive unit tests with Vitest and E2E tests with Playwright

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

- **Test coverage**: Add tests for all new functionality  
  - Unit tests for business logic (Vitest)
  - E2E tests for user workflows (Playwright)
- **Type safety**: Use strict TypeScript
- **Code quality**: Pass linting and formatting checks
- **Documentation**: Update README and add JSDoc comments
- **Mobile compatibility**: Test on both desktop and mobile devices

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed implementation guidelines.

## 🔗 Related Projects

- [Toby](https://www.gettoby.com/) - Original inspiration
- [GitHub Gist](https://gist.github.com/) - Data storage platform