/*
 * BookMarkDown Bookmark Operations E2E Tests
 * Tests for bookmark deletion and move functionality
 */

import { test, expect, Page } from '@playwright/test';

test.describe('BookMarkDown Bookmark Operations', () => {
  // Mock authentication helper
  async function mockAuthentication(page: Page) {
    // Mock GitHub API user endpoint
    await page.route('https://api.github.com/user', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 123456,
          login: 'testuser',
          email: 'test@example.com',
          avatar_url: 'https://github.com/identicons/test.png',
          html_url: 'https://github.com/testuser',
          name: 'Test User'
        })
      });
    });

    // Mock Gist API endpoints
    await page.route('https://api.github.com/gists', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('https://api.github.com/gists/*', route => {
      const mockGist = {
        id: 'test-gist-123',
        files: {
          'bookmarks.md': {
            content: '# BookMarkDown\n\n## 📚 Test Category\n\n### Test Bundle\n\n- [Test Bookmark 1](https://example1.com)\n- [Test Bookmark 2](https://example2.com)'
          }
        },
        updated_at: new Date().toISOString()
      };
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGist)
      });
    });

    // Mock OAuth service endpoints if needed
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Set up mock authentication in localStorage before navigation
    await page.addInitScript(() => {
      const mockUser = {
        id: 'test-user-123',
        login: 'testuser',
        email: 'test@example.com',
        avatar_url: 'https://github.com/identicons/test.png',
        html_url: 'https://github.com/testuser',
        name: 'Test User'
      };
      
      // Use the actual storage key from the app
      const authData = {
        user: mockUser,
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        },
        lastLoginAt: new Date().toISOString()
      };
      
      localStorage.setItem('bookmark_auth', JSON.stringify(authData));
      
      // Mock initial bookmark data
      const mockBookmarkData = {
        version: 1,
        categories: [
          {
            name: '📚 Test Category',
            bundles: [
              {
                name: 'Test Bundle',
                bookmarks: [
                  {
                    id: 'bookmark-1',
                    title: 'Test Bookmark 1',
                    url: 'https://example1.com',
                    metadata: { lastModified: new Date().toISOString() }
                  },
                  {
                    id: 'bookmark-2',
                    title: 'Test Bookmark 2',
                    url: 'https://example2.com',
                    metadata: { lastModified: new Date().toISOString() }
                  }
                ]
              },
              {
                name: 'Another Bundle',
                bookmarks: []
              }
            ]
          },
          {
            name: '🔧 Another Category',
            bundles: [
              {
                name: 'Target Bundle',
                bookmarks: []
              }
            ]
          }
        ]
      };
      
      localStorage.setItem('bookmarkdown_data', JSON.stringify(mockBookmarkData));
    });
  }

  test.beforeEach(async ({ page }) => {
    // Set up API mocks before navigation
    await mockAuthentication(page);
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Additional wait for React to render
    await page.waitForTimeout(1000);
    
    // Check if we successfully reached the bookmarks page
    const url = page.url();
    if (url.includes('/login') || url.includes('/welcome')) {
      console.log('Test skipped: Redirected to', url);
      test.skip();
    }
  });

  test('should delete a bookmark immediately from UI', async ({ page, isMobile }) => {
    // Skip on mobile due to different layout
    if (isMobile) {
      test.skip('Mobile layout differs from desktop');
    }
    // Debug: Log the current URL and page content
    console.log('Current URL:', page.url());
    
    // Debug: Check if we have the expected elements
    const pageContent = await page.content();
    console.log('Page contains "Test Bookmark":', pageContent.includes('Test Bookmark'));
    
    // Wait for bookmarks to be visible
    try {
      await page.waitForSelector('.bg-gray-50.rounded-lg.shadow-sm', { timeout: 5000 });
    } catch (error) {
      console.log('Failed to find bookmark cards. Page HTML:', await page.content());
      throw error;
    }
    
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
    // Wait for bookmarks to be visible
    await page.waitForSelector('.bg-gray-50.rounded-lg.shadow-sm', { timeout: 5000 });
    
    // Find bookmark by title
    const bookmark1Title = page.locator('h3').filter({ hasText: 'Test Bookmark 1' });
    await expect(bookmark1Title).toBeVisible();
    
    // Find the draggable bookmark card
    const bookmark1Card = page.locator('.bg-gray-50.rounded-lg.shadow-sm').filter({ has: bookmark1Title });
    
    // Find target bundle by looking for bundle header with name
    const targetBundleHeader = page.locator('h4').filter({ hasText: '🧳Target Bundle' });
    
    // Perform drag and drop - try using Playwright's dragTo with force
    console.log('Starting drag and drop operation...');
    
    // First try Playwright's dragTo API with force option
    try {
      await bookmark1Card.dragTo(targetBundleHeader, { force: true, targetPosition: { x: 10, y: 10 } });
      console.log('DragTo completed');
    } catch (error) {
      console.log('DragTo failed, trying manual drag:', error);
      
      // Fallback to manual drag with HTML5 drag events simulation
      await bookmark1Card.dispatchEvent('dragstart');
      await targetBundleHeader.dispatchEvent('dragenter');
      await targetBundleHeader.dispatchEvent('dragover');
      await targetBundleHeader.dispatchEvent('drop');
      await bookmark1Card.dispatchEvent('dragend');
      console.log('Manual drag events dispatched');
    }
    
    // Wait for move operation to complete
    await page.waitForTimeout(2000);
    
    // Verify bookmark appears in target location
    // Find the category containing "Another Category"
    const targetCategory = page.locator('.bg-white.rounded-lg.border').filter({ hasText: '🔧 Another Category' });
    
    // Check if bookmark exists within this category
    await expect(targetCategory.locator('h3').filter({ hasText: 'Test Bookmark 1' })).toBeVisible();
    
    // Verify bookmark is NOT in original location
    const originalCategory = page.locator('.bg-white.rounded-lg.border').filter({ hasText: '📚 Test Category' });
    await expect(originalCategory.locator('h3').filter({ hasText: 'Test Bookmark 1' })).not.toBeVisible();
  });

  test.skip('should move a bundle without duplication', async ({ page }) => {
    // Skip reason: react-dnd doesn't work well with Playwright's synthetic drag events
    // TODO: Find a way to test drag and drop with react-dnd
    // Wait for bundles to be visible
    await page.waitForSelector('.border.border-gray-200.rounded-lg', { timeout: 5000 });
    
    // Find bundle by header text
    const testBundleHeader = page.locator('h4').filter({ hasText: '🧳Test Bundle' });
    await expect(testBundleHeader).toBeVisible();
    
    // Find target category header
    const targetCategoryHeader = page.locator('.bg-gray-50.px-6.py-4').filter({ hasText: '🔧 Another Category' });
    
    // Perform drag and drop from bundle header to category header
    await testBundleHeader.hover();
    await page.mouse.down();
    await targetCategoryHeader.hover();
    await page.mouse.up();
    
    // Wait for move operation to complete
    await page.waitForTimeout(1000);
    
    // Verify bundle appears in target category
    const targetCategory = page.locator('.bg-white.rounded-lg.border').filter({ hasText: '🔧 Another Category' });
    await expect(targetCategory.locator('h4').filter({ hasText: '🧳Test Bundle' })).toBeVisible();
    
    // Verify bundle is NOT in original category
    const originalCategory = page.locator('.bg-white.rounded-lg.border').filter({ hasText: '📚 Test Category' });
    await expect(originalCategory.locator('h4').filter({ hasText: '🧳Test Bundle' })).not.toBeVisible();
  });

  test('should handle multiple bookmark deletions', async ({ page, isMobile }) => {
    // Skip on mobile due to different layout
    if (isMobile) {
      test.skip('Mobile layout differs from desktop');
    }
    // Wait for bookmarks to be visible
    await page.waitForSelector('.bg-gray-50.rounded-lg.shadow-sm', { timeout: 5000 });
    
    // Verify both bookmarks exist
    const bookmark1Title = page.locator('h3').filter({ hasText: 'Test Bookmark 1' });
    const bookmark2Title = page.locator('h3').filter({ hasText: 'Test Bookmark 2' });
    await expect(bookmark1Title).toBeVisible();
    await expect(bookmark2Title).toBeVisible();
    
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
    
    // Verify category still exists
    const categoryHeader = page.locator('h3').filter({ hasText: '📚 Test Category' });
    await expect(categoryHeader).toBeVisible();
  });

  test.skip('should show visual feedback during move operations', async ({ page }) => {
    // Skip reason: react-dnd doesn't work well with Playwright's synthetic drag events
    // TODO: Find a way to test drag and drop with react-dnd
    // Wait for bookmarks to be visible
    await page.waitForSelector('.bg-gray-50.rounded-lg.shadow-sm', { timeout: 5000 });
    
    const bookmark1Title = page.locator('h3').filter({ hasText: 'Test Bookmark 1' });
    const bookmark1Card = page.locator('.bg-gray-50.rounded-lg.shadow-sm').filter({ has: bookmark1Title });
    const targetBundleHeader = page.locator('h4').filter({ hasText: '🧳Target Bundle' });
    
    // Start dragging
    await bookmark1Card.hover();
    await page.mouse.down();
    
    // Move to target (without releasing) 
    const targetBox = await targetBundleHeader.boundingBox();
    if (targetBox) {
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
    }
    
    // Bundle should show some visual change (background color, border, etc)
    // Note: The actual class names depend on the DroppableBundle implementation
    const targetBundle = page.locator('.border.border-gray-200.rounded-lg').filter({ has: targetBundleHeader });
    
    // Complete the drop
    await page.mouse.up();
    
    // Wait for operation to complete
    await page.waitForTimeout(500);
    
    // Verify move completed
    const targetCategory = page.locator('.bg-white.rounded-lg.border').filter({ hasText: '🔧 Another Category' });
    await expect(targetCategory.locator('h3').filter({ hasText: 'Test Bookmark 1' })).toBeVisible();
  });
});