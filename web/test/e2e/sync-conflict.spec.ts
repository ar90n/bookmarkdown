import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createBookmark, waitForSync, createTestBookmarkData, createTestBookmarkMarkdown } from './test-helpers';

test.describe.skip('Sync conflict resolution', () => {
  // TODO: Update these tests to match the new remote-first architecture
  // The new implementation uses etag-based conflict detection instead of merge conflicts
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await setupAuth(page);
    
    // Set up a default gist
    await setupGistId(page, 'test-gist-123');
  });

  test('should detect and show conflict dialog', async ({ page }) => {
    const initialTimestamp = new Date().toISOString();
    const remoteTimestamp = new Date(Date.now() + 10000).toISOString(); // 10 seconds later
    
    // Initial state with etag
    let currentEtag = '"initial-etag"';
    let gistData = {
      id: 'test-gist-123',
      files: {
        'bookmarks.md': {
          content: createTestBookmarkMarkdown()
        }
      },
      updated_at: initialTimestamp
    };
    
    // Set up dynamic mock that can change
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      const method = route.request().method();
      
      if (method === 'HEAD') {
        // Check if it's a conditional request for change detection
        const ifNoneMatch = route.request().headers()['if-none-match'];
        if (ifNoneMatch === currentEtag) {
          // Simulate that remote has changed
          await route.fulfill({
            status: 200,
            headers: {
              'etag': '"new-etag"',
              'content-type': 'application/json'
            }
          });
        } else {
          await route.fulfill({
            status: 304, // Not Modified
            headers: {
              'etag': currentEtag,
              'content-type': 'application/json'
            }
          });
        }
      } else if (method === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify(gistData),
          headers: {
            'etag': currentEtag,
            'content-type': 'application/json',
            'access-control-expose-headers': 'etag'
          }
        });
      } else if (method === 'PATCH') {
        // Simulate conflict - remote has been updated
        await route.fulfill({
          status: 409,
          body: JSON.stringify({
            message: 'Conflict: The gist has been modified'
          }),
          headers: {
            'content-type': 'application/json'
          }
        });
      } else {
        await route.continue();
      }
    });
    
    // Mock the list gists endpoint
    await page.route('https://api.github.com/gists', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
        headers: {
          'content-type': 'application/json'
        }
      });
    });
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Wait for initial load
    await page.waitForSelector('h3:has-text("Test Bookmark 1")', { timeout: 10000 });
    
    // Make a local change
    await createBookmark(page, {
      category: 'Test Category',
      bundle: 'Test Bundle',
      url: 'https://local-change.com',
      title: 'Local Change'
    });
    
    // Update the mock data to simulate remote change
    gistData = {
      ...gistData,
      files: {
        'bookmarks.md': {
          content: `# Bookmarks

## Test Category

### Test Bundle

- [Test Bookmark 1](https://example1.com)
- [Test Bookmark 2](https://example2.com)
- [Remote Change](https://remote-change.com)`
        }
      },
      updated_at: remoteTimestamp
    };
    currentEtag = '"new-etag"';
    
    // Trigger manual sync
    await page.click('button:has-text("Sync")');
    
    // Wait for conflict dialog
    await expect(page.locator('[data-testid="sync-conflict-dialog"]')).toBeVisible({
      timeout: 10000
    });
    
    // Verify dialog content
    await expect(page.locator('[data-testid="sync-conflict-dialog"]')).toContainText('Sync Conflict Detected');
  });

  test('should resolve conflict by choosing local version', async ({ page }) => {
    // Set up conflict scenario
    const remoteMarkdown = `# Bookmarks

## Remote Category

### Remote Bundle`;
    
    // Start with remote data
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
    
    // Navigate and make local change
    await page.goto('/bookmarks');
    await page.waitForSelector('h4:has-text("Remote Bundle")');
    
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
    await page.click('button:has-text("Sync")');
    
    // Wait for conflict dialog
    await page.waitForSelector('[data-testid="sync-conflict-dialog"]');
    
    // Choose local version
    await page.click('button:has-text("Save Your Version")');
    
    // Wait for sync to complete
    await waitForSync(page);
    
    // Verify local version was saved
    expect(savedData).toBeTruthy();
    expect(savedData.files['bookmarks.md'].content).toContain('Local Category');
  });

  test('should resolve conflict by choosing remote version', async ({ page }) => {
    const remoteMarkdown = `# Bookmarks

## Remote Category

### Remote Bundle`;
    
    // Set up remote data
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
    
    // Make a local change
    await createBookmark(page, {
      url: 'https://local-bookmark.com',
      title: 'Local Bookmark'
    });
    
    // Update remote data to create conflict
    const updatedRemoteMarkdown = `# Bookmarks

## Remote Category

### Remote Bundle

- [Remote Bookmark](https://remote-bookmark.com)`;
    
    await mockGistAPI(page, {
      defaultGist: {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: updatedRemoteMarkdown
          }
        },
        updated_at: new Date(Date.now() + 1000).toISOString()
      }
    });
    
    // Trigger sync
    await page.click('button:has-text("Sync")');
    
    // Wait for conflict dialog
    await page.waitForSelector('[data-testid="sync-conflict-dialog"]');
    
    // Choose remote version
    await page.click('button:has-text("Load Remote Version")');
    
    // Wait for sync to complete
    await waitForSync(page);
    
    // Verify remote version is loaded
    await expect(page.locator('h4:has-text("Remote Bundle")')).toBeVisible();
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
            content: createTestBookmarkMarkdown()
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
            content: createTestBookmarkMarkdown()
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
    await page.click('button:has-text("Sync")');
    
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