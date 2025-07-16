# BookMarkDown

[![CI Status](https://github.com/ar90n/bookmarkdown/actions/workflows/ci.yml/badge.svg)](https://github.com/ar90n/bookmarkdown/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ar90n/bookmarkdown/branch/main/graph/badge.svg)](https://codecov.io/gh/ar90n/bookmarkdown)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0+-61dafb.svg)](https://reactjs.org/)

A simple and portable bookmark management service using GitHub Gist as data storage with Markdown format. Inspired by Toby, BookMarkDown prioritizes human-readable data, avoiding vendor lock-in, and maintaining simplicity.

## ✨ Key Features

- **🔒 Secure OAuth Authentication** - GitHub OAuth flow via Cloudflare Worker
- **📝 Human-Readable Storage** - Stores bookmarks in Markdown format on GitHub Gist
- **🔄 Real-time Sync** - Automatic synchronization with conflict detection
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices
- **🔌 Chrome Extension** - Capture tabs and add bookmarks directly from browser
- **🧪 Well-Tested** - Comprehensive test coverage with unit and E2E tests

## 🚀 Quick Start

### Web Application

Visit the live application at [https://bookmarkdown.ar90n.net](https://bookmarkdown.ar90n.net) or run locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev:web
```

The app will open at `http://localhost:3000` - just sign in with GitHub!

### Chrome Extension

The Chrome extension acts as a bridge between your browser tabs and the BookMarkDown web app:

1. Build the extension:
   ```bash
   npm run build:extension
   ```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/extension` directory

3. Use the extension:
   - Click the extension icon to check tab capture status
   - Click "Open BookMarkDown" to access the web app
   - The extension automatically shares tab information with the web app

## 🧱 Data Structure

```
Root
└── Category (name)
    └── Bundle (name)
        └── Bookmark (id, title, url, tags, notes)
```

## 📄 Markdown Format

Your bookmarks are stored in GitHub Gist using this human-readable format:

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

## 📦 Project Structure

```
├── web/src/lib/        # Core library
│   ├── core/           # Business logic
│   ├── context/        # State management
│   ├── adapters/       # Service layer
│   ├── shell/          # External integrations
│   ├── parsers/        # Markdown ↔ JSON
│   └── schemas/        # Zod validation
├── web/                # React SPA
│   ├── src/            # React app
│   └── public/         # Static assets
├── extension/          # Chrome extension
│   ├── background.js   # Service worker
│   ├── popup.js        # Extension popup
│   └── manifest.json   # Extension config
├── github-oauth/       # Cloudflare Worker
├── test/               # Test suite
│   ├── core/           # Unit tests
│   ├── react/          # Component tests
│   └── e2e/            # E2E tests (Playwright)
└── dist/               # Build outputs
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev:web          # Start web app dev server
npm test                 # Run unit tests
npm run test:e2e         # Run E2E tests (57 tests passing)
npm run test:coverage    # Run tests with coverage

# Building
npm run build:all        # Build everything
npm run build:web        # Build web app
npm run build:extension  # Build Chrome extension

# Code Quality
npm run lint             # Lint code
npm run type-check       # Type checking
```

### Testing

BookMarkDown uses Vitest for unit tests and Playwright for E2E tests:

- **Unit Tests**: Fast, focused tests for business logic
- **E2E Tests**: Full user workflow testing across browsers
  - Desktop: Chrome, Firefox, Safari, Edge
  - Mobile: Mobile Chrome, Mobile Safari
  - Currently: 57 tests passing, 58 skipped (remote detection & drag-drop)

## 🔐 OAuth Setup

### For Users

Simply click "Sign in with GitHub" - no manual token creation needed!

### For Developers

1. **Create GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Set callback URL: `https://your-oauth-service.workers.dev/auth/callback`

2. **Deploy Cloudflare Worker**
   ```bash
   cd github-oauth
   npm install
   
   # Configure secrets
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   
   # Deploy
   npm run deploy
   ```

3. **Configure Web App**
   ```bash
   # Set OAuth service URL
   echo "VITE_OAUTH_SERVICE_URL=https://your-oauth-service.workers.dev" > web/.env.local
   ```

## 🔄 Sync Strategy

BookMarkDown uses a **remote-first** approach with automatic conflict detection:

- Changes are synchronized automatically
- Conflicts are detected and users are prompted to resolve them
- The Markdown format allows manual conflict resolution if needed

## 🎨 Design Philosophy

1. **Human-readable first**: All data readable without special tools
2. **No vendor lock-in**: Data stored in open formats
3. **Simplicity over features**: Keep it simple and focused
4. **Type-safe**: Extensive TypeScript usage

## 🛡️ Security

- **OAuth 2.0**: Secure authentication flow
- **No Token Storage**: Uses OAuth instead of manual tokens
- **CSRF Protection**: State parameter validation
- **HTTPS Only**: All communication encrypted

## 🤝 Contributing

Contributions are welcome! Please ensure:

- **Tests**: Add tests for new functionality
- **Types**: Use TypeScript with strict mode
- **Quality**: Pass linting and formatting
- **Mobile**: Test on both desktop and mobile

## 📄 License

Apache License 2.0 - See [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Toby](https://www.gettoby.com/) - Original inspiration
- [GitHub Gist](https://gist.github.com/) - Data storage platform