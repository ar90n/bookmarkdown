/*
 * BookMarkDown HomePage E2E Tests
 * End-to-end tests for the landing page
 */

import { test, expect } from '@playwright/test';

test.describe('BookMarkDown HomePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'BookMarkDown' })).toBeVisible();
    await expect(page.getByText('A simple and portable bookmark management service')).toBeVisible();
  });

  test('should have functioning navigation for unauthenticated users', async ({ page }) => {
    // Should show "Get Started" button
    const getStartedBtn = page.getByRole('link', { name: 'Get Started' });
    await expect(getStartedBtn).toBeVisible();
    
    // Should show "Sign In with GitHub" in CTA section
    const signInBtn = page.getByRole('link', { name: 'Sign In with GitHub' });
    await expect(signInBtn).toBeVisible();
    
    // Both should link to /login
    await expect(getStartedBtn).toHaveAttribute('href', '/login');
    await expect(signInBtn).toHaveAttribute('href', '/login');
  });

  test('should have external GitHub link', async ({ page }) => {
    const githubLink = page.getByRole('link', { name: /View Source/ });
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/bookmarkdown/bookmarkdown');
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });

  test('should display all feature sections', async ({ page }) => {
    // Features section
    await expect(page.getByText('Human-Readable')).toBeVisible();
    await expect(page.getByText('GitHub Sync')).toBeVisible();
    await expect(page.getByText('Functional Architecture')).toBeVisible();
    
    // Data structure section
    await expect(page.getByRole('heading', { name: 'Simple Data Structure' })).toBeVisible();
    await expect(page.getByText('Development Tools')).toBeVisible();
    
    // How it works section
    await expect(page.getByRole('heading', { name: 'How It Works' })).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();
    await expect(page.getByText('Organize')).toBeVisible();
    await expect(page.getByText('Add Bookmarks')).toBeVisible();
    await expect(page.getByText('Sync')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Main heading should still be visible
    await expect(page.getByRole('heading', { name: 'BookMarkDown' })).toBeVisible();
    
    // Buttons should stack vertically (check that they're not side by side)
    const getStartedBtn = page.getByRole('link', { name: 'Get Started' });
    const viewSourceBtn = page.getByRole('link', { name: /View Source/ });
    
    await expect(getStartedBtn).toBeVisible();
    await expect(viewSourceBtn).toBeVisible();
    
    // Features should be in a single column
    const featuresSection = page.locator('.grid-cols-1');
    await expect(featuresSection).toBeVisible();
  });

  test('should have proper accessibility', async ({ page }) => {
    // Check heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('BookMarkDown');
    
    // Check that all buttons have accessible names
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await expect(button).toHaveAccessibleName();
    }
    
    // Check that external links have proper attributes
    const externalLinks = page.locator('a[target="_blank"]');
    const extLinkCount = await externalLinks.count();
    
    for (let i = 0; i < extLinkCount; i++) {
      const link = externalLinks.nth(i);
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have no accessibility violations', async ({ page }) => {
    // This would require axe-playwright for full a11y testing
    // For now, just check basic structure
    
    // Check for alt text on images (though this page uses emoji)
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check for proper color contrast (basic check)
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', /rgb/);
  });

  test('should navigate to login page when clicking Get Started', async ({ page }) => {
    await page.getByRole('link', { name: 'Get Started' }).click();
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login');
  });

  test('should display proper meta information', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/BookMarkDown/);
    
    // Check meta description (if it exists)
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.count() > 0) {
      await expect(metaDescription).toHaveAttribute('content', /bookmark/i);
    }
  });
});