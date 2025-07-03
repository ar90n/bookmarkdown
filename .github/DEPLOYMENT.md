# GitHub Actions Deployment Setup

This document explains how to configure the GitHub Actions deployment workflow for BookMarkDown.

## Required Setup

To deploy BookMarkDown successfully, you need to configure secrets in both GitHub and Cloudflare.

### 1. GitHub Repository Secret

#### `CLOUDFLARE_API_TOKEN`
- **Purpose**: Allows GitHub Actions to deploy the OAuth service to Cloudflare Workers
- **How to get**:
  1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
  2. Click "Create Token"
  3. Use "Edit Cloudflare Workers" template
  4. Select your account and zone (if applicable)
  5. Copy the generated token

**Setting in GitHub:**
1. Go to your repository on GitHub
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add `CLOUDFLARE_API_TOKEN` with your token value

### 2. Cloudflare Worker Secrets

These secrets are managed directly in Cloudflare and do **not** need to be added to GitHub repository secrets.

#### `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`
- **Purpose**: GitHub OAuth app credentials for authentication
- **How to get**:
  1. Go to GitHub Settings → Developer settings → OAuth Apps
  2. Create new OAuth app with:
     - Application name: `BookMarkDown`
     - Homepage URL: `https://yourusername.github.io/bookmarkdown`
     - Authorization callback URL: `https://bookmarkdown-github-oauth.workers.dev/auth/callback`
  3. Copy the Client ID and generate Client Secret

**Setting in Cloudflare (one-time setup):**
```bash
# Install wrangler and login
npm install -g wrangler
wrangler login

# Set OAuth secrets in Cloudflare
cd github-oauth
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

## Workflow Overview

The enhanced deployment workflow includes:

1. **Test Stage**: Unit tests, type checking, linting
2. **Build Stage**: Compile all targets (library, extension, web app)
3. **Deploy OAuth Service**: Deploy Cloudflare Worker with secrets
4. **Deploy Pages**: Deploy web app to GitHub Pages
5. **Create Release**: Package and release extension/library

## OAuth Service Deployment

The workflow automatically:
- Installs OAuth service dependencies
- Deploys to Cloudflare Workers using Wrangler
- Configures environment variables and secrets
- Updates web app with production OAuth service URL

## Environment Variables

### Production OAuth Service URL
The workflow automatically configures the web app to use:
```
VITE_OAUTH_SERVICE_URL=https://bookmarkdown-github-oauth.workers.dev
```

### Custom Domain (Optional)
If you want to use a custom domain for the OAuth service:
1. Configure the domain in Cloudflare
2. Update `github-oauth/wrangler.toml` with your routes
3. Update the environment variable in the workflow

## Troubleshooting

### Common Issues

1. **Cloudflare deployment fails**
   - Check that `CLOUDFLARE_API_TOKEN` has correct permissions
   - Verify the token is for the correct account

2. **OAuth flow doesn't work**
   - Ensure GitHub OAuth app callback URL matches deployed worker URL
   - Check that OAuth secrets are set in Cloudflare: `wrangler secret list`
   - Verify secrets with correct names: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

3. **Web app can't authenticate**
   - Verify `VITE_OAUTH_SERVICE_URL` points to deployed worker
   - Check browser console for CORS errors
   - Ensure OAuth secrets are properly configured in Cloudflare

### Debug Commands

To test locally:
```bash
# Test OAuth service locally
cd github-oauth
npm run dev

# Test web app with local OAuth
cd web
echo "VITE_OAUTH_SERVICE_URL=http://localhost:8787" > .env.local
npm run dev:web
```

## Security Notes

- All secrets are encrypted and only accessible during workflow execution
- OAuth service uses HTTPS and CSRF protection
- Client Secret is never exposed to browsers
- Tokens are short-lived and can be revoked by users

## Manual Deployment

If you need to deploy manually:

```bash
# Set up OAuth secrets (one-time setup)
cd github-oauth
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Deploy OAuth service
npm run deploy

# Build and deploy web app
npm run build:web
# Upload dist/web/ to your hosting platform
```