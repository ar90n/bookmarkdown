import { test, expect } from '@playwright/test';

test.describe('Dialog Operations', () => {
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

  test.describe('Form Input and Submission', () => {
    test('should allow typing in dialog input fields', async ({ page }) => {
      // Open category dialog
      await page.click('button:has-text("Add Category")');
      
      // Wait for dialog
      await page.waitForSelector('input#categoryName');
      
      // Type in the input field
      const input = page.locator('input#categoryName');
      await input.fill('Test Category Name');
      
      // Verify the input value
      await expect(input).toHaveValue('Test Category Name');
    });

    test('should submit form using submit button with form attribute', async ({ page }) => {
      // Open category dialog
      await page.click('button:has-text("Add Category")');
      
      // Fill form
      await page.fill('input#categoryName', 'Submit Test Category');
      
      // Submit using button (which has form attribute)
      await page.click('button[type="submit"]:has-text("Create Category")');
      
      // Verify dialog closed
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Verify category was created
      await expect(page.locator('h3:has-text("Submit Test Category")')).toBeVisible();
    });

    test('should submit form using Enter key', async ({ page }) => {
      // Open category dialog
      await page.click('button:has-text("Add Category")');
      
      // Fill form
      await page.fill('input#categoryName', 'Enter Key Category');
      
      // Submit using Enter key
      await page.press('input#categoryName', 'Enter');
      
      // Verify dialog closed
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Verify category was created
      await expect(page.locator('h3:has-text("Enter Key Category")')).toBeVisible();
    });

    test('should disable submit button when required fields are empty', async ({ page }) => {
      // Open category dialog
      await page.click('button:has-text("Add Category")');
      
      // Check submit button is disabled initially
      const submitButton = page.locator('button[type="submit"]:has-text("Create Category")');
      await expect(submitButton).toBeDisabled();
      
      // Type something and clear it
      await page.fill('input#categoryName', 'Test');
      await expect(submitButton).not.toBeDisabled();
      
      await page.fill('input#categoryName', '');
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Category Operations', () => {
    test('should create a new category', async ({ page }) => {
      // Open category dialog
      await page.click('button:has-text("Add Category")');
      
      // Fill and submit
      await page.fill('input#categoryName', 'New Test Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      
      // Wait for dialog to close
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Verify category appears
      await expect(page.locator('h3:has-text("New Test Category")')).toBeVisible();
    });

    test('should prevent duplicate category creation', async ({ page }) => {
      // Create first category
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'Duplicate Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Try to create duplicate
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'Duplicate Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      
      // Should see error
      await expect(page.locator('text=/Category.*already exists/i').first()).toBeVisible();
      
      // Close dialog if still open
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
      
      // Wait for UI to settle
      await page.waitForTimeout(500);
      
      // Verify only one category exists
      const categoryCount = await page.locator('h3:has-text("Duplicate Category")').count();
      expect(categoryCount).toBe(1);
    });

    test('should validate category name length', async ({ page }) => {
      // Open category dialog
      await page.click('button:has-text("Add Category")');
      
      // Try with too short name
      await page.fill('input#categoryName', 'A');
      await page.click('button[type="submit"]:has-text("Create Category")');
      
      // Should see validation error
      await expect(page.locator('text=/at least 2 characters/i')).toBeVisible();
      
      // Fill valid name
      await page.fill('input#categoryName', 'Valid Category Name');
      await page.click('button[type="submit"]:has-text("Create Category")');
      
      // Should succeed
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      await expect(page.locator('h3:has-text("Valid Category Name")')).toBeVisible();
    });
  });

  test.describe('Bundle Operations', () => {
    test('should create a new bundle', async ({ page }) => {
      // First create a category
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'Bundle Test Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Create bundle
      await page.click('button[title="Add Bundle"]');
      await page.fill('input#bundleName', 'New Test Bundle');
      await page.click('button[type="submit"]:has-text("Create Bundle")');
      await page.waitForSelector('input#bundleName', { state: 'hidden' });
      
      // Verify bundle appears
      await expect(page.locator('h4:has-text("New Test Bundle")')).toBeVisible();
    });

    test('should prevent duplicate bundle creation', async ({ page }) => {
      // Create category
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'Duplicate Bundle Test');
      await page.click('button[type="submit"]:has-text("Create Category")');
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Create first bundle
      await page.click('button[title="Add Bundle"]');
      await page.fill('input#bundleName', 'Duplicate Bundle');
      await page.click('button[type="submit"]:has-text("Create Bundle")');
      await page.waitForSelector('input#bundleName', { state: 'hidden' });
      
      // Try to create duplicate
      await page.click('button[title="Add Bundle"]');
      await page.fill('input#bundleName', 'Duplicate Bundle');
      await page.click('button[type="submit"]:has-text("Create Bundle")');
      
      // Should see error
      await expect(page.locator('text=/Bundle.*already exists/i').first()).toBeVisible();
      
      // Close dialog if still open
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
      
      // Wait for UI to settle
      await page.waitForTimeout(500);
      
      // Verify only one bundle exists
      const bundleCount = await page.locator('h4:has-text("Duplicate Bundle")').count();
      expect(bundleCount).toBe(1);
    });

    test('should show category context in bundle dialog', async ({ page }) => {
      // Create category
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'Context Test Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      // Open bundle dialog
      await page.click('button[title="Add Bundle"]');
      
      // Verify category context is shown
      await expect(page.locator('text=In category: Context Test Category')).toBeVisible();
    });
  });

  test.describe('Bookmark Dialog', () => {
    test('should allow input in bookmark dialog fields', async ({ page }) => {
      // Create category and bundle first
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'Bookmark Test Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      await page.click('button[title="Add Bundle"]');
      await page.fill('input#bundleName', 'Bookmark Test Bundle');
      await page.click('button[type="submit"]:has-text("Create Bundle")');
      await page.waitForSelector('input#bundleName', { state: 'hidden' });
      
      // Open bookmark dialog
      await page.click('button[title="Add Bookmark"]');
      
      // Test all input fields
      await page.fill('input#bookmarkUrl', 'https://example.com');
      await page.fill('input#bookmarkTitle', 'Test Bookmark Title');
      await page.fill('input#bookmarkTags', 'test, example, bookmark');
      await page.fill('textarea#bookmarkNotes', 'This is a test note for the bookmark');
      
      // Verify values
      await expect(page.locator('input#bookmarkUrl')).toHaveValue('https://example.com');
      await expect(page.locator('input#bookmarkTitle')).toHaveValue('Test Bookmark Title');
      await expect(page.locator('input#bookmarkTags')).toHaveValue('test, example, bookmark');
      await expect(page.locator('textarea#bookmarkNotes')).toHaveValue('This is a test note for the bookmark');
      
      // Submit
      await page.click('button[type="submit"]:has-text("Add Bookmark")');
      await page.waitForSelector('input#bookmarkUrl', { state: 'hidden' });
      
      // Verify bookmark was created
      await expect(page.locator('h3:has-text("Test Bookmark Title")')).toBeVisible();
    });

    test('should validate URL format', async ({ page }) => {
      // Setup category and bundle
      await page.click('button:has-text("Add Category")');
      await page.fill('input#categoryName', 'URL Validation Category');
      await page.click('button[type="submit"]:has-text("Create Category")');
      await page.waitForSelector('input#categoryName', { state: 'hidden' });
      
      await page.click('button[title="Add Bundle"]');
      await page.fill('input#bundleName', 'URL Validation Bundle');
      await page.click('button[type="submit"]:has-text("Create Bundle")');
      await page.waitForSelector('input#bundleName', { state: 'hidden' });
      
      // Open bookmark dialog
      await page.click('button[title="Add Bookmark"]');
      
      // Try invalid URL
      await page.fill('input#bookmarkUrl', 'not-a-url');
      await page.fill('input#bookmarkTitle', 'Test Title');
      
      // Check that the submit button is still enabled (client-side validation might not disable it)
      const submitButton = page.locator('button[type="submit"]:has-text("Add Bookmark")');
      
      // Try to submit
      await submitButton.click();
      
      // The form should not close due to validation error
      await page.waitForTimeout(500);
      await expect(page.locator('input#bookmarkUrl')).toBeVisible();
      
      // Fix URL
      await page.fill('input#bookmarkUrl', 'https://valid-url.com');
      await submitButton.click();
      
      // Should succeed now
      await page.waitForSelector('input#bookmarkUrl', { state: 'hidden' });
    });
  });
});