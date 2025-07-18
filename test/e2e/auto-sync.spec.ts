import { test, expect } from '@playwright/test';
import { setupAuth, setupGistId, setupAutoSync, mockGistAPI, createBookmark, waitForSync, createTestBookmarkMarkdown, waitForInitialLoad } from './test-helpers';

test.describe('Auto-sync functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await setupAuth(page);
    
    // Set up a default gist
    await setupGistId(page, 'test-gist-123');
    
    // Mock Gist API with Markdown content
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

  test('should auto-sync when enabled and making changes', async ({ page }) => {
    // Enable auto-sync
    await setupAutoSync(page, true);
    
    // Track API calls
    let syncCallCount = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        syncCallCount++;
      }
      await route.continue();
    });
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Wait for initial load
    await waitForInitialLoad(page);
    
    // Wait for Test Category to be visible
    await page.waitForSelector('text="Test Category"', { timeout: 15000 });
    
    // Make a change - add a new bookmark
    await createBookmark(page, {
      category: 'Test Category',
      bundle: 'Test Bundle',
      url: 'https://new-bookmark.com',
      title: 'New Auto-synced Bookmark'
    });
    
    // Wait for debounced auto-sync (usually 1 second)
    await page.waitForTimeout(1500);
    
    // Verify sync was triggered
    expect(syncCallCount).toBeGreaterThan(0);
    
    // Verify sync status shows completion
    await expect(page.locator('text=/Synced|Last sync/')).toBeVisible({ timeout: 5000 });
  });

  test('should not auto-sync when disabled', async ({ page }) => {
    // Disable auto-sync
    await setupAutoSync(page, false);
    
    // Track API calls
    let syncCallCount = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        syncCallCount++;
      }
      await route.continue();
    });
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Wait for initial load
    await waitForInitialLoad(page);
    
    // Wait for Test Category to be visible
    await page.waitForSelector('text="Test Category"', { timeout: 15000 });
    
    // Make a change
    await createBookmark(page, {
      category: 'Test Category',
      bundle: 'Test Bundle',
      url: 'https://no-sync.com',
      title: 'No Auto-sync Bookmark'
    });
    
    // Wait to ensure no sync happens
    await page.waitForTimeout(2000);
    
    // Verify no sync was triggered
    expect(syncCallCount).toBe(0);
  });

  test('should toggle auto-sync from settings', async ({ page }) => {
    // Start with auto-sync disabled
    await setupAutoSync(page, false);
    
    // Navigate to settings
    await page.goto('/settings');
    
    // Wait for settings page to load
    await page.waitForSelector('h1:has-text("Settings")');
    
    // Find auto-sync toggle
    const autoSyncToggle = page.locator('input#auto-sync');
    
    // Verify initial state
    await expect(autoSyncToggle).not.toBeChecked();
    
    // Enable auto-sync
    await autoSyncToggle.click();
    
    // Verify toggle is now checked
    await expect(autoSyncToggle).toBeChecked();
    
    // Navigate to bookmarks
    await page.goto('/bookmarks');
    
    // Track sync calls
    let syncCallCount = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        syncCallCount++;
      }
      await route.continue();
    });
    
    // Make a change
    await createBookmark(page, {
      url: 'https://toggle-test.com',
      title: 'Toggle Test Bookmark'
    });
    
    // Wait for auto-sync
    await page.waitForTimeout(1500);
    
    // Verify sync happened
    expect(syncCallCount).toBeGreaterThan(0);
  });

  test('should debounce multiple rapid changes', async ({ page }) => {
    // Enable auto-sync
    await setupAutoSync(page, true);
    
    // Track API calls with timestamps
    const syncCalls: number[] = [];
    await page.route('https://api.github.com/gists/test-gist-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        syncCalls.push(Date.now());
      }
      await route.continue();
    });
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Wait for initial load
    await page.waitForSelector('button:has-text("Add Category")');
    
    // Make multiple rapid changes
    for (let i = 1; i <= 3; i++) {
      await createBookmark(page, {
        url: `https://rapid-${i}.com`,
        title: `Rapid Bookmark ${i}`
      });
      // Small delay between operations but within debounce window
      await page.waitForTimeout(300);
    }
    
    // Wait for debounced sync
    await page.waitForTimeout(2000);
    
    // Should only sync once (or maybe twice if timing is off)
    expect(syncCalls.length).toBeLessThanOrEqual(2);
    expect(syncCalls.length).toBeGreaterThan(0);
  });

  test('should show sync status during auto-sync', async ({ page }) => {
    // Enable auto-sync
    await setupAutoSync(page, true);
    
    // Add delay to API calls to see status
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
      delayMs: 1000 // 1 second delay
    });
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Make a change
    await createBookmark(page, {
      url: 'https://status-test.com',
      title: 'Status Test Bookmark'
    });
    
    // Check for syncing status (if visible)
    const syncingStatus = page.locator('text=/Syncing|Saving/');
    if (await syncingStatus.isVisible({ timeout: 2000 })) {
      // Wait for sync to complete
      await waitForSync(page);
    }
    
    // Verify sync completed
    await expect(page.locator('text=/Synced|Last sync/')).toBeVisible({ timeout: 5000 });
  });

  test('should handle auto-sync errors gracefully', async ({ page }) => {
    // Enable auto-sync
    await setupAutoSync(page, true);
    
    // Mock API to fail
    await mockGistAPI(page, {
      failRequests: true
    });
    
    // Navigate to bookmarks page
    await page.goto('/bookmarks');
    
    // Make a change
    await createBookmark(page, {
      url: 'https://error-test.com',
      title: 'Error Test Bookmark'
    });
    
    // Wait for sync attempt
    await page.waitForTimeout(2000);
    
    // Should show error status or notification
    const errorIndicators = [
      page.locator('text=/Error|Failed|Problem/i'),
      page.locator('.text-red-500, .text-red-600, .bg-red-50') // Common error styling
    ];
    
    // Check if any error indicator is visible
    let hasError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.isVisible({ timeout: 1000 })) {
        hasError = true;
        break;
      }
    }
    
    expect(hasError).toBeTruthy();
  });
});