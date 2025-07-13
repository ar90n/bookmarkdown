/*
 * BookMarkDown Remote Change Detection E2E Tests
 * Tests for automatic remote change detection functionality
 */

import { test, expect, Page, ConsoleMessage } from '@playwright/test';

test.describe('Remote Change Detection', () => {
  let consoleLogs: string[] = [];
  let etagCounter = 1;
  let hasRemoteChanges = false;

  // Skip these tests if not using V2 context
  test.skip(!process.env.VITE_USE_V2_CONTEXT, 'RemoteChangeDetector only available in V2 context');

  // Helper to mock authentication and API
  async function setupMocks(page: Page) {
    // Capture console logs
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

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

    // Mock Gist list API
    await page.route('https://api.github.com/gists', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-gist-123',
          description: 'BookMarkDown - Bookmark Collection',
          files: {
            'bookmarks.md': {
              filename: 'bookmarks.md'
            }
          }
        }])
      });
    });

    // Mock individual Gist API with etag support
    await page.route('https://api.github.com/gists/test-gist-123', async route => {
      const request = route.request();
      const ifNoneMatch = request.headers()['if-none-match'];
      const currentEtag = `"etag-${etagCounter}"`;

      // If client has the current etag and no changes, return 304
      if (ifNoneMatch === currentEtag && !hasRemoteChanges) {
        await route.fulfill({
          status: 304,
          headers: {
            'etag': currentEtag
          }
        });
        return;
      }

      // Otherwise return the gist data
      await route.fulfill({
        status: 200,
        headers: {
          'etag': currentEtag
        },
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-gist-123',
          files: {
            'bookmarks.md': {
              content: `# BookMarkDown\\n\\n## 📚 Test Category\\n\\n### Test Bundle\\n\\n- [Test Bookmark](https://example.com)\\n\\nUpdated: ${etagCounter}`
            }
          },
          updated_at: new Date().toISOString()
        })
      });
    });

    // Mock Gist creation
    await page.route('https://api.github.com/gists', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          headers: {
            'etag': `"etag-${etagCounter}"`
          },
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-gist-123',
            files: {
              'bookmarks.md': {
                content: '# BookMarkDown\\n\\nYour bookmark collection'
              }
            }
          })
        });
      }
    });
  }

  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    etagCounter = 1;
    hasRemoteChanges = false;
    await setupMocks(page);
  });

  test('should start remote change detector after authentication', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Set mock token in localStorage to simulate authentication
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'test-token-123');
    });

    // Reload to trigger authentication flow
    await page.reload();

    // Wait for the app to initialize
    await page.waitForTimeout(2000);

    // Check that no remote changes have been detected yet
    expect(consoleLogs).not.toContain('Remote changes detected!');
    
    // The detector should be running now (we can't directly verify this in E2E,
    // but we can verify it starts checking by simulating a change)
  });

  test('should detect remote changes and log to console', async ({ page }) => {
    // Navigate and authenticate
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'test-token-123');
    });
    await page.reload();

    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Clear initial logs
    consoleLogs = [];

    // Simulate a remote change by incrementing etag
    hasRemoteChanges = true;
    etagCounter++;

    // Wait for the detector to poll (should happen within 10 seconds)
    // We'll wait up to 12 seconds to account for timing
    await page.waitForTimeout(12000);

    // Verify that remote changes were detected
    expect(consoleLogs).toContain('Remote changes detected!');
  });

  test('should poll at 10-second intervals', async ({ page }) => {
    // Navigate and authenticate
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'test-token-123');
    });
    await page.reload();

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Track API calls
    let pollCount = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async route => {
      const request = route.request();
      if (request.headers()['if-none-match']) {
        pollCount++;
      }
      
      await route.fulfill({
        status: 304,
        headers: {
          'etag': '"etag-1"'
        }
      });
    });

    // Wait for multiple polling cycles (30 seconds = 3 cycles)
    await page.waitForTimeout(32000);

    // Should have made approximately 3 polls (might be 2-4 due to timing)
    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(pollCount).toBeLessThanOrEqual(4);
  });

  test('should handle multiple simultaneous changes', async ({ page }) => {
    // Navigate and authenticate
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'test-token-123');
    });
    await page.reload();

    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Clear logs
    consoleLogs = [];

    // Simulate first change
    hasRemoteChanges = true;
    etagCounter++;

    // Wait for first detection
    await page.waitForTimeout(12000);
    
    const firstDetectionCount = consoleLogs.filter(log => log === 'Remote changes detected!').length;
    expect(firstDetectionCount).toBe(1);

    // Simulate another change
    etagCounter++;

    // Wait for second detection
    await page.waitForTimeout(12000);
    
    const secondDetectionCount = consoleLogs.filter(log => log === 'Remote changes detected!').length;
    expect(secondDetectionCount).toBe(2);
  });

  test('should stop detector when logging out', async ({ page }) => {
    // Navigate and authenticate
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'test-token-123');
    });
    await page.reload();

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Track API calls
    let pollCount = 0;
    await page.route('https://api.github.com/gists/test-gist-123', async route => {
      const request = route.request();
      if (request.headers()['if-none-match']) {
        pollCount++;
      }
      
      await route.fulfill({
        status: 304,
        headers: {
          'etag': '"etag-1"'
        }
      });
    });

    // Wait for at least one poll
    await page.waitForTimeout(12000);
    const initialPollCount = pollCount;
    expect(initialPollCount).toBeGreaterThan(0);

    // Logout by clearing token
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
    });
    await page.reload();

    // Reset counter
    pollCount = 0;

    // Wait to see if polling continues
    await page.waitForTimeout(15000);

    // Should not have made any new polls after logout
    expect(pollCount).toBe(0);
  });
});