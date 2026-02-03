import { test as base, expect, Page } from '@playwright/test';
import {
  detectBrowser,
  getModifierKey,
  generateCompatibilityReport,
  BrowserInfo,
  CompatibilityReport,
} from './browser-support';

/**
 * Test fixtures for cross-browser compatibility testing.
 *
 * Provides common utilities and setup for all compatibility tests.
 */

/**
 * Extended test context with browser compatibility information.
 */
interface CompatTestFixtures {
  browserInfo: BrowserInfo;
  modifierKey: 'Meta' | 'Control';
  compatReport: CompatibilityReport;
  isMac: boolean;
  selectCell: (row: number, col: number) => Promise<void>;
  enterCellValue: (row: number, col: number, value: string) => Promise<void>;
  selectRange: (
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ) => Promise<void>;
  waitForGridReady: () => Promise<void>;
}

/**
 * Extended test with compatibility fixtures.
 */
export const test = base.extend<CompatTestFixtures>({
  browserInfo: async ({ page }, use) => {
    const info = await detectBrowser(page);
    await use(info);
  },

  modifierKey: async ({ page }, use) => {
    const key = await getModifierKey(page);
    await use(key);
  },

  compatReport: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForSelector('.virtual-grid');
    const report = await generateCompatibilityReport(page);
    await use(report);
  },

  isMac: async ({ page }, use) => {
    const isMac = await page.evaluate(() =>
      /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    );
    await use(isMac);
  },

  selectCell: async ({ page }, use) => {
    const selectCell = async (row: number, col: number) => {
      const cell = page.locator(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
      await cell.click();
      await expect(cell).toHaveClass(/selected/);
    };
    await use(selectCell);
  },

  enterCellValue: async ({ page }, use) => {
    const enterCellValue = async (row: number, col: number, value: string) => {
      const cell = page.locator(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
      await cell.click();
      await page.keyboard.press('F2');
      await page.keyboard.type(value);
      await page.keyboard.press('Enter');
    };
    await use(enterCellValue);
  },

  selectRange: async ({ page }, use) => {
    const selectRange = async (
      startRow: number,
      startCol: number,
      endRow: number,
      endCol: number
    ) => {
      // Click start cell
      const startCell = page.locator(
        `.grid-cell[data-row="${startRow}"][data-col="${startCol}"]`
      );
      await startCell.click();

      // Shift+click end cell
      const endCell = page.locator(
        `.grid-cell[data-row="${endRow}"][data-col="${endCol}"]`
      );
      await endCell.click({ modifiers: ['Shift'] });

      // Verify selection overlay is visible
      const overlay = page.locator('.selection-overlay');
      await expect(overlay).toBeVisible();
    };
    await use(selectRange);
  },

  waitForGridReady: async ({ page }, use) => {
    const waitForGridReady = async () => {
      await page.waitForSelector('.virtual-grid');
      await page.waitForSelector('.grid-cell');
      // Wait for any initial animations/rendering
      await page.waitForTimeout(100);
    };
    await use(waitForGridReady);
  },
});

export { expect };

/**
 * Skip test on specific browsers.
 */
export function skipOnBrowser(
  browserInfo: BrowserInfo,
  ...browsers: string[]
): boolean {
  return browsers.some(
    (b) => browserInfo.name.toLowerCase() === b.toLowerCase()
  );
}

/**
 * Skip test on browsers below a certain version.
 */
export function skipBelowVersion(
  browserInfo: BrowserInfo,
  browser: string,
  minVersion: number
): boolean {
  return (
    browserInfo.name.toLowerCase() === browser.toLowerCase() &&
    browserInfo.majorVersion < minVersion
  );
}

/**
 * Format a test result message with browser info.
 */
export function formatResult(
  browserInfo: BrowserInfo,
  message: string
): string {
  return `[${browserInfo.name} ${browserInfo.version}] ${message}`;
}

/**
 * Common cell selectors.
 */
export const selectors = {
  grid: '.virtual-grid',
  gridContent: '.grid-content',
  scrollContainer: '.grid-scroll-container',
  cell: (row: number, col: number) =>
    `.grid-cell[data-row="${row}"][data-col="${col}"]`,
  selectedCell: '.grid-cell.selected',
  selectionOverlay: '.selection-overlay',
  cellEditor: '.cell-editor',
  rowHeader: (row: number) => `.row-header:nth-child(${row + 1})`,
  columnHeader: (col: number) => `.column-header:nth-child(${col + 1})`,
  rowHeaders: '.row-headers-container',
  columnHeaders: '.column-headers-container',
};

/**
 * Common keyboard shortcuts.
 */
export const shortcuts = {
  copy: (modifier: 'Meta' | 'Control') => `${modifier}+c`,
  paste: (modifier: 'Meta' | 'Control') => `${modifier}+v`,
  cut: (modifier: 'Meta' | 'Control') => `${modifier}+x`,
  undo: (modifier: 'Meta' | 'Control') => `${modifier}+z`,
  redo: (modifier: 'Meta' | 'Control') => `${modifier}+y`,
  redoAlt: (modifier: 'Meta' | 'Control') => `${modifier}+Shift+z`,
  bold: (modifier: 'Meta' | 'Control') => `${modifier}+b`,
  italic: (modifier: 'Meta' | 'Control') => `${modifier}+i`,
  underline: (modifier: 'Meta' | 'Control') => `${modifier}+u`,
  selectAll: (modifier: 'Meta' | 'Control') => `${modifier}+a`,
  home: (modifier: 'Meta' | 'Control') => `${modifier}+Home`,
  end: (modifier: 'Meta' | 'Control') => `${modifier}+End`,
};

/**
 * Common test data for spreadsheet tests.
 */
export const testData = {
  singleCell: {
    value: 'Test Value',
    number: '12345.67',
    formula: '=SUM(A1:A10)',
    longText: 'This is a very long text that should overflow the cell boundaries',
    specialChars: '<script>"test" & \'value\'</script>',
    unicode: 'Hello \u4e16\u754c \ud83c\udf1f',
  },
  range: [
    ['A1', 'B1', 'C1'],
    ['A2', 'B2', 'C2'],
    ['A3', 'B3', 'C3'],
  ],
  tsv: 'A1\tB1\tC1\nA2\tB2\tC2',
  csv: 'A1,B1,C1\nA2,B2,C2',
};

/**
 * Wait for a specific condition with custom timeout.
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await page.waitForTimeout(interval);
  }
  return false;
}

/**
 * Get computed style properties for an element.
 */
export async function getComputedStyles(
  page: Page,
  selector: string,
  properties: string[]
): Promise<Record<string, string>> {
  return page.evaluate(
    ({ sel, props }) => {
      const el = document.querySelector(sel);
      if (!el) return {};
      const computed = window.getComputedStyle(el);
      return props.reduce(
        (acc, prop) => {
          acc[prop] = computed.getPropertyValue(prop);
          return acc;
        },
        {} as Record<string, string>
      );
    },
    { sel: selector, props: properties }
  );
}

/**
 * Assert that a test should be skipped with a reason.
 */
export function skipWithReason(reason: string): void {
  test.skip(true, reason);
}

/**
 * Log a browser-specific message.
 */
export function logBrowserMessage(
  browserInfo: BrowserInfo,
  message: string
): void {
  console.log(formatResult(browserInfo, message));
}
