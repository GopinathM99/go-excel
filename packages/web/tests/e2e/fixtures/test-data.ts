import { Page, Locator, expect } from '@playwright/test';

/**
 * Cell position type
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Cell range type
 */
export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

/**
 * Test data row type
 */
export interface TestDataRow {
  [key: string]: string | number | boolean | null;
}

/**
 * Convert column index (0-based) to column letter (A, B, ..., Z, AA, AB, ...)
 */
export function columnIndexToLabel(index: number): string {
  let label = '';
  let i = index;

  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }

  return label;
}

/**
 * Convert column letter to column index (0-based)
 */
export function columnLabelToIndex(label: string): number {
  let index = 0;
  const upperLabel = label.toUpperCase();

  for (let i = 0; i < upperLabel.length; i++) {
    index = index * 26 + (upperLabel.charCodeAt(i) - 64);
  }

  return index - 1;
}

/**
 * Parse cell reference (e.g., "A1", "B2") to position
 */
export function parseCellReference(ref: string): CellPosition {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }

  return {
    row: parseInt(match[2], 10) - 1,
    col: columnLabelToIndex(match[1]),
  };
}

/**
 * Format cell position to reference (e.g., { row: 0, col: 0 } -> "A1")
 */
export function formatCellReference(pos: CellPosition): string {
  return `${columnIndexToLabel(pos.col)}${pos.row + 1}`;
}

/**
 * Sample test data for spreadsheet operations
 */
export const SAMPLE_DATA = {
  // Simple numeric data
  numbers: [
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90],
  ],

  // Data with headers for sorting/filtering
  salesData: {
    headers: ['Product', 'Region', 'Sales', 'Quantity'],
    rows: [
      ['Widget A', 'North', 1500, 100],
      ['Widget B', 'South', 2300, 150],
      ['Widget A', 'South', 1800, 120],
      ['Widget C', 'North', 3200, 200],
      ['Widget B', 'East', 1100, 80],
      ['Widget C', 'West', 2700, 180],
      ['Widget A', 'East', 1900, 130],
      ['Widget B', 'North', 2100, 140],
    ],
  },

  // Data for formula testing
  formulaTestData: {
    A1: '10',
    B1: '20',
    C1: '=A1+B1',
    A2: '5',
    B2: '15',
    C2: '=A2*B2',
    A3: '=SUM(A1:A2)',
    B3: '=AVERAGE(B1:B2)',
    C3: '=SUM(C1:C2)',
  },

  // Data for chart testing
  chartData: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    series1: [100, 150, 120, 180, 200, 170],
    series2: [80, 120, 100, 150, 180, 140],
  },
};

/**
 * SpreadsheetTestHelper - Helper class for spreadsheet E2E tests
 */
export class SpreadsheetTestHelper {
  constructor(public page: Page) {}

