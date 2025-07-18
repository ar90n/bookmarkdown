import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { setupAuth, setupGistId, mockGistAPI, createBookmark, createTestBookmarkData } from './test-helpers';

test.describe('Cross-tab synchronization', () => {
  let browser: Browser;
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeEach(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    
    // Create two separate contexts (like different browser windows)
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    
    // Create pages in each context
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    // Set up both pages with same auth and gist
    for (const page of [page1, page2]) {
      await setupAuth(page);
      await setupGistId(page, 'test-gist-123');
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
    }
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('should sync changes between tabs via BroadcastChannel', async () => {
    // Open bookmarks in both tabs
    await page1.goto('/bookmarks');
    await page2.goto('/bookmarks');
    
    // Wait for initial load in both tabs
    await page1.waitForSelector('h3:has-text("Test Category")');
    await page2.waitForSelector('h3:has-text("Test Category")');
    
    // Create a bookmark in tab 1
    await createBookmark(page1, {
      category: 'Test Category',
      bundle: 'Test Bundle',
      url: 'https://cross-tab.com',
      title: 'Cross-tab Bookmark'
    });
    
    // Wait for the bookmark to appear in tab 1
    await expect(page1.locator('text="Cross-tab Bookmark"')).toBeVisible();
    
    // Wait a moment for BroadcastChannel message
    await page2.waitForTimeout(500);
    
    // Check if bookmark appears in tab 2 without refresh
    await expect(page2.locator('text="Cross-tab Bookmark"')).toBeVisible({
      timeout: 5000
    });
  });

  test('should sync category changes between tabs', async () => {
    // Open bookmarks in both tabs
    await page1.goto('/bookmarks');
    await page2.goto('/bookmarks');
    
    // Wait for initial load
    await page1.waitForSelector('h3:has-text("Test Category")');
    await page2.waitForSelector('h3:has-text("Test Category")');
    
    // Add a new category in tab 1
    await page1.click('button:has-text("Add Category")');
    await page1.fill('input#categoryName', 'New Shared Category');
    await page1.click('button[type="submit"]:has-text("Create Category")');
    
    // Wait for category to appear in tab 1
    await expect(page1.locator('h3:has-text("New Shared Category")')).toBeVisible();
    
    // Check if category appears in tab 2
    await expect(page2.locator('h3:has-text("New Shared Category")')).toBeVisible({
      timeout: 5000
    });
  });

  test('should sync bookmark deletions between tabs', async () => {
    // Open bookmarks in both tabs
    await page1.goto('/bookmarks');
    await page2.goto('/bookmarks');
    
    // Wait for initial bookmarks
    await page1.waitForSelector('text="Test Bookmark 1"');
    await page2.waitForSelector('text="Test Bookmark 1"');
    
    // Delete bookmark in tab 1
    const bookmark1Card = page1.locator('.bg-gray-50.rounded-lg.shadow-sm').filter({ 
      has: page1.locator('h3:has-text("Test Bookmark 1")') 
    });
    await bookmark1Card.hover();
    await bookmark1Card.locator('button svg path[d*="M19 7l-.867 12.142"]').locator('../..').click();
    
    // Confirm deletion
    const deleteDialog = page1.locator('div').filter({ hasText: 'Delete Bookmark' }).first();
    if (await deleteDialog.isVisible({ timeout: 1000 })) {
      await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    }
    
    // Verify deletion in tab 1
    await expect(page1.locator('text="Test Bookmark 1"')).not.toBeVisible();
    
    // Verify deletion propagated to tab 2
    await expect(page2.locator('text="Test Bookmark 1"')).not.toBeVisible({
      timeout: 5000
    });
  });

  test('should handle rapid changes across multiple tabs', async () => {
    // Open bookmarks in both tabs
    await page1.goto('/bookmarks');
    await page2.goto('/bookmarks');
    
    // Wait for initial load
    await page1.waitForSelector('button:has-text("Add Category")');
    await page2.waitForSelector('button:has-text("Add Category")');
    
    // Make rapid changes in both tabs
    const changes = [
      { page: page1, title: 'Tab1 Bookmark 1', url: 'https://tab1-1.com' },
      { page: page2, title: 'Tab2 Bookmark 1', url: 'https://tab2-1.com' },
      { page: page1, title: 'Tab1 Bookmark 2', url: 'https://tab1-2.com' },
      { page: page2, title: 'Tab2 Bookmark 2', url: 'https://tab2-2.com' },
    ];
    
    // Create bookmarks rapidly
    for (const change of changes) {
      await createBookmark(change.page, {
        url: change.url,
        title: change.title
      });
      await change.page.waitForTimeout(200); // Small delay between operations
    }
    
    // Wait for all changes to propagate
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);
    
    // Verify all bookmarks appear in both tabs
    for (const change of changes) {
      await expect(page1.locator(`text="${change.title}"`)).toBeVisible();
      await expect(page2.locator(`text="${change.title}"`)).toBeVisible();
    }
  });

  test('should maintain consistency when one tab goes offline', async () => {
    // Open bookmarks in both tabs
    await page1.goto('/bookmarks');
    await page2.goto('/bookmarks');
    
    // Wait for initial load
    await page1.waitForSelector('h3:has-text("Test Category")');
    await page2.waitForSelector('h3:has-text("Test Category")');
    
    // Simulate tab 2 going offline
    await page2.context().setOffline(true);
    
    // Make changes in tab 1
    await createBookmark(page1, {
      url: 'https://offline-test.com',
      title: 'Offline Test Bookmark'
    });
    
    // Verify bookmark in tab 1
    await expect(page1.locator('text="Offline Test Bookmark"')).toBeVisible();
    
    // Tab 2 should not receive the update while offline
    await page2.waitForTimeout(1000);
    await expect(page2.locator('text="Offline Test Bookmark"')).not.toBeVisible();
    
    // Bring tab 2 back online
    await page2.context().setOffline(false);
    
    // Refresh tab 2 to sync
    await page2.reload();
    
    // Now tab 2 should have the bookmark
    await expect(page2.locator('text="Offline Test Bookmark"')).toBeVisible();
  });

  test('should handle BroadcastChannel message errors gracefully', async () => {
    // Inject a script to override BroadcastChannel with error simulation
    await page1.addInitScript(() => {
      const OriginalBroadcastChannel = window.BroadcastChannel;
      let messageCount = 0;
      
      window.BroadcastChannel = class extends OriginalBroadcastChannel {
        postMessage(message: any) {
          messageCount++;
          // Simulate error on every 3rd message
          if (messageCount % 3 === 0) {
            throw new Error('BroadcastChannel error');
          }
          super.postMessage(message);
        }
      } as any;
    });
    
    // Open bookmarks in both tabs
    await page1.goto('/bookmarks');
    await page2.goto('/bookmarks');
    
    // Make multiple changes
    for (let i = 1; i <= 4; i++) {
      await createBookmark(page1, {
        url: `https://error-test-${i}.com`,
        title: `Error Test ${i}`
      });
      await page1.waitForTimeout(500);
    }
    
    // Despite some broadcast errors, local changes should still work
    for (let i = 1; i <= 4; i++) {
      await expect(page1.locator(`text="Error Test ${i}"`)).toBeVisible();
    }
    
    // Some messages might have gotten through to tab 2
    // At least one bookmark should be visible
    const visibleBookmarks = await page2.locator('text=/Error Test \\d+/').count();
    expect(visibleBookmarks).toBeGreaterThan(0);
  });
});