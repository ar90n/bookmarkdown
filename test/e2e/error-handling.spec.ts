import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createBookmark, waitForSync, createTestBookmarkMarkdown, waitForInitialLoad } from './test-helpers';

test.describe('Error handling and recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await setupAuth(page);
    
    // Set up a default gist
    await setupGistId(page, 'test-gist-123');
    
    // Mock default gist for initial load
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: createTestBookmarkMarkdown()
          }
        },
        updated_at: new Date().toISOString()
      }
    });
  });

  test('should allow manual retry on network errors', async ({ page }) => {
    let attemptCount = 0;
    
    // Navigate to bookmarks first
    await page.goto('/bookmarks');
    await waitForInitialLoad(page);
    
    // Make a change first to have something to sync
    await createBookmark(page, {
      url: 'https://retry-test.com',
      title: 'Retry Test Bookmark'
    });
    
    // Now set up route to intercept sync attempts
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        attemptCount++;
        if (attemptCount < 3) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'test-gist-123',
              files: { 'bookmarks.md': { content: '# Success' } },
              updated_at: new Date().toISOString()
            }),
            headers: {
              'etag': `"${Date.now()}"`,
              'access-control-expose-headers': 'etag'
            }
          });
        }
      } else {
        // Continue with default handling for non-PATCH requests
        await route.continue();
      }
    });
    
    // Trigger manual sync
    await page.click('button:has-text("Sync")');
    
    // Should show error initially
    await expect(page.locator('[data-testid="sync-status"][data-sync-status="error"]')).toBeVisible({
      timeout: 10000
    });
    
    // Retry manually by clicking Sync button again
    await page.click('button:has-text("Sync")');
    
    // Should still fail on second attempt
    await expect(page.locator('[data-testid="sync-status"][data-sync-status="error"]')).toBeVisible({
      timeout: 10000
    });
    
    // Third attempt should succeed
    await page.click('button:has-text("Sync")');
    
    // Wait for successful sync
    await waitForSync(page);
    
    // Verify sync succeeded eventually after manual retries
    expect(attemptCount).toBe(3);
  });

  test('should handle authentication errors', async ({ page }) => {
    // Navigate to bookmarks first
    await page.goto('/bookmarks');
    await waitForInitialLoad(page);
    
    // Re-route API to return 401
    await page.unroute('https://api.github.com/**');
    await page.route('https://api.github.com/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Bad credentials',
          documentation_url: 'https://docs.github.com/rest'
        })
      });
    });
    
    // Try to sync
    await page.click('button:has-text("Sync")');
    
    // Should show error status
    await expect(page.locator('[data-testid="sync-status"][data-sync-status="error"]')).toBeVisible({
      timeout: 10000
    });
    
    // Check for error notification or any error message
    const errorVisible = await page.locator('[data-testid="error-notification"], text=/error|failed|401|unauthorized/i').isVisible({
      timeout: 5000
    });
    expect(errorVisible).toBeTruthy();
  });

  test('should handle rate limit errors', async ({ page }) => {
    // Navigate to bookmarks first
    await page.goto('/bookmarks');
    await waitForInitialLoad(page);
    
    // Re-route API to return rate limit error
    await page.unroute('https://api.github.com/**');
    await page.route('https://api.github.com/**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        headers: {
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600)
        },
        body: JSON.stringify({
          message: 'API rate limit exceeded',
          documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'
        })
      });
    });
    
    // Try to sync
    await page.click('button:has-text("Sync")');
    
    // Should show error status
    await expect(page.locator('[data-testid="sync-status"][data-sync-status="error"]')).toBeVisible({
      timeout: 10000
    });
    
    // Check for rate limit error or any error message
    const errorVisible = await page.locator('[data-testid="error-notification"], text=/error|failed|403|rate/i').isVisible({
      timeout: 5000
    });
    expect(errorVisible).toBeTruthy();
  });

  test('should handle localStorage errors gracefully', async ({ page }) => {
    // Inject script to make localStorage throw errors
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;
      let callCount = 0;
      
      Storage.prototype.setItem = function(key: string, value: string) {
        callCount++;
        // Fail on every 3rd call
        if (callCount % 3 === 0) {
          throw new Error('QuotaExceededError: localStorage is full');
        }
        return originalSetItem.call(this, key, value);
      };
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Operations should still work despite localStorage errors
    await createBookmark(page, {
      url: 'https://storage-error.com',
      title: 'Storage Error Test'
    });
    
    // Bookmark should be created
    await expect(page.locator('text="Storage Error Test"')).toBeVisible();
    
    // Check for any error notifications
    const hasError = await page.locator('[data-testid="error-notification"]').isVisible();
    
    // If error shown, it should be dismissible
    if (hasError) {
      const dismissButton = page.locator('[data-testid="error-notification"] button[aria-label="Dismiss"]');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        await expect(page.locator('[data-testid="error-notification"]')).not.toBeVisible();
      }
    }
  });

  test('should handle corrupt data gracefully', async ({ page }) => {
    // Mock API to return invalid JSON
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: '{ invalid json }'
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Should show error or empty state
    const hasError = await page.locator('[data-testid="error-notification"], text=/error|failed/i').isVisible({
      timeout: 5000
    });
    const hasEmptyState = await page.locator('text=/no bookmarks|empty|add.*first/i').isVisible();
    
    expect(hasError || hasEmptyState).toBeTruthy();
    
    // Should still be able to create new bookmarks
    await createBookmark(page, {
      url: 'https://recovery.com',
      title: 'Recovery Bookmark'
    });
    
    await expect(page.locator('text="Recovery Bookmark"')).toBeVisible();
  });

  test('should show offline indicator when network is down', async ({ page, context }) => {
    // Navigate to bookmarks while online
    await page.goto('/bookmarks');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to sync
    await page.click('button:has-text("Sync")');
    
    // Should show network error - check for any error indication
    const errorIndicators = [
      page.locator('[data-testid="error-notification"]'),
      page.locator('[data-testid="sync-status"][data-sync-status="error"]'),
      page.locator('text=/network|connection|offline|failed/i')
    ];
    
    let foundError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.isVisible({ timeout: 1000 })) {
        foundError = true;
        break;
      }
    }
    
    expect(foundError).toBeTruthy();
    
    // Go back online
    await context.setOffline(false);
    
    // Should be able to sync again
    await page.click('button:has-text("Sync"), button:has-text("Retry")');
    
    // Should not show offline error anymore
    await expect(page.locator('text=/offline|no.*connection/i')).not.toBeVisible({
      timeout: 5000
    });
  });

  test('should handle server errors (500) gracefully', async ({ page }) => {
    let retryCount = 0;
    
    // Mock API to return 500 errors initially
    await page.route('https://api.github.com/**', async (route) => {
      retryCount++;
      if (retryCount < 3) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Internal Server Error'
          })
        });
      } else {
        // Succeed on 3rd attempt
        await route.continue();
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Try to sync
    await page.click('button:has-text("Sync")');
    
    // Should show server error
    await expect(page.locator('text=/server error|something went wrong|try again/i')).toBeVisible({
      timeout: 5000
    });
    
    // Should have retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    await expect(retryButton).toBeVisible();
    
    // Retry should eventually succeed
    await retryButton.click();
    await waitForSync(page);
  });

  test('should handle timeout errors', async ({ page }) => {
    // Mock API with significant delay
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: '# Bookmarks'
          }
        },
        updated_at: new Date().toISOString()
      },
      delayMs: 30000 // 30 second delay to trigger timeout
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Try to sync
    await page.click('button:has-text("Sync")');
    
    // Should show timeout error within reasonable time
    await expect(page.locator('text=/timeout|taking too long|slow/i')).toBeVisible({
      timeout: 15000 // Should timeout before 30s
    });
  });
});