  /**
   * Navigate to the spreadsheet application
   */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.waitForSpreadsheetReady();
  }

  /**
   * Wait for the spreadsheet to be fully loaded
   */
  async waitForSpreadsheetReady(): Promise<void> {
    await this.page.waitForSelector('.spreadsheet', { state: 'visible' });
    await this.page.waitForSelector('.virtual-grid', { state: 'visible' });
    // Wait for grid cells to be rendered
    await this.page.waitForSelector('.grid-cell', { state: 'visible' });
  }

  /**
   * Wait for calculations to complete
   */
  async waitForCalculations(): Promise<void> {
    // Wait for any loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingIndicators = document.querySelectorAll('.loading, .calculating');
      return loadingIndicators.length === 0;
    }, { timeout: 5000 });

    // Additional small delay for calculation propagation
    await this.page.waitForTimeout(100);
  }

  /**
   * Get the grid container element
   */
  getGrid(): Locator {
    return this.page.locator('.virtual-grid');
  }

  /**
   * Get a specific cell by row and column (0-indexed)
   */
  getCell(row: number, col: number): Locator {
    return this.page.locator(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
  }

  /**
   * Get a cell by reference (e.g., "A1", "B2")
   */
  getCellByRef(ref: string): Locator {
    const pos = parseCellReference(ref);
    return this.getCell(pos.row, pos.col);
  }

  /**
   * Click on a cell to select it
   */
  async selectCell(row: number, col: number): Promise<void> {
    const cell = this.getCell(row, col);
    await cell.click();
    await this.page.waitForTimeout(50); // Small delay for selection to update
  }

  /**
   * Select a cell by reference
   */
  async selectCellByRef(ref: string): Promise<void> {
    const pos = parseCellReference(ref);
    await this.selectCell(pos.row, pos.col);
  }

  /**
   * Select a range of cells using shift+click
   */
  async selectRange(start: CellPosition, end: CellPosition): Promise<void> {
    await this.selectCell(start.row, start.col);
    const endCell = this.getCell(end.row, end.col);
    await endCell.click({ modifiers: ['Shift'] });
    await this.page.waitForTimeout(50);
  }

  /**
   * Select a range by reference (e.g., "A1:C3")
   */
  async selectRangeByRef(rangeRef: string): Promise<void> {
    const [startRef, endRef] = rangeRef.split(':');
    const start = parseCellReference(startRef);
    const end = parseCellReference(endRef);
    await this.selectRange(start, end);
  }

  /**
   * Multi-select cells with Ctrl+click
   */
  async multiSelectCell(row: number, col: number): Promise<void> {
    const cell = this.getCell(row, col);
    await cell.click({ modifiers: ['Control'] });
    await this.page.waitForTimeout(50);
  }

  /**
   * Double-click to start editing a cell
   */
  async startEditingCell(row: number, col: number): Promise<void> {
    const cell = this.getCell(row, col);
    await cell.dblclick();
    await this.page.waitForSelector('.cell-editor-input', { state: 'visible' });
  }

  /**
   * Start editing a cell using F2
   */
  async startEditingWithF2(row: number, col: number): Promise<void> {
    await this.selectCell(row, col);
    await this.page.keyboard.press('F2');
    await this.page.waitForSelector('.cell-editor-input', { state: 'visible' });
  }

  /**
   * Type a value into the currently editing cell
   */
  async typeInCell(value: string): Promise<void> {
    const editor = this.page.locator('.cell-editor-input');
    await expect(editor).toBeVisible();
    await editor.fill(value);
  }

  /**
   * Commit the current edit with Enter
   */
  async commitEdit(): Promise<void> {
    await this.page.keyboard.press('Enter');
    await this.page.waitForSelector('.cell-editor-input', { state: 'hidden' });
    await this.waitForCalculations();
  }

  /**
   * Cancel the current edit with Escape
   */
  async cancelEdit(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector('.cell-editor-input', { state: 'hidden' });
  }

  /**
   * Enter a value into a cell (select, type, commit)
   */
  async enterCellValue(row: number, col: number, value: string): Promise<void> {
    await this.startEditingCell(row, col);
    await this.typeInCell(value);
    await this.commitEdit();
  }

  /**
   * Enter a value into a cell by reference
   */
  async enterCellValueByRef(ref: string, value: string): Promise<void> {
    const pos = parseCellReference(ref);
    await this.enterCellValue(pos.row, pos.col, value);
  }

  /**
   * Get the displayed value of a cell
   */
  async getCellValue(row: number, col: number): Promise<string> {
    const cell = this.getCell(row, col);
    const content = cell.locator('.cell-content');
    return await content.textContent() ?? '';
  }

  /**
   * Get the cell value by reference
   */
  async getCellValueByRef(ref: string): Promise<string> {
    const pos = parseCellReference(ref);
    return this.getCellValue(pos.row, pos.col);
  }

  /**
   * Get the formula bar input value
   */
  async getFormulaBarValue(): Promise<string> {
    const input = this.page.locator('.formula-input');
    return await input.inputValue();
  }

  /**
   * Type in the formula bar
   */
  async typeInFormulaBar(value: string): Promise<void> {
    const input = this.page.locator('.formula-input');
    await input.fill(value);
  }

  /**
   * Navigate using arrow keys
   */
  async navigateWithArrows(
    direction: 'up' | 'down' | 'left' | 'right',
    times = 1
  ): Promise<void> {
    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    };

    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press(keyMap[direction]);
      await this.page.waitForTimeout(50);
    }
  }

  /**
   * Scroll to a specific row/column
   */
  async scrollTo(row: number, col: number): Promise<void> {
    const grid = this.page.locator('.grid-scroll-container');
    const rowHeight = 25; // DEFAULT_ROW_HEIGHT
    const colWidth = 100; // DEFAULT_COLUMN_WIDTH

    await grid.evaluate(
      (el, { top, left }) => {
        el.scrollTo({ top, left, behavior: 'instant' });
      },
      { top: row * rowHeight, left: col * colWidth }
    );

    await this.page.waitForTimeout(100); // Wait for virtualization to catch up
  }

  /**
   * Check if a cell is selected
   */
  async isCellSelected(row: number, col: number): Promise<boolean> {
    const cell = this.getCell(row, col);
    const className = await cell.getAttribute('class');
    return className?.includes('selected') ?? false;
  }

  /**
   * Get the selection overlay bounds
   */
  async getSelectionBounds(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    const overlay = this.page.locator('.selection-overlay');
    const isVisible = await overlay.isVisible();

    if (!isVisible) return null;

    const box = await overlay.boundingBox();
    return box ?? null;
  }

  /**
   * Fill a range of cells with test data
   */
  async fillRange(
    startRow: number,
    startCol: number,
    data: (string | number)[][]
  ): Promise<void> {
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const value = data[r][c];
        if (value !== null && value !== undefined) {
          await this.enterCellValue(
            startRow + r,
            startCol + c,
            String(value)
          );
        }
      }
    }
  }

  /**
   * Click a toolbar button by title
   */
  async clickToolbarButton(title: string): Promise<void> {
    const button = this.page.locator(`.toolbar-button[title="${title}"], .format-btn[title="${title}"]`);
    await button.click();
  }

  /**
   * Open a menu by name
   */
  async openMenu(menuName: string): Promise<void> {
    const menu = this.page.locator(`[role="menubar"] >> text=${menuName}`);
    await menu.click();
    await this.page.waitForSelector('[role="menu"]', { state: 'visible' });
  }

  /**
   * Click a menu item
   */
  async clickMenuItem(itemText: string): Promise<void> {
    const item = this.page.locator(`[role="menuitem"]:has-text("${itemText}")`);
    await item.click();
  }

  /**
   * Check for error indicator on a cell
   */
  async hasCellError(row: number, col: number): Promise<boolean> {
    const cell = this.getCell(row, col);
    const className = await cell.getAttribute('class');
    return className?.includes('error') ?? false;
  }

  /**
   * Get the error message for a cell
   */
  async getCellErrorMessage(row: number, col: number): Promise<string | null> {
    const cell = this.getCell(row, col);
    const errorIndicator = cell.locator('.cell-error-indicator');

    if (await errorIndicator.isVisible()) {
      return await errorIndicator.getAttribute('title');
    }

    return null;
  }

  /**
   * Perform undo action
   */
  async undo(): Promise<void> {
    await this.page.keyboard.press('Control+z');
    await this.waitForCalculations();
  }

  /**
   * Perform redo action
   */
  async redo(): Promise<void> {
    await this.page.keyboard.press('Control+y');
    await this.waitForCalculations();
  }

  /**
   * Copy selected cells
   */
  async copy(): Promise<void> {
    await this.page.keyboard.press('Control+c');
  }

  /**
   * Paste at current selection
   */
  async paste(): Promise<void> {
    await this.page.keyboard.press('Control+v');
    await this.waitForCalculations();
  }

  /**
   * Cut selected cells
   */
  async cut(): Promise<void> {
    await this.page.keyboard.press('Control+x');
  }
}

