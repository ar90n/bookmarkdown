import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createBookmark, waitForSync, createTestBookmarkData, createTestBookmarkMarkdown } from './test-helpers';

test.describe('Sync conflict resolution', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await setupAuth(page);
    
    // Set up a default gist
    await setupGistId(page, 'test-gist-123');
  });

  test('should detect and show conflict dialog', async ({ page }) => {
    // Initial state
    const initialData = createTestBookmarkData();
    
    // Set up initial gist state
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
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Wait for initial load
    await page.waitForSelector('h2:has-text("Test Category")', { timeout: 10000 });
    
    // Make a local change
    await createBookmark(page, {
      category: 'Test Category',
      bundle: 'Test Bundle',
      url: 'https://local-change.com',
      title: 'Local Change'
    });
    
    // Simulate remote change by updating the mock
    const remoteData = {
      ...initialData,
      categories: [{
        ...initialData.categories[0],
        bundles: [{
          ...initialData.categories[0].bundles[0],
          bookmarks: [
            ...initialData.categories[0].bundles[0].bookmarks,
            {
              id: 'remote-bookmark',
              title: 'Remote Change',
              url: 'https://remote-change.com',
              created: new Date().toISOString()
            }
          ]
        }]
      }]
    };
    
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: JSON.stringify(remoteData)
          }
        },
        updated_at: new Date(Date.now() + 1000).toISOString() // Newer timestamp
      }
    });
    
    // Trigger manual sync
    await page.click('button:has-text("Sync Now")');
    
    // Wait for conflict dialog
    await expect(page.locator('[data-testid="sync-conflict-dialog"]')).toBeVisible({
      timeout: 5000
    });
    
    // Verify dialog content
    await expect(page.locator('[data-testid="sync-conflict-dialog"]')).toContainText('Sync Conflict Detected');
  });

  test('should resolve conflict by choosing local version', async ({ page }) => {
    // Set up conflict scenario
    const localData = {
      categories: [{
        id: 'cat-1',
        name: 'Local Category',
        bundles: []
      }]
    };
    
    const remoteData = {
      categories: [{
        id: 'cat-1',
        name: 'Remote Category',
        bundles: []
      }]
    };
    
    // Start with remote data
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
    
    // Navigate and make local change
    await page.goto('/bookmarks');
    await page.waitForSelector('h3:has-text("Remote Category")');
    
    // Change category name locally
    // This would typically be done through UI, but for testing we'll trigger sync with conflict
    
    // Mock API to return success when saving local version
    let savedData: any = null;
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        savedData = JSON.parse(await route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-123',
            files: savedData.files,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await route.continue();
      }
    });
    
    // Create local change
    await page.click('button:has-text("Add Category")');
    await page.fill('input#categoryName', 'Local Category');
    await page.click('button[type="submit"]:has-text("Create Category")');
    
    // Trigger sync which should detect conflict
    await page.click('button:has-text("Sync Now")');
    
    // Wait for conflict dialog
    await page.waitForSelector('[data-testid="sync-conflict-dialog"]');
    
    // Choose local version
    await page.click('button:has-text("Save Local")');
    
    // Wait for sync to complete
    await waitForSync(page);
    
    // Verify local version was saved
    expect(savedData).toBeTruthy();
    expect(savedData.files['bookmarks.md'].content).toContain('Local Category');
  });

  test('should resolve conflict by choosing remote version', async ({ page }) => {
    const remoteData = {
      categories: [{
        id: 'cat-1',
        name: 'Remote Category',
        bundles: [{
          id: 'bundle-1',
          name: 'Remote Bundle',
          bookmarks: []
        }]
      }]
    };
    
    // Set up remote data
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
    
    // Make a local change
    await createBookmark(page, {
      url: 'https://local-bookmark.com',
      title: 'Local Bookmark'
    });
    
    // Update remote data to create conflict
    const updatedRemoteData = {
      ...remoteData,
      categories: [{
        ...remoteData.categories[0],
        bundles: [{
          ...remoteData.categories[0].bundles[0],
          bookmarks: [{
            id: 'remote-bookmark',
            title: 'Remote Bookmark',
            url: 'https://remote-bookmark.com',
            created: new Date().toISOString()
          }]
        }]
      }]
    };
    
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: JSON.stringify(updatedRemoteData)
          }
        },
        updated_at: new Date(Date.now() + 1000).toISOString()
      }
    });
    
    // Trigger sync
    await page.click('button:has-text("Sync Now")');
    
    // Wait for conflict dialog
    await page.waitForSelector('[data-testid="sync-conflict-dialog"]');
    
    // Choose remote version
    await page.click('button:has-text("Load Remote")');
    
    // Wait for sync to complete
    await waitForSync(page);
    
    // Verify remote version is loaded
    await expect(page.locator('h3:has-text("Remote Bundle")')).toBeVisible();
    await expect(page.locator('text="Remote Bookmark"')).toBeVisible();
    
    // Verify local bookmark is gone
    await expect(page.locator('text="Local Bookmark"')).not.toBeVisible();
  });

  test('should pause auto-sync during conflict resolution', async ({ page }) => {
    // Enable auto-sync
    await page.addInitScript(() => {
      localStorage.setItem('autoSyncEnabled', 'true');
    });
    
    // Set up conflict scenario
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: JSON.stringify(createTestBookmarkData())
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Track sync attempts
    let syncAttempts = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        syncAttempts++;
        // First sync should trigger conflict
        if (syncAttempts === 1) {
          await route.fulfill({
            status: 409, // Conflict
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Conflict detected' })
          });
          return;
        }
      }
      await route.continue();
    });
    
    // Make a change to trigger auto-sync
    await createBookmark(page, {
      url: 'https://auto-sync-test.com',
      title: 'Auto-sync Test'
    });
    
    // Wait for conflict dialog
    await page.waitForSelector('[data-testid="sync-conflict-dialog"]', { timeout: 5000 });
    
    // Make another change while dialog is open
    await createBookmark(page, {
      url: 'https://second-change.com',
      title: 'Second Change During Conflict'
    });
    
    // Wait to ensure no additional sync attempts
    await page.waitForTimeout(2000);
    
    // Should still only have 1 sync attempt (the one that triggered conflict)
    expect(syncAttempts).toBe(1);
    
    // Resolve conflict
    await page.click('button:has-text("Save Local")');
    
    // Now auto-sync should resume
    await page.waitForTimeout(2000);
    
    // Should have additional sync attempts now
    expect(syncAttempts).toBeGreaterThan(1);
  });

  test('should handle conflict dialog dismissal', async ({ page }) => {
    // Set up conflict scenario
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: JSON.stringify(createTestBookmarkData())
          }
        },
        updated_at: new Date().toISOString()
      }
    });
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Mock conflict response
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'GET' && route.request().headers()['if-none-match']) {
        await route.fulfill({
          status: 200, // Changed content
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-123',
            files: {
              'bookmarks.md': {
                content: JSON.stringify({
                  categories: [{
                    id: 'new-cat',
                    name: 'Conflicting Category',
                    bundles: []
                  }]
                })
              }
            },
            updated_at: new Date(Date.now() + 1000).toISOString()
          }),
          headers: {
            'etag': '"new-etag"'
          }
        });
      } else {
        await route.continue();
      }
    });
    
    // Make local change
    await createBookmark(page, {
      url: 'https://local.com',
      title: 'Local'
    });
    
    // Trigger sync
    await page.click('button:has-text("Sync Now")');
    
    // Wait for conflict dialog
    await page.waitForSelector('[data-testid="sync-conflict-dialog"]');
    
    // Close dialog without choosing
    const closeButton = page.locator('[data-testid="sync-conflict-dialog"] button[aria-label="Close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Click outside dialog
      await page.keyboard.press('Escape');
    }
    
    // Dialog should be hidden
    await expect(page.locator('[data-testid="sync-conflict-dialog"]')).not.toBeVisible();
    
    // Data should remain unchanged (local version)
    await expect(page.locator('text="Local"')).toBeVisible();
  });
});