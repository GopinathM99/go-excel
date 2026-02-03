import { test as base, expect, Page, Locator } from '@playwright/test';
import { SpreadsheetTestHelper, createSpreadsheetHelper } from './test-data';

/**
 * Extended test interface with custom fixtures
 */
export interface SpreadsheetFixtures {
  /**
   * Pre-initialized spreadsheet helper
   */
  spreadsheet: SpreadsheetTestHelper;

  /**
   * Spreadsheet with sample data pre-loaded
   */
  spreadsheetWithData: SpreadsheetTestHelper;

  /**
   * Navigate to specific route before test
   */
  goto: (path?: string) => Promise<void>;
}

/**
 * Extended test with spreadsheet fixtures
 */
export const test = base.extend<SpreadsheetFixtures>({
  /**
   * Pre-initialized spreadsheet helper fixture
   * Automatically navigates to the app and waits for ready
   */
  spreadsheet: async ({ page }, use) => {
    const helper = createSpreadsheetHelper(page);
    await helper.goto();
    await use(helper);
  },

  /**
   * Spreadsheet with sample data pre-loaded
   */
  spreadsheetWithData: async ({ page }, use) => {
    const helper = createSpreadsheetHelper(page);
    await helper.goto();

    // Load sample data
    await helper.enterCellValue(0, 0, 'Name');
    await helper.enterCellValue(0, 1, 'Value');
    await helper.enterCellValue(0, 2, 'Formula');

    await helper.enterCellValue(1, 0, 'A');
    await helper.enterCellValue(1, 1, '10');
    await helper.enterCellValue(1, 2, '=B2*2');

    await helper.enterCellValue(2, 0, 'B');
    await helper.enterCellValue(2, 1, '20');
    await helper.enterCellValue(2, 2, '=B3*2');

    await helper.enterCellValue(3, 0, 'C');
    await helper.enterCellValue(3, 1, '30');
    await helper.enterCellValue(3, 2, '=B4*2');

    await helper.enterCellValue(4, 0, 'Total');
    await helper.enterCellValue(4, 1, '=SUM(B2:B4)');
    await helper.enterCellValue(4, 2, '=SUM(C2:C4)');

    await helper.waitForCalculations();

    await use(helper);
  },

  /**
   * Navigate helper
   */
  goto: async ({ page }, use) => {
    const helper = createSpreadsheetHelper(page);
    await use(async (path?: string) => {
      await helper.goto(path);
    });
  },
});

/**
 * Re-export expect for convenience
 */
export { expect };

/**
 * Custom matchers for spreadsheet testing
 */
expect.extend({
  /**
   * Check if a cell has a specific value
   */
  async toHaveCellValue(
    locator: Locator,
    expectedValue: string
  ) {
    const contentLocator = locator.locator('.cell-content');
    const actualValue = await contentLocator.textContent();

    const pass = actualValue === expectedValue;

    if (pass) {
      return {
        message: () =>
          `expected cell not to have value "${expectedValue}"`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected cell to have value "${expectedValue}", but got "${actualValue}"`,
        pass: false,
      };
    }
  },

  /**
   * Check if a cell is selected
   */
  async toBeSelectedCell(locator: Locator) {
    const className = await locator.getAttribute('class');
    const pass = className?.includes('selected') ?? false;

    if (pass) {
      return {
        message: () => `expected cell not to be selected`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected cell to be selected`,
        pass: false,
      };
    }
  },

  /**
   * Check if a cell has an error
   */
  async toHaveCellError(locator: Locator) {
    const className = await locator.getAttribute('class');
    const content = await locator.locator('.cell-content').textContent();
    const hasErrorClass = className?.includes('error') ?? false;
    const hasErrorValue = content?.startsWith('#') ?? false;

    const pass = hasErrorClass || hasErrorValue;

    if (pass) {
      return {
        message: () => `expected cell not to have error`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected cell to have error`,
        pass: false,
      };
    }
  },
});

/**
 * Declare custom matchers on Playwright's expect
 */
declare module '@playwright/test' {
  interface Matchers<R> {
    toHaveCellValue(expectedValue: string): Promise<R>;
    toBeSelectedCell(): Promise<R>;
    toHaveCellError(): Promise<R>;
  }
}

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  },

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  },

  /**
   * Wait for animations to complete
   */
  async waitForAnimations(page: Page): Promise<void> {
    await page.waitForTimeout(300);
  },

  /**
   * Retry an action with exponential backoff
   */
  async retry<T>(
    action: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 100
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelay * Math.pow(2, i))
        );
      }
    }

    throw lastError;
  },
};
