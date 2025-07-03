# BookMarkDown OAuth Service

Cloudflare Worker service that provides secure GitHub OAuth authentication for BookMarkDown.

## Features

- 🔐 Secure GitHub OAuth 2.0 flow
- 🛡️ Client secret protection on server-side
- 🌍 CORS support for web applications
- ⚡ Fast edge deployment via Cloudflare Workers
- 🔄 Token validation and refresh endpoints

## Setup

### 1. GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - Application name: `BookMarkDown`
   - Homepage URL: `https://your-domain.github.io` 
   - Authorization callback URL: `https://your-worker.your-subdomain.workers.dev/auth/callback`
4. Save the Client ID and Client Secret

### 2. Deploy to Cloudflare

```bash
# Install dependencies
npm install

# Set secrets (required)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Update allowed origins in wrangler.toml
# ALLOWED_ORIGINS = "http://localhost:3000,https://your-domain.github.io"

# Deploy to Cloudflare Workers
npm run deploy
```

### 3. Environment Variables

Set these in the Cloudflare Workers dashboard or via wrangler:

- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret (keep secure!)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

## API Endpoints

### `GET /auth/github`

Initiates GitHub OAuth flow.

**Query Parameters:**
- `redirect_uri`: Where to redirect after successful auth
- `state`: CSRF protection state parameter

**Response:** Redirects to GitHub OAuth authorization page

### `GET /auth/callback`

Handles GitHub OAuth callback.

**Query Parameters:**
- `code`: Authorization code from GitHub
- `state`: State parameter for validation

**Response:** Redirects back to client with auth data

### `POST /auth/refresh`

Validates existing token and returns user info.

**Request Body:**
```json
{
  "accessToken": "github_access_token"
}
```

**Response:**
```json
{
  "user": {
    "id": 123456,
    "login": "username",
    "name": "User Name",
    "email": "user@example.com",
    "avatar_url": "https://..."
  },
  "tokens": {
    "accessToken": "token",
    "tokenType": "bearer",
    "scope": "gist user:email",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### `POST /auth/revoke`

Revokes GitHub access token.

**Request Body:**
```json
{
  "accessToken": "github_access_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

## Security Features

- Client secret never exposed to client-side code
- CSRF protection via state parameter validation
- CORS headers properly configured
- Token validation with GitHub API
- Secure token revocation

## Development

```bash
# Start local development server
npm run dev

# View live logs
npm run tail

# Build for production
npm run build
```

## License

Apache 2.0 - See LICENSE file for details.