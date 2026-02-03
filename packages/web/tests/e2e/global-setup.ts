import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Verify the application is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be available
    await page.goto(baseURL!, { waitUntil: 'networkidle', timeout: 60000 });

    // Verify the spreadsheet component is loaded
    await page.waitForSelector('.spreadsheet', { timeout: 30000 });

    console.log('Global setup: Application is ready');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  // Optionally set up test data in local storage
  // This could be used for consistent initial state

  // Optionally set up mock server or database
}

export default globalSetup;
