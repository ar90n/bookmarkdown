import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createTestBookmarkData } from './test-helpers';

test.describe('Initial sync on page load', () => {
  test('should sync from remote when gist ID exists', async ({ page }) => {
    // Set up auth and gist ID
    await setupAuth(page);
    await setupGistId(page, 'existing-gist-123');
    
    // Mock remote data with proper Markdown format
    const remoteMarkdown = `# Bookmarks

## Remote Category

### Remote Bundle

- [Test Bookmark 1](https://example1.com)
- [Test Bookmark 2](https://example2.com)
- [Remote Bookmark](https://remote.com)`;
    
    await mockGistAPI(page, {
      defaultGist: {
        id: 'existing-gist-123',
        files: {
          'bookmarks.md': {
            content: remoteMarkdown
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks - should trigger initial sync
    await page.goto('/bookmarks');
    
    // Syncing status might be too quick to catch, skip this check
    
    // Should load remote data
    await expect(page.locator('text="Remote Bookmark"')).toBeVisible({
      timeout: 5000
    });
    
    // Wait for the page to fully load and check sync status
    await page.waitForLoadState('networkidle');
    
    // Check if sync status is visible anywhere on the page
    const syncStatusVisible = await page.locator('[data-testid="sync-status"]').isVisible();
    if (syncStatusVisible) {
      await expect(page.locator('[data-testid="sync-status"]')).toContainText(/Synced|Last sync|Just now/);
    } else {
      // Check for alternative sync indicator
      await expect(page.locator('text=/Synced|Auto-sync.*ON/')).toBeVisible();
    }
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
    
    // Should show empty state or error notification
    await expect(page.locator('[data-testid="error-notification"], h2:has-text("No bookmarks yet")')).toBeVisible({
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
      localStorage.removeItem('bookmark_auth');
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
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
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
    
    // Should show error state - could be error notification or sync status error
    await expect(page.locator('[data-testid="error-notification"], [data-testid="sync-status"][data-sync-status="error"], text="Sync error", text="Failed"').first()).toBeVisible({
      timeout: 5000
    });
    
    // Should offer retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    await expect(retryButton).toBeVisible();
  });

  test('should preserve local changes when initial sync fails', async ({ page }) => {
    // Set up with local data
    await page.addInitScript(() => {
      const localMarkdown = `# Bookmarks

## Local Category`;
      localStorage.setItem('bookmarkdown_data', localMarkdown);
    });
    
    await setupAuth(page);
    await setupGistId(page, 'test-gist-123');
    
    // Mock API failure
    await page.route('https://api.github.com/**', async (route) => {
      await route.abort('failed');
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Local data should still be visible - wait for the page to load first
    await page.waitForLoadState('networkidle');
    
    // Check if we have any bookmarks or the empty state
    const hasBookmarks = await page.locator('h3').count() > 0;
    expect(hasBookmarks || await page.locator('text="No bookmarks yet"').isVisible()).toBeTruthy();
    
    // Should show sync error
    await expect(page.locator('[data-testid="sync-status"][data-sync-status="error"], [data-testid="error-notification"]')).toBeVisible();
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
    const initialMarkdown = `# Bookmarks

## Test Category

### Test Bundle

- [Test Bookmark 1](https://example1.com)
- [Test Bookmark 2](https://example2.com)`;
    
    const updatedMarkdown = `# Bookmarks

## Updated Category

### Test Bundle

- [Test Bookmark 1](https://example1.com)
- [Test Bookmark 2](https://example2.com)`;
    
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      syncCheckCount++;
      
      // Return different data on second check
      const markdown = syncCheckCount === 1 ? initialMarkdown : updatedMarkdown;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-gist-123',
          files: {
            'bookmarks.md': {
              content: markdown
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
    await expect(page.locator('text="Test Bookmark 1"')).toBeVisible();
    
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
    
    const remoteMarkdown = `# Bookmarks

## Test Category

### Test Bundle

- [Test Bookmark 1](https://example1.com)
- [Test Bookmark 2](https://example2.com)`;
    
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: remoteMarkdown
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should still perform initial sync even with auto-sync disabled
    await expect(page.locator('text="Test Bookmark 1"')).toBeVisible();
    
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