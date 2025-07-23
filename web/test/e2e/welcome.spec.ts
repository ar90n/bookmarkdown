/*
 * BookMarkDown Welcome Page E2E Tests
 * End-to-end tests for the welcome/landing page
 */

import { test, expect } from '@playwright/test';

test.describe('BookMarkDown Welcome Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/welcome');
  });

  test('should display the main heading and description', async ({ page }) => {
    // Get the main heading within the main content area
    await expect(page.getByRole('main').getByRole('heading', { name: 'BookMarkDown' })).toBeVisible();
    await expect(page.getByText('A simple, powerful bookmark manager')).toBeVisible();
  });

  test('should have functioning navigation for unauthenticated users', async ({ page }) => {
    // Should show "Get Started" button that links to login
    const getStartedBtn = page.getByRole('link', { name: 'Get Started' });
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toHaveAttribute('href', '/login');
  });

  test('should display all feature sections', async ({ page }) => {
    // Features section - use more specific selectors to avoid ambiguity
    await expect(page.getByRole('heading', { name: 'Markdown Format' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GitHub Sync' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Organized Structure' })).toBeVisible();
    
    // How it works section
    await expect(page.getByRole('heading', { name: 'How It Works' })).toBeVisible();
    // Use more specific selector for "Sign In" heading in How It Works section
    await expect(page.getByRole('heading', { name: 'Sign In', level: 3 })).toBeVisible();
    await expect(page.getByText('Add Bookmarks')).toBeVisible();
    await expect(page.getByText('Auto Sync')).toBeVisible();
    await expect(page.getByText('Access Anywhere')).toBeVisible();
    
    // Example structure section
    await expect(page.getByRole('heading', { name: 'Example Bookmark Structure' })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Main heading should still be visible
    await expect(page.getByRole('main').getByRole('heading', { name: 'BookMarkDown' })).toBeVisible();
    
    // Get Started button should be visible
    const getStartedBtn = page.getByRole('link', { name: 'Get Started' });
    await expect(getStartedBtn).toBeVisible();
    
    // Features should be responsive - use heading selector
    await expect(page.getByRole('heading', { name: 'Markdown Format' })).toBeVisible();
  });

  test('should have proper accessibility', async ({ page }) => {
    // Check heading hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('BookMarkDown');
    
    // Check that link has accessible name
    const getStartedLink = page.getByRole('link', { name: 'Get Started' });
    await expect(getStartedLink).toHaveAccessibleName('Get Started');
  });

  test('should navigate to login page when clicking Get Started', async ({ page }) => {
    await page.getByRole('link', { name: 'Get Started' }).click();
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login');
  });

  test('should redirect from root to welcome for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/welcome');
  });

  test('should display proper meta information', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/BookMarkDown/);
  });
  
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/welcome');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});