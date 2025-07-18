import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createBookmark, waitForSync } from './test-helpers';

test.describe('Error handling and recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await setupAuth(page);
    
    // Set up a default gist
    await setupGistId(page, 'test-gist-123');
  });

  test('should retry on network errors', async ({ page }) => {
    let attemptCount = 0;
    
    // Mock API to fail first 2 attempts, then succeed
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
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
            })
          });
        }
      } else {
        await route.continue();
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Make a change
    await createBookmark(page, {
      url: 'https://retry-test.com',
      title: 'Retry Test Bookmark'
    });
    
    // Trigger manual sync
    await page.click('button:has-text("Sync Now")');
    
    // Should show error initially
    await expect(page.locator('[data-testid="error-notification"], [data-testid="sync-status"]:has-text("Error")')).toBeVisible({
      timeout: 5000
    });
    
    // Click retry button if available
    const retryButton = page.locator('button:has-text("Retry")');
    if (await retryButton.isVisible({ timeout: 1000 })) {
      await retryButton.click();
    }
    
    // Wait for successful sync after retries
    await waitForSync(page);
    
    // Verify sync succeeded eventually
    expect(attemptCount).toBeGreaterThanOrEqual(3);
  });

  test('should handle authentication errors', async ({ page }) => {
    // Mock API to return 401
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
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Try to sync
    await page.click('button:has-text("Sync Now")');
    
    // Should show auth error
    await expect(page.locator('text=/authentication|unauthorized|credentials/i')).toBeVisible({
      timeout: 5000
    });
    
    // Should offer to re-authenticate
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")');
    await expect(signInButton).toBeVisible();
  });

  test('should handle rate limit errors', async ({ page }) => {
    // Mock API to return rate limit error
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
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Try to sync
    await page.click('button:has-text("Sync Now")');
    
    // Should show rate limit error
    await expect(page.locator('text=/rate limit/i')).toBeVisible({
      timeout: 5000
    });
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
    await page.click('button:has-text("Sync Now")');
    
    // Should show offline indicator
    await expect(page.locator('text=/offline|no.*connection|network.*error/i')).toBeVisible({
      timeout: 5000
    });
    
    // Go back online
    await context.setOffline(false);
    
    // Should be able to sync again
    await page.click('button:has-text("Sync Now"), button:has-text("Retry")');
    
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
    await page.click('button:has-text("Sync Now")');
    
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
    await page.click('button:has-text("Sync Now")');
    
    // Should show timeout error within reasonable time
    await expect(page.locator('text=/timeout|taking too long|slow/i')).toBeVisible({
      timeout: 15000 // Should timeout before 30s
    });
  });
});