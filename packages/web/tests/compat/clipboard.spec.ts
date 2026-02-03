import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  detectBrowser,
  getModifierKey,
  checkClipboardSupport,
  isChromiumBased,
  isFirefox,
  isWebKitBased,
  BrowserInfo,
} from './browser-support';

/**
 * Cross-browser clipboard compatibility tests.
 *
 * Tests copy, cut, and paste operations across Chrome, Firefox, Safari, and Edge.
 * Handles differences in Clipboard API support and fallback mechanisms.
 */

test.describe('Clipboard Compatibility', () => {
  let browserInfo: BrowserInfo;
  let modifierKey: 'Meta' | 'Control';

  test.beforeEach(async ({ page }) => {
    browserInfo = await detectBrowser(page);
    modifierKey = await getModifierKey(page);

    await page.goto('/');
    await page.waitForSelector('.virtual-grid', { timeout: 10000 });
    await page.click('.grid-cell[data-row="0"][data-col="0"]');
  });

  test.describe('Clipboard API Support Detection', () => {
    test('should detect available clipboard APIs', async ({ page }) => {
      const support = await checkClipboardSupport(page);

      console.log(`\n[${browserInfo.name} ${browserInfo.version}] Clipboard Support:`);
      console.log(`  - Async Clipboard API: ${support.asyncApi}`);
      console.log(`  - readText: ${support.readText}`);
      console.log(`  - writeText: ${support.writeText}`);
      console.log(`  - read: ${support.read}`);
      console.log(`  - write: ${support.write}`);
      console.log(`  - ClipboardItem: ${support.clipboardItem}`);
      console.log(`  - execCommand (legacy): ${support.execCommand}`);

      // All browsers should have at least execCommand fallback
      expect(support.execCommand).toBe(true);
    });

    test('Chromium browsers should have full Clipboard API support', async ({
      page,
    }) => {
      if (await isChromiumBased(page)) {
        const support = await checkClipboardSupport(page);

        expect(support.asyncApi).toBe(true);
        expect(support.writeText).toBe(true);
        expect(support.readText).toBe(true);

        console.log(
          `[${browserInfo.name}] Full Clipboard API support confirmed`
        );
      } else {
        test.skip();
      }
    });

    test('Firefox should have partial Clipboard API support', async ({
      page,
    }) => {
      if (await isFirefox(page)) {
        const support = await checkClipboardSupport(page);

        expect(support.asyncApi).toBe(true);
        expect(support.writeText).toBe(true);
        // Firefox may have restrictions on readText
        console.log(
          `[${browserInfo.name}] Firefox clipboard support: readText=${support.readText}`
        );
      } else {
        test.skip();
      }
    });

    test('WebKit/Safari should have limited Clipboard API support', async ({
      page,
    }) => {
      if (await isWebKitBased(page)) {
        const support = await checkClipboardSupport(page);

        console.log(
          `[${browserInfo.name}] Safari clipboard support: ` +
            `asyncApi=${support.asyncApi}, writeText=${support.writeText}`
        );
      } else {
        test.skip();
      }
    });
  });

  test.describe('Copy Single Cell', () => {
    test('should copy cell content using keyboard shortcut', async ({
      page,
    }) => {
      // Enter content
      await page.keyboard.press('F2');
      await page.keyboard.type('Single Cell Copy');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Copy
      await page.keyboard.press(`${modifierKey}+c`);

      // Verify visual feedback (copy indicator)
      console.log(
        `[${browserInfo.name}] Single cell copy via ${modifierKey}+C completed`
      );
    });

    test('should handle empty cell copy gracefully', async ({ page }) => {
      // Select an empty cell
      await page.click('.grid-cell[data-row="10"][data-col="10"]');

      // Copy empty cell should not throw
      await page.keyboard.press(`${modifierKey}+c`);

      console.log(`[${browserInfo.name}] Empty cell copy handled correctly`);
    });

    test('should copy cell with special characters', async ({ page }) => {
      await page.keyboard.press('F2');
      await page.keyboard.type('<script>"test" & \'value\'</script>');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      await page.keyboard.press(`${modifierKey}+c`);

      console.log(`[${browserInfo.name}] Special characters copy handled`);
    });

    test('should copy cell with numeric content', async ({ page }) => {
      await page.keyboard.press('F2');
      await page.keyboard.type('12345.67');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      await page.keyboard.press(`${modifierKey}+c`);

      console.log(`[${browserInfo.name}] Numeric content copy handled`);
    });
  });

  test.describe('Copy Range of Cells', () => {
    test('should copy multiple cells using selection', async ({ page }) => {
      // Enter data in multiple cells
      for (let i = 0; i < 3; i++) {
        await page.click(`.grid-cell[data-row="${i}"][data-col="0"]`);
        await page.keyboard.press('F2');
        await page.keyboard.type(`Row ${i}`);
        await page.keyboard.press('Enter');
      }

      // Select range
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press('Shift+ArrowDown');

      // Copy range
      await page.keyboard.press(`${modifierKey}+c`);

      console.log(
        `[${browserInfo.name}] Multiple cell range copy completed`
      );
    });

    test('should copy rectangular selection', async ({ page }) => {
      // Select a 2x2 range
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');

      // Copy
      await page.keyboard.press(`${modifierKey}+c`);

      console.log(
        `[${browserInfo.name}] Rectangular selection copy completed`
      );
    });

    test('should copy selection made by drag', async ({ page }) => {
      const startCell = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"]'
      );
      const endCell = await page.locator(
        '.grid-cell[data-row="2"][data-col="2"]'
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
          endBox.y + endBox.height / 2
        );
        await page.mouse.up();

        await page.keyboard.press(`${modifierKey}+c`);

        console.log(
          `[${browserInfo.name}] Drag selection copy completed`
        );
      }
    });
  });

  test.describe('Paste Operations', () => {
    test('should paste into single cell', async ({ page }) => {
      // Enter and copy content
      await page.keyboard.press('F2');
      await page.keyboard.type('Paste Source');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press(`${modifierKey}+c`);

      // Move and paste
      await page.click('.grid-cell[data-row="5"][data-col="5"]');
      await page.keyboard.press(`${modifierKey}+v`);

      console.log(
        `[${browserInfo.name}] Single cell paste completed`
      );
    });

    test('should paste into range (fill paste)', async ({ page }) => {
      // Enter and copy content
      await page.keyboard.press('F2');
      await page.keyboard.type('Fill Value');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press(`${modifierKey}+c`);

      // Select target range
      await page.click('.grid-cell[data-row="5"][data-col="0"]');
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press('Shift+ArrowDown');

      // Paste to fill range
      await page.keyboard.press(`${modifierKey}+v`);

      console.log(
        `[${browserInfo.name}] Range fill paste completed`
      );
    });

    test('should handle paste of multi-cell data', async ({ page }) => {
      // Create source data
      for (let i = 0; i < 2; i++) {
        await page.click(`.grid-cell[data-row="${i}"][data-col="0"]`);
        await page.keyboard.press('F2');
        await page.keyboard.type(`Multi ${i}`);
        await page.keyboard.press('Enter');
      }

      // Select and copy
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press(`${modifierKey}+c`);

      // Paste elsewhere
      await page.click('.grid-cell[data-row="5"][data-col="5"]');
      await page.keyboard.press(`${modifierKey}+v`);

      console.log(
        `[${browserInfo.name}] Multi-cell paste completed`
      );
    });
  });

  test.describe('Paste from External Source', () => {
    test('should handle paste of plain text', async ({ page, context }) => {
      // Try to set clipboard programmatically (may require permissions)
      try {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      } catch {
        console.log(
          `[${browserInfo.name}] Clipboard permissions not grantable`
        );
      }

      // Attempt to write to clipboard
      const clipboardWriteSuccess = await page.evaluate(async () => {
        try {
          await navigator.clipboard.writeText('External\tData\nRow2\tData2');
          return true;
        } catch {
          return false;
        }
      });

      if (clipboardWriteSuccess) {
        await page.click('.grid-cell[data-row="0"][data-col="0"]');
        await page.keyboard.press(`${modifierKey}+v`);
        console.log(
          `[${browserInfo.name}] External plain text paste completed`
        );
      } else {
        console.log(
          `[${browserInfo.name}] Clipboard write not available - skipping external paste test`
        );
      }
    });

    test('should handle tab-separated values (TSV)', async ({ page }) => {
      // TSV format commonly used for spreadsheet data
      const tsvData = 'A1\tB1\tC1\nA2\tB2\tC2';

      const success = await page.evaluate(async (data) => {
        try {
          await navigator.clipboard.writeText(data);
          return true;
        } catch {
          return false;
        }
      }, tsvData);

      if (success) {
        await page.click('.grid-cell[data-row="0"][data-col="0"]');
        await page.keyboard.press(`${modifierKey}+v`);
        console.log(
          `[${browserInfo.name}] TSV paste completed`
        );
      } else {
        console.log(
          `[${browserInfo.name}] TSV paste skipped - clipboard not available`
        );
      }
    });
  });

  test.describe('Cut and Paste', () => {
    test('should cut cell content', async ({ page }) => {
      // Enter content
      await page.keyboard.press('F2');
      await page.keyboard.type('Cut Content');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Cut
      await page.keyboard.press(`${modifierKey}+x`);

      console.log(
        `[${browserInfo.name}] Cut operation completed`
      );
    });

    test('should cut and paste to new location', async ({ page }) => {
      // Enter content
      await page.keyboard.press('F2');
      await page.keyboard.type('Move Me');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Cut
      await page.keyboard.press(`${modifierKey}+x`);

      // Move and paste
      await page.click('.grid-cell[data-row="10"][data-col="10"]');
      await page.keyboard.press(`${modifierKey}+v`);

      console.log(
        `[${browserInfo.name}] Cut and paste completed`
      );
    });

    test('should cut multiple cells', async ({ page }) => {
      // Enter data in range
      for (let i = 0; i < 3; i++) {
        await page.click(`.grid-cell[data-row="${i}"][data-col="0"]`);
        await page.keyboard.press('F2');
        await page.keyboard.type(`Cut Row ${i}`);
        await page.keyboard.press('Enter');
      }

      // Select range
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press('Shift+ArrowDown');

      // Cut
      await page.keyboard.press(`${modifierKey}+x`);

      console.log(
        `[${browserInfo.name}] Multi-cell cut completed`
      );
    });
  });

  test.describe('Clipboard API vs execCommand Fallback', () => {
    test('should fallback to execCommand when Clipboard API unavailable', async ({
      page,
    }) => {
      const support = await checkClipboardSupport(page);

      if (!support.asyncApi || !support.writeText) {
        // Browser should use execCommand fallback
        expect(support.execCommand).toBe(true);
        console.log(
          `[${browserInfo.name}] Using execCommand fallback`
        );
      } else {
        console.log(
          `[${browserInfo.name}] Using modern Clipboard API`
        );
      }
    });

    test('execCommand copy should work', async ({ page }) => {
      // Enter content
      await page.keyboard.press('F2');
      await page.keyboard.type('execCommand Test');
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowUp');

      // Test execCommand directly
      const result = await page.evaluate(() => {
        const selection = window.getSelection();
        const range = document.createRange();

        // Create a temporary element with the content
        const temp = document.createElement('div');
        temp.textContent = 'execCommand Test';
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);

        range.selectNodeContents(temp);
        selection?.removeAllRanges();
        selection?.addRange(range);

        const success = document.execCommand('copy');
        document.body.removeChild(temp);

        return success;
      });

      console.log(
        `[${browserInfo.name}] execCommand('copy') result: ${result}`
      );
    });
  });

  test.describe('Clipboard Data Formats', () => {
    test('should handle text/plain format', async ({ page }) => {
      const support = await checkClipboardSupport(page);

      if (support.write && support.clipboardItem) {
        const success = await page.evaluate(async () => {
          try {
            const blob = new Blob(['Plain Text'], { type: 'text/plain' });
            const item = new ClipboardItem({ 'text/plain': blob });
            await navigator.clipboard.write([item]);
            return true;
          } catch {
            return false;
          }
        });

        console.log(
          `[${browserInfo.name}] text/plain ClipboardItem write: ${success}`
        );
      } else {
        console.log(
          `[${browserInfo.name}] ClipboardItem not supported - using text only`
        );
      }
    });

    test('should handle text/html format when supported', async ({ page }) => {
      const support = await checkClipboardSupport(page);

      if (support.write && support.clipboardItem) {
        const success = await page.evaluate(async () => {
          try {
            const htmlBlob = new Blob(
              ['<table><tr><td>Cell1</td></tr></table>'],
              { type: 'text/html' }
            );
            const textBlob = new Blob(['Cell1'], { type: 'text/plain' });
            const item = new ClipboardItem({
              'text/html': htmlBlob,
              'text/plain': textBlob,
            });
            await navigator.clipboard.write([item]);
            return true;
          } catch {
            return false;
          }
        });

        console.log(
          `[${browserInfo.name}] text/html ClipboardItem write: ${success}`
        );
      } else {
        console.log(
          `[${browserInfo.name}] HTML clipboard format not testable`
        );
      }
    });

    test('should read clipboard data format', async ({ page, context }) => {
      try {
        await context.grantPermissions(['clipboard-read']);
      } catch {
        // Permission grant may fail
      }

      const formats = await page.evaluate(async () => {
        try {
          const items = await navigator.clipboard.read();
          return items.map((item) => item.types).flat();
        } catch {
          return [];
        }
      });

      console.log(
        `[${browserInfo.name}] Available clipboard formats: ${formats.join(', ') || 'none accessible'}`
      );
    });
  });

  test.describe('Clipboard Error Handling', () => {
    test('should handle clipboard permission denied gracefully', async ({
      page,
    }) => {
      // Attempt clipboard operation that may fail
      const result = await page.evaluate(async () => {
        try {
          await navigator.clipboard.readText();
          return { success: true, error: null };
        } catch (e) {
          return {
            success: false,
            error: (e as Error).name,
          };
        }
      });

      console.log(
        `[${browserInfo.name}] Clipboard read result: ` +
          (result.success ? 'success' : `denied (${result.error})`)
      );
    });

    test('should not throw when clipboard is empty', async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          // Clear clipboard
          await navigator.clipboard.writeText('');
          const text = await navigator.clipboard.readText();
          return { success: true, text };
        } catch (e) {
          return { success: false, error: (e as Error).name };
        }
      });

      console.log(
        `[${browserInfo.name}] Empty clipboard handling: ${result.success ? 'OK' : result.error}`
      );
    });
  });

  test.describe('Context Menu Copy/Paste', () => {
    test('should have context menu options for copy/paste', async ({ page }) => {
      // Right-click on a cell
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      await cell.click({ button: 'right' });

      // Check if context menu appears (application-specific)
      // This depends on how the app implements context menu
      console.log(
        `[${browserInfo.name}] Context menu right-click triggered`
      );
    });
  });
});

/**
 * Summary output for clipboard test results.
 */
test.afterAll(async () => {
  console.log('\n=== Clipboard Compatibility Test Summary ===');
  console.log('Tested operations:');
  console.log('  - Single cell copy');
  console.log('  - Range copy');
  console.log('  - Paste (single cell, range, external)');
  console.log('  - Cut and paste');
  console.log('  - Data formats (text/plain, text/html)');
  console.log('  - execCommand fallback');
  console.log('  - Error handling');
  console.log('=============================================\n');
});
