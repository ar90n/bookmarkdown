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
  };
  token: string;
  lastSyncAt?: string;
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
    token: 'test-token',
    lastSyncAt: new Date().toISOString()
  };

  const auth = { ...defaultAuth, ...authData };

  await page.addInitScript((authData) => {
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
  await page.route('https://api.github.com/gists**', async (route, request) => {
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
        contentType: 'application/json',
        body: JSON.stringify(config.gists || [])
      });
    } else if (method === 'GET' && url.pathname.match(/\/gists\/[a-z0-9]+$/)) {
      // Get specific gist
      const gistId = url.pathname.split('/').pop();
      const gist = config.gists?.find(g => g.id === gistId) || config.defaultGist;
      
      if (gist) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(gist),
          headers: {
            'etag': `"${Date.now()}"`,
          }
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else if (method === 'PATCH' && url.pathname.match(/\/gists\/[a-z0-9]+$/)) {
      // Update gist
      const requestBody = await request.postData();
      const updated = {
        ...config.defaultGist,
        ...JSON.parse(requestBody || '{}'),
        updated_at: new Date().toISOString()
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updated),
        headers: {
          'etag': `"${Date.now()}"`,
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
        contentType: 'application/json',
        body: JSON.stringify(created)
      });
    } else {
      // Default: continue with original request
      await route.continue();
    }
  });
}

/**
 * Create test bookmark data
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
  // Wait for sync status to update
  await page.waitForSelector('[data-testid="sync-status"]:not(:has-text("Syncing..."))', {
    timeout: 10000
  });
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

  // Create bookmark
  await page.click('button[title="Add Bookmark"]');
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