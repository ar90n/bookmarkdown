import { Page } from '@playwright/test';

/**
 * E2E Test Helpers for BookMarkDown
 * Common utilities for setting up test scenarios
 */

export interface AuthData {
  user: {
    login: string;
    name: string;
    avatar_url: string;
    id?: number;
    email?: string;
  };
  tokens: {
    accessToken: string;
    scopes?: string[];
    expiresAt?: Date;
  };
  lastLoginAt: string;
}

export interface GistData {
  id: string;
  files: {
    [filename: string]: {
      content: string;
    };
  };
  updated_at: string;
}

/**
 * Set up authentication state in localStorage
 */
export async function setupAuth(page: Page, authData?: Partial<AuthData>) {
  const defaultAuth: AuthData = {
    user: {
      login: 'testuser',
      name: 'Test User',
      avatar_url: 'https://github.com/testuser.png'
    },
    tokens: {
      accessToken: 'test-token'
    },
    lastLoginAt: new Date().toISOString()
  };

  const auth = { ...defaultAuth, ...authData };

  await page.addInitScript((authData) => {
    // Enable test mode to bypass GitHub API validation
    localStorage.setItem('TEST_MODE', 'true');
    
    // Set auth data
    localStorage.setItem('bookmark_auth', JSON.stringify(authData));
  }, auth);
}

/**
 * Set up Gist ID in localStorage
 */
export async function setupGistId(page: Page, gistId: string) {
  await page.addInitScript((id) => {
    localStorage.setItem('bookmarkdown_data_gist_id', id);
  }, gistId);
}

/**
 * Set up auto-sync setting
 */
export async function setupAutoSync(page: Page, enabled: boolean) {
  await page.addInitScript((enabled) => {
    localStorage.setItem('autoSyncEnabled', enabled ? 'true' : 'false');
  }, enabled);
}

/**
 * Mock Gist API responses
 */
export async function mockGistAPI(page: Page, config: {
  gists?: GistData[];
  defaultGist?: GistData;
  failRequests?: boolean;
  delayMs?: number;
}) {
  
  // Track etags for conditional requests
  const etagMap = new Map<string, string>();
  
  await page.route('https://api.github.com/**', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());
    const headers = request.headers();
    
    // Add delay if specified
    if (config.delayMs) {
      await new Promise(resolve => setTimeout(resolve, config.delayMs));
    }

    // Fail requests if specified
    if (config.failRequests) {
      await route.abort('failed');
      return;
    }
    
    // Check authorization - accept test token
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.includes('Bearer')) {
      // Return 401 for missing auth
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          message: 'Requires authentication',
          documentation_url: 'https://docs.github.com/rest'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });
      return;
    }

    // Mock user endpoint for token validation
    if (method === 'GET' && url.pathname === '/user') {
      // Return user data for token validation
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          login: 'testuser',
          name: 'Test User',
          avatar_url: 'https://github.com/testuser.png',
          id: 123456,
          email: 'test@example.com'
        }),
        headers: {
          'content-type': 'application/json',
          'x-oauth-scopes': 'gist, user:email'
        }
      });
    } else if (method === 'HEAD' && url.pathname === '/user') {
      // Return headers for scope check
      await route.fulfill({
        status: 200,
        headers: {
          'x-oauth-scopes': 'gist, user:email'
        }
      });
    } else if (method === 'GET' && url.pathname === '/gists') {
      // List gists
      await route.fulfill({
        status: 200,
        body: JSON.stringify(config.gists || []),
        headers: {
          'content-type': 'application/json'
        }
      });
    } else if (method === 'GET' && url.pathname.match(/\/gists\/[a-zA-Z0-9\-]+$/)) {
      // Get specific gist
      const gistId = url.pathname.split('/').pop();
      const gist = config.gists?.find(g => g.id === gistId) || config.defaultGist;
      
      if (gist) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify(gist),
          headers: {
            'etag': `"${Date.now()}"`,
            'content-type': 'application/json',
            'access-control-expose-headers': 'etag'
          }
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else if (method === 'PATCH' && url.pathname.match(/\/gists\/[a-zA-Z0-9\-]+$/)) {
      // Update gist
      const requestBody = await request.postData();
      const updated = {
        ...config.defaultGist,
        ...JSON.parse(requestBody || '{}'),
        updated_at: new Date().toISOString()
      };
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify(updated),
        headers: {
          'etag': `"${Date.now()}"`,
          'content-type': 'application/json',
          'access-control-expose-headers': 'etag'
        }
      });
    } else if (method === 'POST' && url.pathname === '/gists') {
      // Create gist
      const requestBody = await request.postData();
      const created = {
        id: 'new-gist-id',
        ...JSON.parse(requestBody || '{}'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await route.fulfill({
        status: 201,
        body: JSON.stringify(created),
        headers: {
          'content-type': 'application/json'
        }
      });
    } else if (method === 'GET' && url.pathname.match(/\/gists\/[a-zA-Z0-9\-]+\/commits$/)) {
      // Get gist commits
      const gistId = url.pathname.split('/')[3];
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            version: 'abc123',
            committed_at: new Date().toISOString(),
            change_status: {
              total: 1,
              additions: 1,
              deletions: 0
            },
            url: `https://api.github.com/gists/${gistId}/abc123`,
            user: {
              login: 'testuser',
              avatar_url: 'https://github.com/testuser.png'
            }
          }
        ]),
        headers: {
          'content-type': 'application/json'
        }
      });
    } else {
      // Default: continue with original request
      await route.continue();
    }
  });
}

