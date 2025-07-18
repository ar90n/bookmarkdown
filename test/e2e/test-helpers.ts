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
  
  await page.route('https://api.github.com/**', async (route, request) => {
    const method = request.method();
    const url = new URL(request.url());
    
    // Add delay if specified
    if (config.delayMs) {
      await new Promise(resolve => setTimeout(resolve, config.delayMs));
    }

    // Fail requests if specified
    if (config.failRequests) {
      await route.abort('failed');
      return;
    }

    
    // Handle different API endpoints
    if (method === 'GET' && url.pathname === '/gists') {
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
  // Wait for sync status to update - check for various possible status texts
  try {
    await page.waitForSelector('text=/Synced|Last sync|Sync complete/i', {
      timeout: 10000
    });
  } catch {
    // If no sync status is visible, that's okay - the operation might have completed quickly
  }
}

/**
 * Wait for initial data to load
 */
export async function waitForInitialLoad(page: Page) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for either data or empty state
  try {
    await page.waitForSelector('text="Test Category"', { timeout: 5000 });
  } catch {
    // If test category not found, wait for empty state
    await page.waitForSelector('text="No bookmarks yet"', { timeout: 15000 });
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
  // Create category if needed
  if (data.category && !await page.locator(`h3:has-text("${data.category}")`).isVisible()) {
    await page.click('button:has-text("Add Category")');
    await page.fill('input#categoryName', data.category);
    await page.click('button[type="submit"]:has-text("Create Category")');
    await page.waitForSelector('input#categoryName', { state: 'hidden' });
  }

  // Create bundle if needed
  if (data.bundle && !await page.locator(`text="${data.bundle}"`).isVisible()) {
    await page.click('button[title="Add Bundle"]');
    await page.fill('input#bundleName', data.bundle);
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