import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for BookMarkDown E2E Tests
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './test/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Global timeout */
  timeout: process.env.CI ? 60000 : 30000,
  expect: {
    timeout: process.env.CI ? 10000 : 5000,
  },
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [['dot'], ['github']] : 'html',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://127.0.0.1:3000' : 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take a screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Set timeout for CI */
    actionTimeout: process.env.CI ? 30000 : 10000,
    navigationTimeout: process.env.CI ? 30000 : 30000,
  },

  /* Configure projects for major browsers */
  projects: process.env.CI ? [
    // Only test on core browsers in CI for faster feedback
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ] : [
    // Full browser matrix for local testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI ? 'npm run build:web && npm run preview:web' : 'npm run dev:web',
    url: process.env.CI ? 'http://127.0.0.1:3000' : 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180 * 1000 : 120 * 1000, // 3 minutes for CI
    env: {
      CI: process.env.CI ? 'true' : '',
    },
  },
});