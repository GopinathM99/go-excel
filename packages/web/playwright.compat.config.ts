import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for cross-browser compatibility tests.
 *
 * This configuration runs tests across Chrome, Firefox, Safari (WebKit), and Edge
 * to ensure consistent behavior across all major browsers.
 */
export default defineConfig({
  testDir: './tests/compat',

  // Run tests in parallel for faster execution
  fullyParallel: true,

  // Fail CI if test.only is accidentally left in the code
  forbidOnly: !!process.env['CI'],

  // Retry failed tests in CI for stability
  retries: process.env['CI'] ? 2 : 1,

  // Limit workers in CI to prevent resource exhaustion
  workers: process.env['CI'] ? 2 : undefined,

  // HTML reporter with detailed test results
  reporter: [
    ['html', { outputFolder: 'playwright-report/compat' }],
    ['list'],
    ['json', { outputFile: 'test-results/compat-results.json' }],
  ],

  // Global test settings
  use: {
    baseURL: 'http://localhost:3000',

    // Capture trace on first retry for debugging
    trace: 'on-first-retry',

    // Capture screenshots on failure
    screenshot: 'only-on-failure',

    // Capture video on failure
    video: 'retain-on-failure',

    // Default timeout for actions
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Timeout for individual tests (60 seconds)
  timeout: 60000,

  // Expect timeout (10 seconds)
  expect: {
    timeout: 10000,
    // Screenshot comparison threshold
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // Browser-specific projects
  projects: [
    // Chrome (Chromium)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
        // Chrome-specific permissions
        permissions: ['clipboard-read', 'clipboard-write'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content',
          ],
        },
      },
      metadata: {
        browserName: 'Chrome',
        browserFamily: 'chromium',
      },
    },

    // Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          firefoxUserPrefs: {
            // Enable clipboard access for testing
            'dom.events.testing.asyncClipboard': true,
            'dom.events.asyncClipboard.readText': true,
            'dom.events.asyncClipboard.clipboardItem': true,
          },
        },
      },
      metadata: {
        browserName: 'Firefox',
        browserFamily: 'firefox',
      },
    },

    // Safari (WebKit)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        browserName: 'Safari',
        browserFamily: 'webkit',
      },
    },

    // Microsoft Edge (Chromium-based)
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content',
          ],
        },
      },
      metadata: {
        browserName: 'Edge',
        browserFamily: 'chromium',
      },
    },

    // Mobile Chrome (for touch testing)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
        hasTouch: true,
        isMobile: true,
      },
      metadata: {
        browserName: 'Mobile Chrome',
        browserFamily: 'chromium',
        isMobile: true,
      },
    },

    // Mobile Safari (for touch testing)
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
      metadata: {
        browserName: 'Mobile Safari',
        browserFamily: 'webkit',
        isMobile: true,
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output directory for test artifacts
  outputDir: 'test-results/compat',

  // Preserve test outputs on failure
  preserveOutput: 'failures-only',
});