/**
 * Create a new SpreadsheetTestHelper instance
 */
export function createSpreadsheetHelper(page: Page): SpreadsheetTestHelper {
  return new SpreadsheetTestHelper(page);
}

/**
 * Generate random test data
 */
export function generateRandomData(
  rows: number,
  cols: number,
  options?: {
    numeric?: boolean;
    minValue?: number;
    maxValue?: number;
  }
): (string | number)[][] {
  const data: (string | number)[][] = [];
  const { numeric = true, minValue = 0, maxValue = 1000 } = options ?? {};

  for (let r = 0; r < rows; r++) {
    const row: (string | number)[] = [];
    for (let c = 0; c < cols; c++) {
      if (numeric) {
        row.push(Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue);
      } else {
        row.push(`Cell_${r}_${c}`);
      }
    }
    data.push(row);
  }

  return data;
}

/**
 * Wait for a specific condition with custom timeout
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  options?: { timeout?: number; interval?: number }
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options ?? {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await page.waitForTimeout(interval);
  }

  throw new Error('Condition not met within timeout');
}

/**
 * Sample formulas for testing
 */
export const TEST_FORMULAS = {
  simple: {
    addition: '=A1+B1',
    subtraction: '=A1-B1',
    multiplication: '=A1*B1',
    division: '=A1/B1',
  },
  functions: {
    sum: '=SUM(A1:A10)',
    average: '=AVERAGE(A1:A10)',
    count: '=COUNT(A1:A10)',
    max: '=MAX(A1:A10)',
    min: '=MIN(A1:A10)',
    if: '=IF(A1>10,"High","Low")',
    vlookup: '=VLOOKUP(A1,B1:C10,2,FALSE)',
  },
  nested: {
    sumIf: '=SUMIF(A1:A10,">5")',
    nested: '=SUM(A1:A5)+AVERAGE(B1:B5)',
  },
  circular: '=A1+C1', // When placed in C1, creates circular reference
};

/**
 * Number format samples
 */
export const NUMBER_FORMATS = {
  general: 'General',
  number: '#,##0.00',
  currency: '$#,##0.00',
  percentage: '0.00%',
  date: 'MM/DD/YYYY',
  time: 'HH:MM:SS',
  scientific: '0.00E+00',
};

/**
 * Default timeout values for tests
 */
export const TIMEOUTS = {
  short: 1000,
  medium: 5000,
  long: 10000,
  veryLong: 30000,
};
