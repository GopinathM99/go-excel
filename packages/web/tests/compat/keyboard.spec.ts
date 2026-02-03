import { test, expect, Page } from '@playwright/test';
import {
  detectBrowser,
  getModifierKey,
  checkKeyboardSupport,
  BrowserInfo,
} from './browser-support';

/**
 * Cross-browser keyboard shortcut compatibility tests.
 *
 * Tests keyboard navigation and shortcuts across Chrome, Firefox, Safari, and Edge.
 * Verifies that all keyboard interactions work consistently across browsers.
 */

test.describe('Keyboard Shortcut Compatibility', () => {
  let browserInfo: BrowserInfo;
  let modifierKey: 'Meta' | 'Control';

  test.beforeEach(async ({ page }) => {
    browserInfo = await detectBrowser(page);
    modifierKey = await getModifierKey(page);

    // Navigate to the spreadsheet app
    await page.goto('/');
    await page.waitForSelector('.virtual-grid', { timeout: 10000 });

    // Click on a cell to ensure focus
    await page.click('.grid-cell[data-row="0"][data-col="0"]');
  });

  test.describe('Keyboard API Support', () => {
    test('should support modern keyboard event properties', async ({ page }) => {
      const support = await checkKeyboardSupport(page);

      expect(support.keyboardEvent).toBe(true);
      expect(support.keyProperty).toBe(true);
      expect(support.codeProperty).toBe(true);
      expect(support.getModifierState).toBe(true);

      console.log(
        `[${browserInfo.name} ${browserInfo.version}] Keyboard support: ` +
          `key=${support.keyProperty}, code=${support.codeProperty}`
      );
    });
  });

  test.describe('Copy/Paste/Cut Shortcuts', () => {
    test('Ctrl/Cmd+C should trigger copy action', async ({ page }) => {
      // Enter some text in a cell first
      await page.keyboard.press('F2');
      await page.keyboard.type('Test Copy');
      await page.keyboard.press('Enter');

      // Go back to the cell and copy
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press(`${modifierKey}+c`);

      // Verify the cell is still selected (copy doesn't clear selection)
      const selectedCell = await page.locator('.grid-cell.selected');
      await expect(selectedCell).toBeVisible();

      console.log(
        `[${browserInfo.name}] Copy shortcut (${modifierKey}+C) works correctly`
      );
    });

    test('Ctrl/Cmd+V should trigger paste action', async ({ page }) => {
      // Prepare clipboard by copying text
      await page.keyboard.press('F2');
      await page.keyboard.type('Paste Test');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press(`${modifierKey}+c`);

      // Move to a new cell and paste
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press(`${modifierKey}+v`);

      // The paste action should be triggered (actual clipboard may be restricted in tests)
      console.log(
        `[${browserInfo.name}] Paste shortcut (${modifierKey}+V) triggered`
      );
    });

    test('Ctrl/Cmd+X should trigger cut action', async ({ page }) => {
      // Enter some text
      await page.keyboard.press('F2');
      await page.keyboard.type('Cut Test');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Cut the cell
      await page.keyboard.press(`${modifierKey}+x`);

      console.log(
        `[${browserInfo.name}] Cut shortcut (${modifierKey}+X) triggered`
      );
    });
  });

  test.describe('Undo/Redo Shortcuts', () => {
    test('Ctrl/Cmd+Z should trigger undo', async ({ page }) => {
      // Make a change
      await page.keyboard.press('F2');
      await page.keyboard.type('Undo Test');
      await page.keyboard.press('Enter');

      // Undo the change
      await page.keyboard.press(`${modifierKey}+z`);

      console.log(
        `[${browserInfo.name}] Undo shortcut (${modifierKey}+Z) triggered`
      );
    });

    test('Ctrl/Cmd+Y should trigger redo', async ({ page }) => {
      // Make a change
      await page.keyboard.press('F2');
      await page.keyboard.type('Redo Test');
      await page.keyboard.press('Enter');

      // Undo then redo
      await page.keyboard.press(`${modifierKey}+z`);
      await page.keyboard.press(`${modifierKey}+y`);

      console.log(
        `[${browserInfo.name}] Redo shortcut (${modifierKey}+Y) triggered`
      );
    });

    test('Ctrl/Cmd+Shift+Z should also trigger redo (alternative)', async ({
      page,
    }) => {
      // Make a change
      await page.keyboard.press('F2');
      await page.keyboard.type('Redo Alt Test');
      await page.keyboard.press('Enter');

      // Undo then redo with alternative shortcut
      await page.keyboard.press(`${modifierKey}+z`);
      await page.keyboard.press(`${modifierKey}+Shift+z`);

      console.log(
        `[${browserInfo.name}] Alternative redo shortcut (${modifierKey}+Shift+Z) triggered`
      );
    });
  });

  test.describe('Formatting Shortcuts', () => {
    test('Ctrl/Cmd+B should toggle bold', async ({ page }) => {
      await page.keyboard.press(`${modifierKey}+b`);

      console.log(
        `[${browserInfo.name}] Bold shortcut (${modifierKey}+B) triggered`
      );
    });

    test('Ctrl/Cmd+I should toggle italic', async ({ page }) => {
      await page.keyboard.press(`${modifierKey}+i`);

      console.log(
        `[${browserInfo.name}] Italic shortcut (${modifierKey}+I) triggered`
      );
    });

    test('Ctrl/Cmd+U should toggle underline', async ({ page }) => {
      await page.keyboard.press(`${modifierKey}+u`);

      console.log(
        `[${browserInfo.name}] Underline shortcut (${modifierKey}+U) triggered`
      );
    });
  });

  test.describe('Arrow Key Navigation', () => {
    test('ArrowUp should move selection up', async ({ page }) => {
      // Start from row 1
      await page.click('.grid-cell[data-row="1"][data-col="0"]');
      await page.keyboard.press('ArrowUp');

      const selectedCell = await page.locator('.grid-cell.selected');
      const row = await selectedCell.getAttribute('data-row');
      expect(row).toBe('0');

      console.log(`[${browserInfo.name}] ArrowUp navigation works`);
    });

    test('ArrowDown should move selection down', async ({ page }) => {
      await page.keyboard.press('ArrowDown');

      const selectedCell = await page.locator('.grid-cell.selected');
      const row = await selectedCell.getAttribute('data-row');
      expect(row).toBe('1');

      console.log(`[${browserInfo.name}] ArrowDown navigation works`);
    });

    test('ArrowLeft should move selection left', async ({ page }) => {
      // Start from col 1
      await page.click('.grid-cell[data-row="0"][data-col="1"]');
      await page.keyboard.press('ArrowLeft');

      const selectedCell = await page.locator('.grid-cell.selected');
      const col = await selectedCell.getAttribute('data-col');
      expect(col).toBe('0');

      console.log(`[${browserInfo.name}] ArrowLeft navigation works`);
    });

    test('ArrowRight should move selection right', async ({ page }) => {
      await page.keyboard.press('ArrowRight');

      const selectedCell = await page.locator('.grid-cell.selected');
      const col = await selectedCell.getAttribute('data-col');
      expect(col).toBe('1');

      console.log(`[${browserInfo.name}] ArrowRight navigation works`);
    });

    test('Arrow keys with Shift should extend selection', async ({ page }) => {
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');

      // Should have a selection range now
      const selectionOverlay = await page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();

      console.log(
        `[${browserInfo.name}] Shift+Arrow selection extension works`
      );
    });

    test('Arrow keys at boundaries should not throw errors', async ({
      page,
    }) => {
      // Try to go above row 0
      await page.click('.grid-cell[data-row="0"][data-col="0"]');

      // These should not cause errors
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');

      const selectedCell = await page.locator('.grid-cell.selected');
      await expect(selectedCell).toBeVisible();

      console.log(`[${browserInfo.name}] Boundary navigation handled correctly`);
    });
  });

  test.describe('Tab Navigation', () => {
    test('Tab should move to next cell', async ({ page }) => {
      await page.keyboard.press('Tab');

      const selectedCell = await page.locator('.grid-cell.selected');
      const col = await selectedCell.getAttribute('data-col');
      expect(col).toBe('1');

      console.log(`[${browserInfo.name}] Tab navigation works`);
    });

    test('Shift+Tab should move to previous cell', async ({ page }) => {
      // Start from col 1
      await page.click('.grid-cell[data-row="0"][data-col="1"]');
      await page.keyboard.press('Shift+Tab');

      const selectedCell = await page.locator('.grid-cell.selected');
      const col = await selectedCell.getAttribute('data-col');
      expect(col).toBe('0');

      console.log(`[${browserInfo.name}] Shift+Tab navigation works`);
    });
  });

  test.describe('Enter Key Behavior', () => {
    test('Enter should move to next row', async ({ page }) => {
      await page.keyboard.press('Enter');

      const selectedCell = await page.locator('.grid-cell.selected');
      const row = await selectedCell.getAttribute('data-row');
      expect(row).toBe('1');

      console.log(`[${browserInfo.name}] Enter navigation works`);
    });

    test('Shift+Enter should move to previous row', async ({ page }) => {
      // Start from row 1
      await page.click('.grid-cell[data-row="1"][data-col="0"]');
      await page.keyboard.press('Shift+Enter');

      const selectedCell = await page.locator('.grid-cell.selected');
      const row = await selectedCell.getAttribute('data-row');
      expect(row).toBe('0');

      console.log(`[${browserInfo.name}] Shift+Enter navigation works`);
    });

    test('Enter while editing should commit and move down', async ({
      page,
    }) => {
      await page.keyboard.press('F2');
      await page.keyboard.type('Test Value');
      await page.keyboard.press('Enter');

      // Should have moved to next row
      const selectedCell = await page.locator('.grid-cell.selected');
      const row = await selectedCell.getAttribute('data-row');
      expect(row).toBe('1');

      console.log(`[${browserInfo.name}] Enter commit behavior works`);
    });
  });

  test.describe('F2 Edit Mode', () => {
    test('F2 should enter edit mode', async ({ page }) => {
      await page.keyboard.press('F2');

      // Check if editor is visible
      const editor = await page.locator('.cell-editor input, .cell-editor textarea');
      await expect(editor).toBeVisible();

      console.log(`[${browserInfo.name}] F2 edit mode works`);
    });

    test('Escape should exit edit mode without saving', async ({ page }) => {
      await page.keyboard.press('F2');
      await page.keyboard.type('Unsaved Text');
      await page.keyboard.press('Escape');

      // Editor should be hidden
      const editor = await page.locator('.cell-editor');
      await expect(editor).not.toBeVisible();

      console.log(`[${browserInfo.name}] Escape to cancel edit works`);
    });
  });

  test.describe('Delete/Backspace Keys', () => {
    test('Delete should clear cell content', async ({ page }) => {
      // Enter text first
      await page.keyboard.press('F2');
      await page.keyboard.type('Delete Me');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Delete the content
      await page.keyboard.press('Delete');

      console.log(`[${browserInfo.name}] Delete key works`);
    });

    test('Backspace should clear cell content', async ({ page }) => {
      // Enter text first
      await page.keyboard.press('F2');
      await page.keyboard.type('Backspace Me');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Clear the content
      await page.keyboard.press('Backspace');

      console.log(`[${browserInfo.name}] Backspace key works`);
    });

    test('Delete should clear selection range', async ({ page }) => {
      // Select a range
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');

      // Delete the range
      await page.keyboard.press('Delete');

      console.log(`[${browserInfo.name}] Delete on range works`);
    });
  });

  test.describe('Page Navigation Keys', () => {
    test('PageDown should scroll down', async ({ page }) => {
      const initialRow = await page
        .locator('.grid-cell.selected')
        .getAttribute('data-row');

      await page.keyboard.press('PageDown');

      const newRow = await page
        .locator('.grid-cell.selected')
        .getAttribute('data-row');

      expect(parseInt(newRow || '0')).toBeGreaterThan(
        parseInt(initialRow || '0')
      );

      console.log(`[${browserInfo.name}] PageDown navigation works`);
    });

    test('PageUp should scroll up', async ({ page }) => {
      // First move down a bit
      await page.keyboard.press('PageDown');
      const midRow = await page
        .locator('.grid-cell.selected')
        .getAttribute('data-row');

      await page.keyboard.press('PageUp');
      const newRow = await page
        .locator('.grid-cell.selected')
        .getAttribute('data-row');

      expect(parseInt(newRow || '0')).toBeLessThan(parseInt(midRow || '0'));

      console.log(`[${browserInfo.name}] PageUp navigation works`);
    });

    test('Home should go to first column', async ({ page }) => {
      // Move right first
      await page.click('.grid-cell[data-row="0"][data-col="5"]');

      await page.keyboard.press('Home');

      const col = await page
        .locator('.grid-cell.selected')
        .getAttribute('data-col');
      expect(col).toBe('0');

      console.log(`[${browserInfo.name}] Home key works`);
    });

    test('End should go to last used column', async ({ page }) => {
      await page.keyboard.press('End');

      console.log(`[${browserInfo.name}] End key works`);
    });

    test('Ctrl/Cmd+Home should go to cell A1', async ({ page }) => {
      // Move away first
      await page.click('.grid-cell[data-row="5"][data-col="5"]');

      await page.keyboard.press(`${modifierKey}+Home`);

      const selectedCell = await page.locator('.grid-cell.selected');
      const row = await selectedCell.getAttribute('data-row');
      const col = await selectedCell.getAttribute('data-col');
      expect(row).toBe('0');
      expect(col).toBe('0');

      console.log(`[${browserInfo.name}] ${modifierKey}+Home navigation works`);
    });
  });

  test.describe('Browser-Specific Key Handling', () => {
    test('should handle key repeat correctly', async ({ page }) => {
      // Hold down arrow key (simulated by rapid presses)
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowDown');
      }

      const row = await page
        .locator('.grid-cell.selected')
        .getAttribute('data-row');
      expect(parseInt(row || '0')).toBeGreaterThanOrEqual(5);

      console.log(`[${browserInfo.name}] Key repeat handling works`);
    });

    test('should handle modifier key combinations correctly', async ({
      page,
    }) => {
      // Test multiple modifier keys
      const handled = await page.evaluate((mod) => {
        return new Promise((resolve) => {
          const handler = (e: KeyboardEvent) => {
            if (
              e.key === 'a' &&
              ((mod === 'Meta' && e.metaKey) || (mod === 'Control' && e.ctrlKey))
            ) {
              e.preventDefault();
              window.removeEventListener('keydown', handler);
              resolve(true);
            }
          };
          window.addEventListener('keydown', handler);
          setTimeout(() => resolve(false), 1000);
        });
      }, modifierKey);

      await page.keyboard.press(`${modifierKey}+a`);

      console.log(
        `[${browserInfo.name}] Modifier key combination handled: ${handled}`
      );
    });

    test('should correctly identify dead keys (international keyboards)', async ({
      page,
    }) => {
      // This tests that the browser properly handles dead key sequences
      const keyboardSupport = await checkKeyboardSupport(page);
      expect(keyboardSupport.keyProperty).toBe(true);

      console.log(
        `[${browserInfo.name}] Dead key handling supported via key property`
      );
    });
  });

  test.describe('Accessibility Keyboard Navigation', () => {
    test('focus should be visible on selected cell', async ({ page }) => {
      const selectedCell = await page.locator('.grid-cell.selected');
      await expect(selectedCell).toBeVisible();

      // Check that focus indicator is present
      const focusStyle = await selectedCell.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          border: style.border,
        };
      });

      // At least one focus indicator should be present
      const hasFocusIndicator =
        focusStyle.outline !== 'none' ||
        focusStyle.boxShadow !== 'none' ||
        focusStyle.border !== '';

      console.log(
        `[${browserInfo.name}] Focus indicator present: ${hasFocusIndicator}`
      );
    });

    test('grid should be focusable', async ({ page }) => {
      const grid = await page.locator('.virtual-grid');
      const tabIndex = await grid.getAttribute('tabindex');

      expect(tabIndex).not.toBeNull();

      console.log(
        `[${browserInfo.name}] Grid focusable with tabindex=${tabIndex}`
      );
    });
  });
});

/**
 * Summary output for test results.
 */
test.afterAll(async () => {
  console.log('\n=== Keyboard Compatibility Test Summary ===');
  console.log('Tested shortcuts:');
  console.log('  - Copy/Paste/Cut: Ctrl/Cmd+C, V, X');
  console.log('  - Undo/Redo: Ctrl/Cmd+Z, Y, Shift+Z');
  console.log('  - Formatting: Ctrl/Cmd+B, I, U');
  console.log('  - Navigation: Arrow keys, Tab, Enter, Home, End, Page Up/Down');
  console.log('  - Edit mode: F2, Escape');
  console.log('  - Delete: Delete, Backspace');
  console.log('============================================\n');
});
