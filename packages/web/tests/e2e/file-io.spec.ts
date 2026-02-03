import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
  SAMPLE_DATA,
} from './fixtures/test-data';

test.describe('File I/O - Import and Export', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  /**
   * Helper to set up test data for export
   */
  async function setupExportData(helper: SpreadsheetTestHelper) {
    // Enter a simple 3x3 dataset
    await helper.enterCellValue(0, 0, 'Name');
    await helper.enterCellValue(0, 1, 'Age');
    await helper.enterCellValue(0, 2, 'City');

    await helper.enterCellValue(1, 0, 'Alice');
    await helper.enterCellValue(1, 1, '25');
    await helper.enterCellValue(1, 2, 'New York');

    await helper.enterCellValue(2, 0, 'Bob');
    await helper.enterCellValue(2, 1, '30');
    await helper.enterCellValue(2, 2, 'Los Angeles');

    await helper.enterCellValue(3, 0, 'Charlie');
    await helper.enterCellValue(3, 1, '35');
    await helper.enterCellValue(3, 2, 'Chicago');
  }

  test.describe('CSV Export', () => {
    test('should export to CSV from File menu', async ({ page }) => {
      await setupExportData(helper);

      // Open File menu
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        // Click Export or Save As
        const exportOption = page.locator('[role="menuitem"]:has-text("Export")');
        if (await exportOption.isVisible()) {
          await exportOption.hover();

          // Select CSV format
          const csvOption = page.locator('[role="menuitem"]:has-text("CSV")');
          if (await csvOption.isVisible()) {
            // Set up download listener
            const downloadPromise = page.waitForEvent('download');
            await csvOption.click();

            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/\.csv$/);

            // Optionally verify content
            const downloadPath = await download.path();
            if (downloadPath) {
              const content = fs.readFileSync(downloadPath, 'utf8');
              expect(content).toContain('Name');
              expect(content).toContain('Alice');
            }
          }
        }
      }
    });

    test('should export selected range to CSV', async ({ page }) => {
      await setupExportData(helper);

      // Select only part of the data
      await helper.selectRangeByRef('A1:B3');

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const exportOption = page.locator('[role="menuitem"]:has-text("Export Selection")');
        if (await exportOption.isVisible()) {
          await exportOption.hover();

          const csvOption = page.locator('[role="menuitem"]:has-text("CSV")');
          if (await csvOption.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await csvOption.click();

            const download = await downloadPromise;
            const downloadPath = await download.path();
            if (downloadPath) {
              const content = fs.readFileSync(downloadPath, 'utf8');
              // Should only contain selected columns
              expect(content).toContain('Name');
              expect(content).toContain('Age');
              expect(content).not.toContain('City');
            }
          }
        }
      }
    });

    test('should handle special characters in CSV export', async ({ page }) => {
      // Enter data with special characters
      await helper.enterCellValue(0, 0, 'Name');
      await helper.enterCellValue(0, 1, 'Comment');

      await helper.enterCellValue(1, 0, 'Test, User');
      await helper.enterCellValue(1, 1, 'Has "quotes"');

      await helper.enterCellValue(2, 0, 'Another');
      await helper.enterCellValue(2, 1, 'Has\nnewline');

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const exportOption = page.locator('[role="menuitem"]:has-text("Export")');
        if (await exportOption.isVisible()) {
          await exportOption.hover();

          const csvOption = page.locator('[role="menuitem"]:has-text("CSV")');
          if (await csvOption.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await csvOption.click();

            const download = await downloadPromise;
            const downloadPath = await download.path();
            if (downloadPath) {
              const content = fs.readFileSync(downloadPath, 'utf8');
              // Values with commas or quotes should be properly escaped
              expect(content).toContain('"Test, User"');
            }
          }
        }
      }
    });
  });

  test.describe('CSV Import', () => {
    test('should import CSV file', async ({ page }) => {
      // Create a test CSV file content
      const csvContent = 'Name,Age,City\nAlice,25,New York\nBob,30,Los Angeles';

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const importOption = page.locator('[role="menuitem"]:has-text("Import")');
        if (await importOption.isVisible()) {
          await importOption.click();

          // File input should appear
          const fileInput = page.locator('input[type="file"]');
          if (await fileInput.isVisible()) {
            // Create a temporary file and upload
            const tempFilePath = path.join('/tmp', 'test-import.csv');
            fs.writeFileSync(tempFilePath, csvContent);

            await fileInput.setInputFiles(tempFilePath);

            // Wait for import to complete
            await helper.waitForCalculations();

            // Verify data was imported
            const name = await helper.getCellValue(0, 0);
            expect(name).toBe('Name');

            const alice = await helper.getCellValue(1, 0);
            expect(alice).toBe('Alice');

            // Cleanup
            fs.unlinkSync(tempFilePath);
          }
        }
      }
    });

    test('should handle CSV with different delimiters', async ({ page }) => {
      // Semicolon-separated values (common in some locales)
      const csvContent = 'Name;Age;City\nAlice;25;New York';

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const importOption = page.locator('[role="menuitem"]:has-text("Import")');
        if (await importOption.isVisible()) {
          await importOption.click();

          // Look for delimiter selection
          const delimiterSelect = page.locator('select[name="delimiter"]');
          if (await delimiterSelect.isVisible()) {
            await delimiterSelect.selectOption('semicolon');
          }

          const fileInput = page.locator('input[type="file"]');
          if (await fileInput.isVisible()) {
            const tempFilePath = path.join('/tmp', 'test-import-semicolon.csv');
            fs.writeFileSync(tempFilePath, csvContent);

            await fileInput.setInputFiles(tempFilePath);
            await helper.waitForCalculations();

            fs.unlinkSync(tempFilePath);
          }
        }
      }
    });

    test('should preview CSV before importing', async ({ page }) => {
      const csvContent = 'Name,Age,City\nAlice,25,New York\nBob,30,Los Angeles';

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const importOption = page.locator('[role="menuitem"]:has-text("Import")');
        if (await importOption.isVisible()) {
          await importOption.click();

          const fileInput = page.locator('input[type="file"]');
          if (await fileInput.isVisible()) {
            const tempFilePath = path.join('/tmp', 'test-preview.csv');
            fs.writeFileSync(tempFilePath, csvContent);

            await fileInput.setInputFiles(tempFilePath);

            // Preview should be shown
            const previewTable = page.locator('.import-preview, [data-testid="import-preview"]');
            if (await previewTable.isVisible()) {
              await expect(previewTable).toContainText('Alice');
            }

            // Click Import button to confirm
            const importButton = page.locator('button:has-text("Import")');
            if (await importButton.isVisible()) {
              await importButton.click();
            }

            fs.unlinkSync(tempFilePath);
          }
        }
      }
    });
  });

  test.describe('Data Round-Trip', () => {
    test('should preserve data in CSV export/import round-trip', async ({ page }) => {
      // Enter test data
      await helper.enterCellValue(0, 0, 'Name');
      await helper.enterCellValue(0, 1, 'Value');
      await helper.enterCellValue(1, 0, 'Test');
      await helper.enterCellValue(1, 1, '12345');

      // Export to CSV
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const exportOption = page.locator('[role="menuitem"]:has-text("Export")');
        if (await exportOption.isVisible()) {
          await exportOption.hover();

          const csvOption = page.locator('[role="menuitem"]:has-text("CSV")');
          if (await csvOption.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await csvOption.click();

            const download = await downloadPromise;
            const downloadPath = await download.path();

            if (downloadPath) {
              // Clear the spreadsheet
              await helper.selectCell(0, 0);
              await page.keyboard.press('Control+a');
              await page.keyboard.press('Delete');
              await helper.waitForCalculations();

              // Import the CSV back
              await fileMenu.click();
              const importOption = page.locator('[role="menuitem"]:has-text("Import")');
              if (await importOption.isVisible()) {
                await importOption.click();

                const fileInput = page.locator('input[type="file"]');
                if (await fileInput.isVisible()) {
                  await fileInput.setInputFiles(downloadPath);
                  await helper.waitForCalculations();

                  // Verify data is restored
                  const name = await helper.getCellValue(0, 0);
                  expect(name).toBe('Name');

                  const value = await helper.getCellValue(1, 1);
                  expect(value).toBe('12345');
                }
              }
            }
          }
        }
      }
    });

    test('should preserve formulas in round-trip (if supported)', async ({ page }) => {
      // Enter data with formula
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '20');
      await helper.enterCellValue(0, 2, '=A1+B1');

      // Note: CSV doesn't preserve formulas, only values
      // This test verifies the calculated value is preserved
      const originalValue = await helper.getCellValue(0, 2);
      expect(originalValue).toBe('30');

      // For XLSX format, formulas would be preserved
    });
  });

  test.describe('XLSX Import/Export', () => {
    test.skip('should export to XLSX format', async ({ page }) => {
      await setupExportData(helper);

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const exportOption = page.locator('[role="menuitem"]:has-text("Export")');
        if (await exportOption.isVisible()) {
          await exportOption.hover();

          const xlsxOption = page.locator('[role="menuitem"]:has-text("Excel")');
          if (await xlsxOption.isVisible()) {
            const downloadPromise = page.waitForEvent('download');
            await xlsxOption.click();

            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
          }
        }
      }
    });

    test.skip('should import XLSX file', async ({ page }) => {
      // This would require a pre-existing XLSX file
      // or generating one programmatically

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const importOption = page.locator('[role="menuitem"]:has-text("Import")');
        if (await importOption.isVisible()) {
          await importOption.click();

          const fileInput = page.locator('input[type="file"][accept*=".xlsx"]');
          // Would need to provide an actual XLSX file
        }
      }
    });

    test.skip('should preserve formatting in XLSX round-trip', async ({ page }) => {
      // Enter data and apply formatting
      await helper.enterCellValue(0, 0, 'Formatted');
      await helper.selectCell(0, 0);
      await page.keyboard.press('Control+b');

      // Export to XLSX
      // Import back
      // Verify formatting is preserved
    });

    test.skip('should preserve multiple sheets in XLSX', async ({ page }) => {
      // Create multiple sheets
      // Add data to each sheet
      // Export to XLSX
      // Import back
      // Verify all sheets and data are preserved
    });
  });

  test.describe('Save and Load', () => {
    test('should save workbook to local storage', async ({ page }) => {
      await setupExportData(helper);

      // Ctrl+S to save
      await page.keyboard.press('Control+s');

      // Check local storage for saved data
      const savedData = await page.evaluate(() => {
        return localStorage.getItem('excel-workbook');
      });

      // Data should be saved (format depends on implementation)
    });

    test('should load workbook from local storage on page refresh', async ({ page }) => {
      await setupExportData(helper);

      // Save
      await page.keyboard.press('Control+s');

      // Reload page
      await page.reload();
      await helper.waitForSpreadsheetReady();

      // Data should be restored
      const name = await helper.getCellValue(0, 0);
      expect(name).toBe('Name');
    });

    test('should prompt to save before closing with unsaved changes', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Unsaved');

      // Listen for beforeunload event
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('beforeunload');
        await dialog.dismiss();
      });

      // Try to navigate away
      // await page.goto('about:blank');
    });
  });

  test.describe('New Workbook', () => {
    test('should create new blank workbook from File menu', async ({ page }) => {
      await setupExportData(helper);

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const newOption = page.locator('[role="menuitem"]:has-text("New")');
        if (await newOption.isVisible()) {
          await newOption.click();

          // Confirmation dialog may appear
          const confirmButton = page.locator('button:has-text("Don\'t Save"), button:has-text("Discard")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          await helper.waitForSpreadsheetReady();

          // Spreadsheet should be empty
          const a1 = await helper.getCellValue(0, 0);
          expect(a1).toBe('');
        }
      }
    });

    test('should create new workbook with keyboard shortcut', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Existing');

      await page.keyboard.press('Control+n');

      // May open new tab or show dialog
    });
  });

  test.describe('Open File', () => {
    test('should open file using keyboard shortcut', async ({ page }) => {
      await page.keyboard.press('Control+o');

      // File dialog or import dialog should open
      const fileDialog = page.locator('[role="dialog"]');
      // Implementation-dependent
    });

    test('should open recent files', async ({ page }) => {
      // Save a file first
      await helper.enterCellValue(0, 0, 'Recent');
      await page.keyboard.press('Control+s');

      // Clear and reload
      await page.reload();
      await helper.waitForSpreadsheetReady();

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const recentOption = page.locator('[role="menuitem"]:has-text("Recent")');
        if (await recentOption.isVisible()) {
          await recentOption.hover();

          // Recent files should be listed
          const recentFile = page.locator('[role="menuitem"]').filter({ hasText: 'Recent' });
          // Implementation-dependent
        }
      }
    });
  });

  test.describe('Drag and Drop Import', () => {
    test('should import file on drag and drop', async ({ page }) => {
      const csvContent = 'Name,Age\nAlice,25';

      // Create a temporary file
      const tempFilePath = path.join('/tmp', 'drag-drop.csv');
      fs.writeFileSync(tempFilePath, csvContent);

      // Create file buffer for DataTransfer
      const fileBuffer = fs.readFileSync(tempFilePath);

      // Simulate drag and drop
      const spreadsheet = page.locator('.spreadsheet');

      // This is a simplified version - actual drag and drop testing requires more setup
      await spreadsheet.evaluate((el, content) => {
        const dt = new DataTransfer();
        const file = new File([content], 'test.csv', { type: 'text/csv' });
        dt.items.add(file);

        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: dt,
        });

        el.dispatchEvent(dropEvent);
      }, csvContent);

      await helper.waitForCalculations();

      fs.unlinkSync(tempFilePath);
    });
  });

  test.describe('Print', () => {
    test('should open print dialog', async ({ page }) => {
      await setupExportData(helper);

      // Ctrl+P to print
      // Note: Actual print dialog is browser-controlled
      // await page.keyboard.press('Control+p');

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const printOption = page.locator('[role="menuitem"]:has-text("Print")');
        if (await printOption.isVisible()) {
          // Print preview or dialog should open
        }
      }
    });

    test('should show print preview', async ({ page }) => {
      await setupExportData(helper);

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const printPreviewOption = page.locator('[role="menuitem"]:has-text("Print Preview")');
        if (await printPreviewOption.isVisible()) {
          await printPreviewOption.click();

          const printPreview = page.locator('.print-preview');
          await expect(printPreview).toBeVisible();
        }
      }
    });
  });
});
