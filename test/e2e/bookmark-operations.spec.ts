/*
 * BookMarkDown Bookmark Operations E2E Tests
 * Tests for bookmark deletion and move functionality
 */

import { test, expect, Page } from '@playwright/test';

test.describe('BookMarkDown Bookmark Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication  
    await page.addInitScript(() => {
      const authData = {
        user: {
          login: 'testuser',
          name: 'Test User',
          avatar_url: 'https://github.com/testuser.png'
        },
        token: 'test-token',
        lastSyncAt: new Date().toISOString()
      };
      localStorage.setItem('bookmark_auth', JSON.stringify(authData));
    });
    
    await page.goto('/bookmarks');
  });

  test('should delete a bookmark immediately from UI', async ({ page, isMobile }) => {
    // Skip on mobile due to different layout
    if (isMobile) {
      test.skip('Mobile layout differs from desktop');
    }
    
    // Create test data through UI
    // Create category
    await page.click('button:has-text("Add Category")');
    await page.fill('input#categoryName', 'Test Category');
    await page.click('button[type="submit"]:has-text("Create Category")');
    await page.waitForSelector('input#categoryName', { state: 'hidden' });
    
    // Create bundle
    await page.click('button[title="Add Bundle"]');
    await page.fill('input#bundleName', 'Test Bundle');
    await page.click('button[type="submit"]:has-text("Create Bundle")');
    await page.waitForSelector('input#bundleName', { state: 'hidden' });
    
    // Create first bookmark
    await page.click('button[title="Add Bookmark"]');
    await page.fill('input#bookmarkUrl', 'https://example1.com');
    await page.fill('input#bookmarkTitle', 'Test Bookmark 1');
    await page.click('button[type="submit"]:has-text("Add Bookmark")');
    await page.waitForSelector('input#bookmarkUrl', { state: 'hidden' });
    
    // Create second bookmark
    await page.click('button[title="Add Bookmark"]');
    await page.fill('input#bookmarkUrl', 'https://example2.com');
    await page.fill('input#bookmarkTitle', 'Test Bookmark 2');
    await page.click('button[type="submit"]:has-text("Add Bookmark")');
    await page.waitForSelector('input#bookmarkUrl', { state: 'hidden' });
    
    // Wait for bookmarks to be visible
    await page.waitForSelector('.bg-gray-50.rounded-lg.shadow-sm', { timeout: 5000 });
    
    // Verify bookmark exists by its title in h3
    const bookmark1Title = page.locator('h3').filter({ hasText: 'Test Bookmark 1' });
    await expect(bookmark1Title).toBeVisible();
    
    // Find the bookmark card containing this title
    const bookmark1Card = page.locator('.bg-gray-50.rounded-lg.shadow-sm').filter({ has: bookmark1Title });
    
    // Hover over the bookmark to show action buttons
    await bookmark1Card.hover();
    
    // Find and click the delete button (trash icon)
    const deleteButton = bookmark1Card.locator('button svg path[d*="M19 7l-.867 12.142"]').locator('../..');
    await deleteButton.click();
    
    // Confirm deletion in dialog
    const deleteDialog = page.locator('div').filter({ hasText: 'Delete Bookmark' }).first();
    if (await deleteDialog.isVisible({ timeout: 1000 })) {
      await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    }
    
    // Verify bookmark is immediately removed from UI
    await expect(bookmark1Title).not.toBeVisible();
    
    // Verify other bookmark still exists
    const bookmark2Title = page.locator('h3').filter({ hasText: 'Test Bookmark 2' });
    await expect(bookmark2Title).toBeVisible();
  });

  test.skip('should move a bookmark without duplication', async ({ page }) => {
    // Skip reason: react-dnd doesn't work well with Playwright's synthetic drag events
    // TODO: Find a way to test drag and drop with react-dnd
  });
  
  test.skip('should move a bundle without duplication', async ({ page }) => {
    // Skip reason: react-dnd doesn't work well with Playwright's synthetic drag events  
    // TODO: Find a way to test drag and drop with react-dnd
  });

  test('should handle multiple bookmark deletions', async ({ page, isMobile }) => {
    // Skip on mobile due to different layout
    if (isMobile) {
      test.skip('Mobile layout differs from desktop');
    }
    
    // Create test data through UI
    // Create category
    await page.click('button:has-text("Add Category")');
    await page.fill('input#categoryName', 'Test Category');
    await page.click('button[type="submit"]:has-text("Create Category")');
    await page.waitForSelector('input#categoryName', { state: 'hidden' });
    
    // Create bundle
    await page.click('button[title="Add Bundle"]');
    await page.fill('input#bundleName', 'Test Bundle');
    await page.click('button[type="submit"]:has-text("Create Bundle")');
    await page.waitForSelector('input#bundleName', { state: 'hidden' });
    
    // Create multiple bookmarks
    for (let i = 1; i <= 3; i++) {
      await page.click('button[title="Add Bookmark"]');
      await page.fill('input#bookmarkUrl', `https://example${i}.com`);
      await page.fill('input#bookmarkTitle', `Test Bookmark ${i}`);
      await page.click('button[type="submit"]:has-text("Add Bookmark")');
      await page.waitForSelector('input#bookmarkUrl', { state: 'hidden' });
    }
    
    // Wait for bookmarks to be visible
    await page.waitForSelector('.bg-gray-50.rounded-lg.shadow-sm', { timeout: 5000 });
    
    // Verify all bookmarks exist
    const bookmark1Title = page.locator('h3').filter({ hasText: 'Test Bookmark 1' });
    const bookmark2Title = page.locator('h3').filter({ hasText: 'Test Bookmark 2' });
    const bookmark3Title = page.locator('h3').filter({ hasText: 'Test Bookmark 3' });
    await expect(bookmark1Title).toBeVisible();
    await expect(bookmark2Title).toBeVisible();
    await expect(bookmark3Title).toBeVisible();
    
    // Delete first bookmark
    const bookmark1Card = page.locator('.bg-gray-50.rounded-lg.shadow-sm').filter({ has: bookmark1Title });
    await bookmark1Card.hover();
    await bookmark1Card.locator('button svg path[d*="M19 7l-.867 12.142"]').locator('../..').click();
    
    // Confirm deletion in dialog
    const deleteDialog1 = page.locator('div').filter({ hasText: 'Delete Bookmark' }).first();
    if (await deleteDialog1.isVisible({ timeout: 1000 })) {
      await deleteDialog1.getByRole('button', { name: 'Delete', exact: true }).click();
    }
    
    // Wait for deletion animation
    await expect(bookmark1Title).not.toBeVisible();
    
    // Delete second bookmark
    const bookmark2Card = page.locator('.bg-gray-50.rounded-lg.shadow-sm').filter({ has: bookmark2Title });
    await bookmark2Card.hover();
    await bookmark2Card.locator('button svg path[d*="M19 7l-.867 12.142"]').locator('../..').click();
    
    // Confirm deletion in dialog
    const deleteDialog2 = page.locator('div').filter({ hasText: 'Delete Bookmark' }).first();
    if (await deleteDialog2.isVisible({ timeout: 1000 })) {
      await deleteDialog2.getByRole('button', { name: 'Delete', exact: true }).click();
    }
    
    // Verify both bookmarks are deleted
    await expect(bookmark1Title).not.toBeVisible();
    await expect(bookmark2Title).not.toBeVisible();
    
    // Verify third bookmark still exists
    await expect(bookmark3Title).toBeVisible();
    
    // Verify category still exists
    const categoryHeader = page.locator('h3').filter({ hasText: 'Test Category' });
    await expect(categoryHeader).toBeVisible();
  });

  test.skip('should show visual feedback during move operations', async ({ page }) => {
    // Skip reason: react-dnd doesn't work well with Playwright's synthetic drag events
    // TODO: Find a way to test drag and drop with react-dnd
  });
});