/**
 * Create test bookmark data in Markdown format
 */
export function createTestBookmarkMarkdown() {
  return `# Bookmarks

## Test Category
### Test Bundle
- [Test Bookmark 1](https://example1.com)
- [Test Bookmark 2](https://example2.com)`;
}

/**
 * Create test bookmark data as Root object
 */
export function createTestBookmarkData() {
  return {
    categories: [
      {
        id: 'cat-1',
        name: 'Test Category',
        bundles: [
          {
            id: 'bundle-1',
            name: 'Test Bundle',
            bookmarks: [
              {
                id: 'bookmark-1',
                title: 'Test Bookmark 1',
                url: 'https://example1.com',
                created: new Date().toISOString()
              },
              {
                id: 'bookmark-2',
                title: 'Test Bookmark 2',
                url: 'https://example2.com',
                created: new Date().toISOString()
              }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Wait for sync operation to complete
 */
export async function waitForSync(page: Page) {
  // Wait for sync status to show synced state
  await page.waitForSelector('[data-testid="sync-status"][data-sync-status="synced"], [data-testid="sync-status"]:has-text("Synced")', {
    timeout: 5000
  });
}

/**
 * Wait for specific sync status
 */
export async function waitForSyncStatus(page: Page, status: 'syncing' | 'synced' | 'error' | 'pending') {
  await page.waitForSelector(`[data-testid="sync-status"][data-sync-status="${status}"]`, {
    timeout: 5000
  });
}

/**
 * Wait for bookmark count to change
 */
export async function waitForBookmarkCount(page: Page, expectedCount: number) {
  await page.waitForFunction(
    (count) => {
      const bookmarkElements = document.querySelectorAll('a[href^="https://"], a[href^="http://"]');
      return bookmarkElements.length === count;
    },
    expectedCount,
    { timeout: 5000 }
  );
}

/**
 * Wait for initial data to load
 */
export async function waitForInitialLoad(page: Page) {
  // Wait for page to be ready
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for main content area to be visible
  await page.waitForSelector('main', { timeout: 5000 });
  
  // Wait for either bookmark content or empty state
  // Check for any of these indicators individually
  const indicators = await Promise.race([
    page.waitForSelector('button:has-text("Add Category")', { timeout: 5000 }).catch(() => null),
    page.waitForSelector('text=No bookmarks yet', { timeout: 5000 }).catch(() => null),
    page.waitForSelector('h3', { timeout: 5000 }).catch(() => null),
    page.waitForSelector('h4', { timeout: 5000 }).catch(() => null)
  ]);
  
  if (!indicators) {
    throw new Error('No bookmark indicators found');
  }
  
  // Ensure sync status is visible
  await page.waitForSelector('[data-testid="sync-status"]', { timeout: 2000 });
}

/**
 * Wait for authentication to be ready
 */
export async function waitForAuth(page: Page) {
  // Wait for auth to initialize
  await page.waitForFunction(() => {
    const authData = localStorage.getItem('bookmark_auth');
    if (!authData) return false;
    
    try {
      const parsed = JSON.parse(authData);
      return parsed.user && parsed.tokens;
    } catch {
      return false;
    }
  }, { timeout: 5000 });
  
  // If there's an auth error notification, dismiss it
  const authError = page.locator('[data-testid="error-notification"]');
  if (await authError.isVisible({ timeout: 1000 })) {
    // Click the dismiss button
    const dismissButton = authError.locator('button:has-text("Dismiss")');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await authError.waitFor({ state: 'hidden', timeout: 2000 });
    }
  }
  
  // Also check for the sync error status and wait for it to clear
  const syncError = page.locator('[data-testid="sync-status"][data-sync-status="error"]');
  if (await syncError.isVisible({ timeout: 500 })) {
    // Wait a bit for the error to clear after dismissing notification
    await page.waitForTimeout(1000);
  }
}

/**
 * Create a bookmark through UI
 */
export async function createBookmark(page: Page, data: {
  category?: string;
  bundle?: string;
  url: string;
  title: string;
}) {
  // Default category and bundle if not provided
  const categoryName = data.category || 'Default Category';
  const bundleName = data.bundle || 'Default Bundle';
  
  // Create category if needed
  if (!await page.locator(`h3:has-text("${categoryName}")`).isVisible()) {
    // Check if there are any categories at all
    const hasCategories = await page.locator('h3').count() > 0;
    if (hasCategories) {
      await page.click('button:has-text("Add Category")');
    } else {
      // First category - use different button
      const createFirstButton = page.locator('button:has-text("Create First Category")');
      if (await createFirstButton.isVisible()) {
        await createFirstButton.click();
      } else {
        await page.click('button:has-text("Add Category")');
      }
    }
    await page.fill('input#categoryName', categoryName);
    await page.click('button[type="submit"]:has-text("Create Category")');
    await page.waitForSelector('input#categoryName', { state: 'hidden' });
  }

  // Create bundle if needed
  if (!await page.locator(`h4:has-text("${bundleName}")`).isVisible()) {
    await page.click('button[title="Add Bundle"]');
    await page.fill('input#bundleName', bundleName);
    await page.click('button[type="submit"]:has-text("Create Bundle")');
    await page.waitForSelector('input#bundleName', { state: 'hidden' });
  }

  // Create bookmark - look for add bookmark button
  await page.click('button:has-text("Add Bookmark"), button:has-text("+ Add Another Bookmark")');
  await page.fill('input#bookmarkUrl', data.url);
  await page.fill('input#bookmarkTitle', data.title);
  await page.click('button[type="submit"]:has-text("Add Bookmark")');
  await page.waitForSelector('input#bookmarkUrl', { state: 'hidden' });
}

/**
 * Create a conflicting state between local and remote
 */
export async function createConflict(page: Page) {
  // This would typically involve:
  // 1. Making a local change
  // 2. Mocking a different remote state
  // 3. Triggering a sync operation
  
  // Implementation depends on specific test needs
}

/**
 * Check if sync conflict dialog is visible
 */
export async function isSyncConflictDialogVisible(page: Page) {
  return await page.locator('[data-testid="sync-conflict-dialog"]').isVisible();
}

/**
 * Resolve sync conflict
 */
export async function resolveSyncConflict(page: Page, choice: 'local' | 'remote') {
  const button = choice === 'local' 
    ? 'button:has-text("Save Local")'
    : 'button:has-text("Load Remote")';
  
  await page.click(button);
  await page.waitForSelector('[data-testid="sync-conflict-dialog"]', { state: 'hidden' });
}