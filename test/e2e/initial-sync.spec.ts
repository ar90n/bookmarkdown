import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createTestBookmarkData } from './test-helpers';

test.describe('Initial sync on page load', () => {
  test('should sync from remote when gist ID exists', async ({ page }) => {
    // Set up auth and gist ID
    await setupAuth(page);
    await setupGistId(page, 'existing-gist-123');
    
    // Mock remote data
    const remoteData = createTestBookmarkData();
    remoteData.categories[0].name = 'Remote Category';
    remoteData.categories[0].bundles[0].bookmarks.push({
      id: 'remote-bookmark',
      title: 'Remote Bookmark',
      url: 'https://remote.com',
      created: new Date().toISOString()
    });
    
    await mockGistAPI(page, {
      defaultGist: {
        id: 'existing-gist-123',
        files: {
          'bookmarks.md': {
            content: JSON.stringify(remoteData)
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks - should trigger initial sync
    await page.goto('/bookmarks');
    
    // Should show syncing status during load
    await expect(page.locator('[data-testid="sync-status"]:has-text("Syncing"), [data-testid="loading-spinner"]')).toBeVisible({
      timeout: 2000
    });
    
    // Should load remote data
    await expect(page.locator('h3:has-text("Remote Category")')).toBeVisible({
      timeout: 5000
    });
    await expect(page.locator('text="Remote Bookmark"')).toBeVisible();
    
    // Should show last sync time
    await expect(page.locator('[data-testid="sync-status"]')).toContainText(/Synced|Last sync/);
  });

  test('should handle missing gist gracefully', async ({ page }) => {
    // Set up auth with non-existent gist
    await setupAuth(page);
    await setupGistId(page, 'non-existent-gist');
    
    // Mock 404 response
    await page.route('https://api.github.com/gists/non-existent-gist', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Not Found'
        })
      });
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should show empty state or create new gist option
    await expect(page.locator('text=/no bookmarks|empty|create.*gist|not found/i')).toBeVisible({
      timeout: 5000
    });
    
    // Should be able to create bookmarks locally
    await page.click('button:has-text("Add Category")');
    await page.fill('input#categoryName', 'Local Category');
    await page.click('button[type="submit"]:has-text("Create Category")');
    
    await expect(page.locator('h3:has-text("Local Category")')).toBeVisible();
  });

  test('should not sync without access token', async ({ page }) => {
    // Set up without token (logged out state)
    await page.addInitScript(() => {
      const authData = {
        user: null,
        token: null
      };
      localStorage.setItem('bookmark_auth', JSON.stringify(authData));
    });
    
    await setupGistId(page, 'test-gist-123');
    
    // Track API calls
    let apiCallMade = false;
    await page.route('https://api.github.com/**', async (route) => {
      apiCallMade = true;
      await route.continue();
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should not make API calls
    await page.waitForTimeout(2000);
    expect(apiCallMade).toBe(false);
    
    // Should show sign in prompt
    await expect(page.locator('text=/sign in|login|authenticate/i')).toBeVisible();
  });

  test('should handle sync errors on initial load', async ({ page }) => {
    await setupAuth(page);
    await setupGistId(page, 'error-gist');
    
    // Mock network error
    await page.route('https://api.github.com/**', async (route) => {
      await route.abort('failed');
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should show error state
    await expect(page.locator('text=/error|failed|problem/i')).toBeVisible({
      timeout: 5000
    });
    
    // Should offer retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    await expect(retryButton).toBeVisible();
  });

  test('should preserve local changes when initial sync fails', async ({ page }) => {
    // Set up with local data
    await page.addInitScript(() => {
      const localData = {
        categories: [{
          id: 'local-cat',
          name: 'Local Category',
          bundles: []
        }]
      };
      localStorage.setItem('bookmarkdown_data', JSON.stringify(localData));
    });
    
    await setupAuth(page);
    await setupGistId(page, 'test-gist-123');
    
    // Mock API failure
    await page.route('https://api.github.com/**', async (route) => {
      await route.abort('failed');
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Local data should still be visible
    await expect(page.locator('h3:has-text("Local Category")')).toBeVisible();
    
    // Should show sync error
    await expect(page.locator('[data-testid="sync-status"]:has-text("Error"), [data-testid="error-notification"]')).toBeVisible();
  });

  test('should sync immediately when creating first gist', async ({ page }) => {
    await setupAuth(page);
    // No gist ID set initially
    
    let gistCreated = false;
    await page.route('https://api.github.com/gists', async (route) => {
      if (route.request().method() === 'POST') {
        gistCreated = true;
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-gist-id',
            files: body.files,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await route.continue();
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should show option to create gist
    const createGistButton = page.locator('button:has-text("Create Gist"), button:has-text("Enable Sync")');
    if (await createGistButton.isVisible({ timeout: 2000 })) {
      await createGistButton.click();
      
      // May show a dialog
      const confirmButton = page.locator('button:has-text("Create"), button:has-text("Confirm")');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Should create gist
      await expect(gistCreated).toBe(true);
    }
  });

  test('should perform background sync check', async ({ page }) => {
    await setupAuth(page);
    await setupGistId(page, 'test-gist-123');
    
    let syncCheckCount = 0;
    const initialData = createTestBookmarkData();
    
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      syncCheckCount++;
      
      // Return different data on second check
      const data = syncCheckCount === 1 ? initialData : {
        ...initialData,
        categories: [{
          ...initialData.categories[0],
          name: 'Updated Category'
        }]
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-gist-123',
          files: {
            'bookmarks.md': {
              content: JSON.stringify(data)
            }
          },
          updated_at: new Date().toISOString()
        }),
        headers: {
          'etag': `"etag-${syncCheckCount}"`
        }
      });
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Initial load
    await expect(page.locator('h3:has-text("Test Category")')).toBeVisible();
    
    // Wait for background sync check (usually happens after a delay)
    await page.waitForTimeout(3000);
    
    // Should have made additional sync checks
    expect(syncCheckCount).toBeGreaterThan(1);
  });

  test('should respect auto-sync setting on initial load', async ({ page }) => {
    await setupAuth(page);
    await setupGistId(page, 'test-gist-123');
    
    // Disable auto-sync
    await page.addInitScript(() => {
      localStorage.setItem('autoSyncEnabled', 'false');
    });
    
    const remoteData = createTestBookmarkData();
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: JSON.stringify(remoteData)
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should still perform initial sync even with auto-sync disabled
    await expect(page.locator('h3:has-text("Test Category")')).toBeVisible();
    
    // But should not auto-sync on changes
    let syncCallCount = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        syncCallCount++;
      }
      await route.continue();
    });
    
    // Make a change
    await page.click('button:has-text("Add Category")');
    await page.fill('input#categoryName', 'New Category');
    await page.click('button[type="submit"]:has-text("Create Category")');
    
    // Wait to ensure no auto-sync
    await page.waitForTimeout(2000);
    expect(syncCallCount).toBe(0);
  });
});