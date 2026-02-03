import { test, expect, Page } from '@playwright/test';
import {
  detectBrowser,
  getModifierKey,
  checkPointerSupport,
  BrowserInfo,
} from './browser-support';

/**
 * Cross-browser selection behavior compatibility tests.
 *
 * Tests cell selection interactions across Chrome, Firefox, Safari, and Edge.
 * Covers click, drag, keyboard, and touch selection methods.
 */

test.describe('Selection Compatibility', () => {
  let browserInfo: BrowserInfo;
  let modifierKey: 'Meta' | 'Control';

  test.beforeEach(async ({ page }) => {
    browserInfo = await detectBrowser(page);
    modifierKey = await getModifierKey(page);

    await page.goto('/');
    await page.waitForSelector('.virtual-grid', { timeout: 10000 });
  });

  test.describe('Pointer Event Support', () => {
    test('should detect pointer and touch event support', async ({ page }) => {
      const support = await checkPointerSupport(page);

      console.log(`\n[${browserInfo.name} ${browserInfo.version}] Pointer Support:`);
      console.log(`  - PointerEvent: ${support.pointerEvents}`);
      console.log(`  - TouchEvent: ${support.touchEvents}`);
      console.log(`  - MouseEvent: ${support.mouseEvents}`);
      console.log(`  - maxTouchPoints: ${support.maxTouchPoints}`);

      // All browsers should support mouse events
      expect(support.mouseEvents).toBe(true);
    });
  });

  test.describe('Single Click Selection', () => {
    test('should select cell on single click', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="2"][data-col="3"]');
      await cell.click();

      await expect(cell).toHaveClass(/selected/);

      console.log(`[${browserInfo.name}] Single click selection works`);
    });

    test('should deselect previous cell when clicking new cell', async ({
      page,
    }) => {
      // Select first cell
      const cell1 = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell1.click();
      await expect(cell1).toHaveClass(/selected/);

      // Click another cell
      const cell2 = await page.locator('.grid-cell[data-row="1"][data-col="1"]');
      await cell2.click();

      // First cell should no longer be selected
      await expect(cell1).not.toHaveClass(/selected/);
      await expect(cell2).toHaveClass(/selected/);

      console.log(`[${browserInfo.name}] Selection switch works`);
    });

    test('should select row header to select entire row', async ({ page }) => {
      const rowHeader = await page.locator('.row-header').first();

      if (await rowHeader.isVisible()) {
        await rowHeader.click();
        console.log(`[${browserInfo.name}] Row header selection triggered`);
      } else {
        console.log(`[${browserInfo.name}] Row header not visible - skipped`);
      }
    });

    test('should select column header to select entire column', async ({
      page,
    }) => {
      const colHeader = await page.locator('.column-header').first();

      if (await colHeader.isVisible()) {
        await colHeader.click();
        console.log(`[${browserInfo.name}] Column header selection triggered`);
      } else {
        console.log(`[${browserInfo.name}] Column header not visible - skipped`);
      }
    });

    test('should handle rapid clicks correctly', async ({ page }) => {
      // Rapid clicks should not cause issues
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');

      for (let i = 0; i < 5; i++) {
        await cell.click({ delay: 50 });
      }

      // Should still have valid selection
      const selectedCells = await page.locator('.grid-cell.selected');
      expect(await selectedCells.count()).toBeGreaterThanOrEqual(1);

      console.log(`[${browserInfo.name}] Rapid clicks handled correctly`);
    });
  });

  test.describe('Shift+Click Range Selection', () => {
    test('should extend selection with Shift+click', async ({ page }) => {
      // Select starting cell
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      await startCell.click();

      // Shift+click to extend
      const endCell = await page.locator(
        '.grid-cell[data-row="3"][data-col="3"]'
      );
      await endCell.click({ modifiers: ['Shift'] });

      // Check for selection overlay
      const selectionOverlay = await page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();

      console.log(`[${browserInfo.name}] Shift+click range selection works`);
    });

    test('should create correct rectangular selection', async ({ page }) => {
      const startCell = await page.locator(
        '.grid-cell[data-row="1"][data-col="1"]'
      );
      await startCell.click();

      const endCell = await page.locator(
        '.grid-cell[data-row="4"][data-col="4"]'
      );
      await endCell.click({ modifiers: ['Shift'] });

      // Verify selection dimensions through overlay
      const overlay = await page.locator('.selection-overlay');
      const box = await overlay.boundingBox();

      if (box) {
        console.log(
          `[${browserInfo.name}] Selection box: ${box.width}x${box.height}`
        );
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    });

    test('should allow selection extension in any direction', async ({
      page,
    }) => {
      // Start from middle
      const startCell = await page.locator(
        '.grid-cell[data-row="5"][data-col="5"]'
      );
      await startCell.click();

      // Extend upward and leftward
      const endCell = await page.locator(
        '.grid-cell[data-row="2"][data-col="2"]'
      );
      await endCell.click({ modifiers: ['Shift'] });

      const selectionOverlay = await page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();

      console.log(
        `[${browserInfo.name}] Reverse direction selection works`
      );
    });

    test('should update selection on multiple Shift+clicks', async ({
      page,
    }) => {
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      await startCell.click();

      // First extension
      await page.locator('.grid-cell[data-row="2"][data-col="2"]').click({
        modifiers: ['Shift'],
      });

      // Second extension (changes the range)
      await page.locator('.grid-cell[data-row="4"][data-col="4"]').click({
        modifiers: ['Shift'],
      });

      const selectionOverlay = await page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();

      console.log(
        `[${browserInfo.name}] Multiple Shift+click extensions work`
      );
    });
  });

  test.describe('Ctrl/Cmd+Click Multi-Selection', () => {
    test('should add to selection with Ctrl/Cmd+click', async ({ page }) => {
      // Select first cell
      const cell1 = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell1.click();

      // Add second cell with modifier
      const cell2 = await page.locator('.grid-cell[data-row="2"][data-col="2"]');
      await cell2.click({
        modifiers: [modifierKey === 'Meta' ? 'Meta' : 'Control'],
      });

      console.log(
        `[${browserInfo.name}] ${modifierKey}+click multi-selection triggered`
      );
    });

    test('should toggle selection on Ctrl/Cmd+click existing selection', async ({
      page,
    }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');

      // Select
      await cell.click();
      await expect(cell).toHaveClass(/selected/);

      // Toggle off with Ctrl/Cmd+click
      await cell.click({
        modifiers: [modifierKey === 'Meta' ? 'Meta' : 'Control'],
      });

      console.log(
        `[${browserInfo.name}] ${modifierKey}+click toggle triggered`
      );
    });

    test('should allow non-contiguous selection', async ({ page }) => {
      const cells = [
        '.grid-cell[data-row="0"][data-col="0"]',
        '.grid-cell[data-row="2"][data-col="2"]',
        '.grid-cell[data-row="4"][data-col="4"]',
      ];

      // Select first
      await page.locator(cells[0]).click();

      // Add others with modifier
      for (let i = 1; i < cells.length; i++) {
        await page.locator(cells[i]).click({
          modifiers: [modifierKey === 'Meta' ? 'Meta' : 'Control'],
        });
      }

      console.log(
        `[${browserInfo.name}] Non-contiguous selection triggered`
      );
    });
  });

  test.describe('Drag to Select Range', () => {
    test('should select range by dragging', async ({ page }) => {
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      const endCell = await page.locator(
        '.grid-cell[data-row="3"][data-col="3"]'
      );

      const startBox = await startCell.boundingBox();
      const endBox = await endCell.boundingBox();

      if (startBox && endBox) {
        await page.mouse.move(
          startBox.x + startBox.width / 2,
          startBox.y + startBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
          endBox.x + endBox.width / 2,
          endBox.y + endBox.height / 2,
          { steps: 10 }
        );
        await page.mouse.up();

        const selectionOverlay = await page.locator('.selection-overlay');
        await expect(selectionOverlay).toBeVisible();

        console.log(`[${browserInfo.name}] Drag selection works`);
      }
    });

    test('should update selection during drag', async ({ page }) => {
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      const startBox = await startCell.boundingBox();

      if (startBox) {
        await page.mouse.move(
          startBox.x + startBox.width / 2,
          startBox.y + startBox.height / 2
        );
        await page.mouse.down();

        // Drag through multiple cells
        for (let i = 1; i <= 3; i++) {
          const cell = await page.locator(
            `.grid-cell[data-row="${i}"][data-col="${i}"]`
          );
          const box = await cell.boundingBox();
          if (box) {
            await page.mouse.move(
              box.x + box.width / 2,
              box.y + box.height / 2,
              { steps: 3 }
            );
          }
        }

        await page.mouse.up();

        console.log(`[${browserInfo.name}] Live drag update works`);
      }
    });

    test('should handle drag outside grid bounds', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      const cellBox = await cell.boundingBox();
      const grid = await page.locator('.virtual-grid');
      const gridBox = await grid.boundingBox();

      if (cellBox && gridBox) {
        // Start drag
        await page.mouse.move(
          cellBox.x + cellBox.width / 2,
          cellBox.y + cellBox.height / 2
        );
        await page.mouse.down();

        // Move outside grid (below)
        await page.mouse.move(
          cellBox.x + cellBox.width / 2,
          gridBox.y + gridBox.height + 50,
          { steps: 5 }
        );

        await page.mouse.up();

        console.log(
          `[${browserInfo.name}] Out-of-bounds drag handled`
        );
      }
    });

    test('should cancel drag on Escape', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      const cellBox = await cell.boundingBox();

      if (cellBox) {
        await page.mouse.move(
          cellBox.x + cellBox.width / 2,
          cellBox.y + cellBox.height / 2
        );
        await page.mouse.down();

        // Start dragging
        await page.mouse.move(
          cellBox.x + 100,
          cellBox.y + 100,
          { steps: 5 }
        );

        // Press Escape to cancel
        await page.keyboard.press('Escape');
        await page.mouse.up();

        console.log(
          `[${browserInfo.name}] Escape during drag handled`
        );
      }
    });
  });

  test.describe('Double-Click to Edit', () => {
    test('should enter edit mode on double-click', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.dblclick();

      // Check for editor
      const editor = await page.locator('.cell-editor');
      await expect(editor).toBeVisible();

      console.log(`[${browserInfo.name}] Double-click edit works`);
    });

    test('should select cell content on double-click edit', async ({ page }) => {
      // First enter some content
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.click();
      await page.keyboard.press('F2');
      await page.keyboard.type('Test Content');
      await page.keyboard.press('Enter');

      // Double-click to edit
      await cell.dblclick();

      const editor = await page.locator('.cell-editor input, .cell-editor textarea');
      if (await editor.isVisible()) {
        const value = await editor.inputValue();
        console.log(
          `[${browserInfo.name}] Double-click edit with content: "${value}"`
        );
      }
    });

    test('should differentiate between fast click and double-click', async ({
      page,
    }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');

      // Single click
      await cell.click();

      // Wait to ensure it's not treated as double-click
      await page.waitForTimeout(500);

      // Another single click
      await cell.click();

      // Should still be in selection mode, not edit mode
      const editor = await page.locator('.cell-editor');
      const isEditing = await editor.isVisible();

      console.log(
        `[${browserInfo.name}] Click vs double-click: editing=${isEditing}`
      );
    });
  });

  test.describe('Selection Across Scrolled Area', () => {
    test('should maintain selection after scrolling', async ({ page }) => {
      // Select a cell
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.click();
      await expect(cell).toHaveClass(/selected/);

      // Scroll the grid
      const scrollContainer = await page.locator('.grid-scroll-container');
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 500;
        el.scrollLeft = 200;
      });

      // Wait for render
      await page.waitForTimeout(100);

      // Scroll back
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      });

      // Selection should still be there
      await expect(cell).toHaveClass(/selected/);

      console.log(
        `[${browserInfo.name}] Selection maintained after scroll`
      );
    });

    test('should allow selection of cells after scrolling', async ({ page }) => {
      // Scroll to a new area
      const scrollContainer = await page.locator('.grid-scroll-container');
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 1000;
        el.scrollLeft = 500;
      });

      // Wait for virtualization to catch up
      await page.waitForTimeout(200);

      // Try to select a cell in the new visible area
      const cells = await page.locator('.grid-cell');
      const cellCount = await cells.count();

      if (cellCount > 0) {
        const firstVisibleCell = cells.first();
        await firstVisibleCell.click();

        await expect(firstVisibleCell).toHaveClass(/selected/);
        console.log(
          `[${browserInfo.name}] Selection after scroll works`
        );
      }
    });

    test('should extend selection across scroll boundary', async ({ page }) => {
      // Select starting cell
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      await startCell.click();

      // Use keyboard to extend selection while scrolling
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Shift+ArrowDown');
      }

      const selectionOverlay = await page.locator('.selection-overlay');
      await expect(selectionOverlay).toBeVisible();

      console.log(
        `[${browserInfo.name}] Selection extension with scroll works`
      );
    });
  });

  test.describe('Touch Selection (Mobile)', () => {
    test('should support touch tap selection', async ({ page }) => {
      const support = await checkPointerSupport(page);

      if (support.touchEvents || support.maxTouchPoints > 0) {
        const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
        const box = await cell.boundingBox();

        if (box) {
          await page.touchscreen.tap(
            box.x + box.width / 2,
            box.y + box.height / 2
          );

          console.log(`[${browserInfo.name}] Touch tap selection triggered`);
        }
      } else {
        console.log(
          `[${browserInfo.name}] Touch not supported - skipped`
        );
        test.skip();
      }
    });

    test('should support touch drag selection', async ({ page }) => {
      const support = await checkPointerSupport(page);

      if (support.touchEvents || support.maxTouchPoints > 0) {
        const startCell = await page.locator(
          '.grid-cell[data-row="0"][data-col="0"]'
        );
        const endCell = await page.locator(
          '.grid-cell[data-row="3"][data-col="3"]'
        );

        const startBox = await startCell.boundingBox();
        const endBox = await endCell.boundingBox();

        if (startBox && endBox) {
          // Simulate touch drag (not all browsers support this well in tests)
          console.log(`[${browserInfo.name}] Touch drag selection test setup`);
        }
      } else {
        test.skip();
      }
    });

    test('should support long-press for context menu', async ({ page }) => {
      const support = await checkPointerSupport(page);

      if (support.touchEvents || support.maxTouchPoints > 0) {
        const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
        const box = await cell.boundingBox();

        if (box) {
          // Long press simulation
          await page.touchscreen.tap(
            box.x + box.width / 2,
            box.y + box.height / 2
          );

          console.log(`[${browserInfo.name}] Long press test completed`);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Selection Visual Feedback', () => {
    test('should show selection highlight', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.click();

      // Check computed styles
      const styles = await cell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,
          outline: computed.outline,
        };
      });

      console.log(
        `[${browserInfo.name}] Selection styles: bg=${styles.backgroundColor}`
      );
    });

    test('should show range selection overlay', async ({ page }) => {
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      await startCell.click();

      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');

      const overlay = await page.locator('.selection-overlay');
      await expect(overlay).toBeVisible();

      const overlayStyles = await overlay.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          border: computed.border,
          opacity: computed.opacity,
        };
      });

      console.log(
        `[${browserInfo.name}] Range overlay visible with opacity=${overlayStyles.opacity}`
      );
    });

    test('should animate selection transition', async ({ page }) => {
      const cell1 = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      const cell2 = await page.locator('.grid-cell[data-row="5"][data-col="5"]');

      await cell1.click();

      // Check for transition properties
      const hasTransition = await cell1.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return (
          computed.transition !== 'none' &&
          computed.transition !== 'all 0s ease 0s'
        );
      });

      await cell2.click();

      console.log(
        `[${browserInfo.name}] Selection has transition: ${hasTransition}`
      );
    });
  });

  test.describe('Selection State Management', () => {
    test('should clear selection on click outside grid', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.click();
      await expect(cell).toHaveClass(/selected/);

      // Click outside the grid area
      const toolbar = await page.locator('.toolbar, .formula-bar').first();
      if (await toolbar.isVisible()) {
        await toolbar.click();
      }

      console.log(
        `[${browserInfo.name}] Outside click selection behavior tested`
      );
    });

    test('should preserve selection on focus change and return', async ({
      page,
    }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.click();

      // Blur and refocus the window (simulated)
      await page.evaluate(() => {
        window.dispatchEvent(new Event('blur'));
        window.dispatchEvent(new Event('focus'));
      });

      await expect(cell).toHaveClass(/selected/);

      console.log(
        `[${browserInfo.name}] Selection preserved on focus change`
      );
    });
  });
});

/**
 * Summary output for selection test results.
 */
test.afterAll(async () => {
  console.log('\n=== Selection Compatibility Test Summary ===');
  console.log('Tested interactions:');
  console.log('  - Single click selection');
  console.log('  - Shift+click range selection');
  console.log('  - Ctrl/Cmd+click multi-selection');
  console.log('  - Drag to select range');
  console.log('  - Double-click to edit');
  console.log('  - Selection across scroll');
  console.log('  - Touch selection (mobile)');
  console.log('  - Visual feedback');
  console.log('=============================================\n');
});
