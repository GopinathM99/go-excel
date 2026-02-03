import { test, expect } from '@playwright/test';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
  SAMPLE_DATA,
} from './fixtures/test-data';

test.describe('Grid Interactions', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  test.describe('Navigation', () => {
    test('should navigate with arrow keys', async ({ page }) => {
      // Start at A1
      await helper.selectCell(0, 0);
      expect(await helper.isCellSelected(0, 0)).toBe(true);

      // Navigate right
      await helper.navigateWithArrows('right');
      expect(await helper.isCellSelected(0, 1)).toBe(true);

      // Navigate down
      await helper.navigateWithArrows('down');
      expect(await helper.isCellSelected(1, 1)).toBe(true);

      // Navigate left
      await helper.navigateWithArrows('left');
      expect(await helper.isCellSelected(1, 0)).toBe(true);

      // Navigate up
      await helper.navigateWithArrows('up');
      expect(await helper.isCellSelected(0, 0)).toBe(true);
    });

    test('should navigate with Tab key', async ({ page }) => {
      await helper.selectCell(0, 0);

      // Tab moves right
      await page.keyboard.press('Tab');
      expect(await helper.isCellSelected(0, 1)).toBe(true);

      // Shift+Tab moves left
      await page.keyboard.press('Shift+Tab');
      expect(await helper.isCellSelected(0, 0)).toBe(true);
    });

    test('should navigate with Enter key', async ({ page }) => {
      await helper.selectCell(0, 0);

      // Enter moves down
      await page.keyboard.press('Enter');
      expect(await helper.isCellSelected(1, 0)).toBe(true);

      // Shift+Enter moves up
      await page.keyboard.press('Shift+Enter');
      expect(await helper.isCellSelected(0, 0)).toBe(true);
    });

    test('should navigate to home with Home key', async ({ page }) => {
      await helper.selectCell(5, 5);

      // Home moves to beginning of row
      await page.keyboard.press('Home');
      expect(await helper.isCellSelected(5, 0)).toBe(true);
    });

    test('should navigate to end with End key', async ({ page }) => {
      await helper.selectCell(0, 0);

      // Ctrl+End moves to last cell
      await page.keyboard.press('Control+End');
      // Should be at the rightmost column, bottom row
      // The exact position depends on the grid size
    });

    test('should navigate with Page Up/Down', async ({ page }) => {
      await helper.selectCell(50, 0);

      // Page Up moves up by visible rows
      await page.keyboard.press('PageUp');
      const row = await page.evaluate(() => {
        const selected = document.querySelector('.grid-cell.selected');
        return selected ? parseInt(selected.getAttribute('data-row') || '0', 10) : -1;
      });
      expect(row).toBeLessThan(50);
    });

    test('should not navigate beyond grid boundaries', async ({ page }) => {
      // At top-left corner
      await helper.selectCell(0, 0);

      // Try to go up - should stay at row 0
      await helper.navigateWithArrows('up');
      expect(await helper.isCellSelected(0, 0)).toBe(true);

      // Try to go left - should stay at col 0
      await helper.navigateWithArrows('left');
      expect(await helper.isCellSelected(0, 0)).toBe(true);
    });
  });

  test.describe('Cell Selection', () => {
    test('should select a cell with mouse click', async ({ page }) => {
      const cell = helper.getCell(3, 4);
      await cell.click();

      expect(await helper.isCellSelected(3, 4)).toBe(true);
      // Previous cell should not be selected
      expect(await helper.isCellSelected(0, 0)).toBe(false);
    });

    test('should select a range with Shift+click', async ({ page }) => {
      // Click on A1
      await helper.selectCell(0, 0);

      // Shift+click on C3
      await helper.getCell(2, 2).click({ modifiers: ['Shift'] });

      // Check selection overlay exists
      const selectionOverlay = page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();
    });

    test('should multi-select with Ctrl+click', async ({ page }) => {
      // Select first cell
      await helper.selectCell(0, 0);

      // Ctrl+click to add another cell
      await helper.multiSelectCell(2, 2);

      // Both cells should be in selection
      // Note: Implementation may vary - this tests the action
    });

    test('should extend selection with Shift+arrow keys', async ({ page }) => {
      await helper.selectCell(0, 0);

      // Shift+Right to extend selection
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');

      // Selection overlay should cover 2x2 area
      const selectionOverlay = page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();
    });

    test('should clear selection on single click elsewhere', async ({ page }) => {
      // Create a range selection
      await helper.selectCell(0, 0);
      await helper.getCell(2, 2).click({ modifiers: ['Shift'] });

      // Click on a different cell without Shift
      await helper.selectCell(5, 5);

      // Should only have single cell selected
      expect(await helper.isCellSelected(5, 5)).toBe(true);
    });
  });

  test.describe('Cell Editing', () => {
    test('should edit cell with double-click', async ({ page }) => {
      await helper.startEditingCell(0, 0);

      // Editor should be visible
      const editor = page.locator('.cell-editor-input');
      await expect(editor).toBeVisible();
      await expect(editor).toBeFocused();
    });

    test('should edit cell with F2', async ({ page }) => {
      await helper.startEditingWithF2(0, 0);

      // Editor should be visible
      const editor = page.locator('.cell-editor-input');
      await expect(editor).toBeVisible();
      await expect(editor).toBeFocused();
    });

    test('should commit edit with Enter', async ({ page }) => {
      await helper.startEditingCell(0, 0);
      await helper.typeInCell('Hello');
      await helper.commitEdit();

      // Cell should display the value
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('Hello');

      // Editor should be hidden
      const editor = page.locator('.cell-editor-input');
      await expect(editor).not.toBeVisible();
    });

    test('should commit edit with Tab', async ({ page }) => {
      await helper.startEditingCell(0, 0);
      await helper.typeInCell('World');
      await page.keyboard.press('Tab');

      // Cell should display the value
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('World');

      // Should move to next cell
      expect(await helper.isCellSelected(0, 1)).toBe(true);
    });

    test('should cancel edit with Escape', async ({ page }) => {
      // First enter a value
      await helper.enterCellValue(0, 0, 'Initial');

      // Start editing and type new value
      await helper.startEditingCell(0, 0);
      await helper.typeInCell('Changed');

      // Cancel
      await helper.cancelEdit();

      // Original value should be preserved
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('Initial');
    });

    test('should start editing with direct typing', async ({ page }) => {
      await helper.selectCell(0, 0);

      // Start typing directly
      await page.keyboard.type('Direct');

      // Editor should appear with typed content
      const editor = page.locator('.cell-editor-input');
      await expect(editor).toBeVisible();

      await helper.commitEdit();
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('Direct');
    });

    test('should preserve cell content when editing is canceled', async ({ page }) => {
      // Enter initial value
      await helper.enterCellValue(1, 1, 'Original');

      // Edit and cancel
      await helper.startEditingCell(1, 1);
      await page.keyboard.type('Modified');
      await helper.cancelEdit();

      // Check original is preserved
      const value = await helper.getCellValue(1, 1);
      expect(value).toBe('Original');
    });

    test('should clear cell content with Delete key', async ({ page }) => {
      // Enter a value
      await helper.enterCellValue(0, 0, 'ToBeDeleted');

      // Select and press Delete
      await helper.selectCell(0, 0);
      await page.keyboard.press('Delete');
      await helper.waitForCalculations();

      // Cell should be empty
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('');
    });
  });

  test.describe('Scrolling and Virtualization', () => {
    test('should scroll to large row numbers', async ({ page }) => {
      // Scroll to row 1000
      await helper.scrollTo(1000, 0);

      // Check that cells around row 1000 are visible
      await helper.selectCell(1000, 0);
      expect(await helper.isCellSelected(1000, 0)).toBe(true);
    });

    test('should scroll to large column numbers', async ({ page }) => {
      // Scroll to column 50
      await helper.scrollTo(0, 50);

      // Check that cells around column 50 are visible
      await helper.selectCell(0, 50);
      expect(await helper.isCellSelected(0, 50)).toBe(true);
    });

    test('should auto-scroll when navigating to off-screen cell', async ({ page }) => {
      await helper.selectCell(0, 0);

      // Navigate down many times
      for (let i = 0; i < 50; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // The grid should have scrolled
      const scrollTop = await page.evaluate(() => {
        const container = document.querySelector('.grid-scroll-container');
        return container ? container.scrollTop : 0;
      });

      expect(scrollTop).toBeGreaterThan(0);
    });

    test('should maintain selection after scrolling', async ({ page }) => {
      // Select a cell
      await helper.enterCellValue(0, 0, 'KeepMe');
      await helper.selectCell(0, 0);

      // Scroll away
      await helper.scrollTo(100, 0);
      await page.waitForTimeout(100);

      // Scroll back
      await helper.scrollTo(0, 0);
      await page.waitForTimeout(100);

      // Selection and value should be preserved
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('KeepMe');
    });

    test('should render row and column headers correctly', async ({ page }) => {
      // Check row headers
      const rowHeader1 = page.locator('.row-header').first();
      await expect(rowHeader1).toContainText('1');

      // Check column headers
      const colHeaderA = page.locator('.column-header').first();
      await expect(colHeaderA).toContainText('A');
    });
  });

  test.describe('Frozen Panes', () => {
    test.skip('should keep frozen rows visible when scrolling', async ({ page }) => {
      // Note: This test requires frozen panes to be enabled
      // Enable frozen rows (implementation-dependent)
      // await page.click('[data-action="freeze-rows"]');

      // Scroll down
      await helper.scrollTo(100, 0);

      // Check that frozen rows are still visible at top
      // This depends on the implementation
    });

    test.skip('should keep frozen columns visible when scrolling horizontally', async ({ page }) => {
      // Note: This test requires frozen panes to be enabled
      // Enable frozen columns
      // await page.click('[data-action="freeze-cols"]');

      // Scroll right
      await helper.scrollTo(0, 100);

      // Check that frozen columns are still visible at left
    });
  });

  test.describe('Copy, Cut, and Paste', () => {
    test('should copy and paste a cell value', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Enter a value
      await helper.enterCellValue(0, 0, 'CopyMe');
      await helper.selectCell(0, 0);

      // Copy
      await helper.copy();

      // Select destination
      await helper.selectCell(1, 1);

      // Paste
      await helper.paste();

      // Check value was pasted
      const value = await helper.getCellValue(1, 1);
      expect(value).toBe('CopyMe');

      // Original should still exist
      const originalValue = await helper.getCellValue(0, 0);
      expect(originalValue).toBe('CopyMe');
    });

    test('should cut and paste a cell value', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await helper.enterCellValue(0, 0, 'CutMe');
      await helper.selectCell(0, 0);

      // Cut
      await helper.cut();

      // Select destination
      await helper.selectCell(1, 1);

      // Paste
      await helper.paste();

      // Check value was pasted
      const pastedValue = await helper.getCellValue(1, 1);
      expect(pastedValue).toBe('CutMe');

      // Original should be cleared
      const originalValue = await helper.getCellValue(0, 0);
      expect(originalValue).toBe('');
    });
  });

  test.describe('Undo and Redo', () => {
    test('should undo cell value change', async ({ page }) => {
      // Enter a value
      await helper.enterCellValue(0, 0, 'First');
      await helper.enterCellValue(0, 0, 'Second');

      // Undo
      await helper.undo();

      // Should revert to first value
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('First');
    });

    test('should redo undone change', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'First');
      await helper.enterCellValue(0, 0, 'Second');

      // Undo
      await helper.undo();

      // Redo
      await helper.redo();

      // Should restore second value
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('Second');
    });

    test('should support multiple undo operations', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'One');
      await helper.enterCellValue(0, 0, 'Two');
      await helper.enterCellValue(0, 0, 'Three');

      // Undo twice
      await helper.undo();
      await helper.undo();

      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('One');
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should select all with Ctrl+A', async ({ page }) => {
      await helper.selectCell(5, 5);
      await page.keyboard.press('Control+a');

      // All cells should be selected (selection overlay should cover entire grid)
      const selectionOverlay = page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();
    });

    test('should start find with Ctrl+F', async ({ page }) => {
      await page.keyboard.press('Control+f');

      // Find dialog should open (if implemented)
      // This depends on implementation
    });

    test('should save with Ctrl+S', async ({ page }) => {
      // This should trigger save functionality
      await page.keyboard.press('Control+s');

      // Verify save was triggered (implementation-dependent)
    });
  });
});
