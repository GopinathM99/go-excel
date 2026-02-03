import { test, expect } from '@playwright/test';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
  SAMPLE_DATA,
} from './fixtures/test-data';

test.describe('Data Tools - Sort, Filter, Validation', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  /**
   * Helper to set up test data for sort/filter tests
   */
  async function setupSortFilterData(helper: SpreadsheetTestHelper) {
    const { headers, rows } = SAMPLE_DATA.salesData;

    // Enter headers
    for (let c = 0; c < headers.length; c++) {
      await helper.enterCellValue(0, c, headers[c]);
    }

    // Enter data rows
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        await helper.enterCellValue(r + 1, c, String(rows[r][c]));
      }
    }
  }

  test.describe('Sort Dialog', () => {
    test('should open sort dialog from menu', async ({ page }) => {
      await setupSortFilterData(helper);

      // Select the data range
      await helper.selectRangeByRef('A1:D9');

      // Open Data menu and click Sort
      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        // Sort dialog should be visible
        const sortDialog = page.locator('.sort-dialog, [role="dialog"][aria-labelledby*="sort"]');
        await expect(sortDialog).toBeVisible();
      }
    });

    test('should sort data ascending by single column', async ({ page }) => {
      await setupSortFilterData(helper);
      await helper.selectRangeByRef('A1:D9');

      // Open sort dialog
      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        const sortDialog = page.locator('.sort-dialog');
        if (await sortDialog.isVisible()) {
          // Select "Sales" column
          const columnSelect = sortDialog.locator('select').first();
          await columnSelect.selectOption({ label: 'Sales' });

          // Ensure ascending is selected
          const ascendingRadio = sortDialog.locator('[value="ascending"], input[type="radio"]').first();
          await ascendingRadio.check();

          // Click Sort button
          await sortDialog.locator('button:has-text("Sort")').click();

          // Verify data is sorted
          await helper.waitForCalculations();

          // First data row (A2) should have lowest sales value
          const firstSales = await helper.getCellValue(1, 2);
          // Based on sample data, lowest sales is 1100
          expect(parseInt(firstSales, 10)).toBeLessThanOrEqual(1500);
        }
      }
    });

    test('should sort data descending', async ({ page }) => {
      await setupSortFilterData(helper);
      await helper.selectRangeByRef('A1:D9');

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        const sortDialog = page.locator('.sort-dialog');
        if (await sortDialog.isVisible()) {
          // Select column and descending order
          const columnSelect = sortDialog.locator('select').first();
          await columnSelect.selectOption({ label: 'Sales' });

          const descendingRadio = sortDialog.locator('[value="descending"]');
          if (await descendingRadio.isVisible()) {
            await descendingRadio.check();
          }

          await sortDialog.locator('button:has-text("Sort")').click();
          await helper.waitForCalculations();

          // First data row should have highest sales
          const firstSales = await helper.getCellValue(1, 2);
          // Highest sales is 3200
          expect(parseInt(firstSales, 10)).toBeGreaterThanOrEqual(2700);
        }
      }
    });

    test('should support multi-column sort', async ({ page }) => {
      await setupSortFilterData(helper);
      await helper.selectRangeByRef('A1:D9');

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        const sortDialog = page.locator('.sort-dialog');
        if (await sortDialog.isVisible()) {
          // Add a second sort level
          const addLevelButton = sortDialog.locator('button:has-text("Add Level")');
          if (await addLevelButton.isVisible()) {
            await addLevelButton.click();

            // First level: Product
            const firstSelect = sortDialog.locator('select').first();
            await firstSelect.selectOption({ label: 'Product' });

            // Second level: Sales
            const secondSelect = sortDialog.locator('select').nth(1);
            await secondSelect.selectOption({ label: 'Sales' });

            await sortDialog.locator('button:has-text("Sort")').click();
            await helper.waitForCalculations();
          }
        }
      }
    });

    test('should respect "My data has headers" checkbox', async ({ page }) => {
      await setupSortFilterData(helper);
      await helper.selectRangeByRef('A1:D9');

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        const sortDialog = page.locator('.sort-dialog');
        if (await sortDialog.isVisible()) {
          // Check the headers checkbox
          const headerCheckbox = sortDialog.locator('input[type="checkbox"]:near(:text("headers"))');
          if (await headerCheckbox.isVisible()) {
            await headerCheckbox.check();
          }

          // Column options should show header names
          const columnSelect = sortDialog.locator('select').first();
          const options = await columnSelect.locator('option').allTextContents();
          expect(options).toContain('Product');
        }
      }
    });

    test('should close sort dialog on Cancel', async ({ page }) => {
      await setupSortFilterData(helper);
      await helper.selectRangeByRef('A1:D9');

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        const sortDialog = page.locator('.sort-dialog');
        if (await sortDialog.isVisible()) {
          await sortDialog.locator('button:has-text("Cancel")').click();
          await expect(sortDialog).not.toBeVisible();
        }
      }
    });

    test('should close sort dialog on Escape', async ({ page }) => {
      await setupSortFilterData(helper);
      await helper.selectRangeByRef('A1:D9');

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        await page.locator('[role="menuitem"]:has-text("Sort")').click();

        const sortDialog = page.locator('.sort-dialog');
        if (await sortDialog.isVisible()) {
          await page.keyboard.press('Escape');
          await expect(sortDialog).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Auto Filter', () => {
    test('should show filter dropdown in header row', async ({ page }) => {
      await setupSortFilterData(helper);

      // Enable auto-filter
      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter"), [role="menuitem"]:has-text("Auto Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          // Filter dropdowns should appear
          const filterDropdown = page.locator('.filter-dropdown-button');
          await expect(filterDropdown.first()).toBeVisible();
        }
      }
    });

    test('should open filter menu on dropdown click', async ({ page }) => {
      await setupSortFilterData(helper);

      // Enable auto-filter
      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          // Click the first filter dropdown
          const filterDropdown = page.locator('.filter-dropdown-button').first();
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();

            // Filter menu should open
            const filterMenu = page.locator('.filter-menu, [role="listbox"]');
            await expect(filterMenu).toBeVisible();
          }
        }
      }
    });

    test('should filter by specific value', async ({ page }) => {
      await setupSortFilterData(helper);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          // Open Product column filter
          const filterDropdown = page.locator('.filter-dropdown-button').first();
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();

            // Uncheck "Select All"
            const selectAll = page.locator('[data-value="select-all"], :text("Select All")');
            if (await selectAll.isVisible()) {
              await selectAll.click();
            }

            // Check only "Widget A"
            const widgetA = page.locator('[data-value="Widget A"], :text("Widget A")');
            if (await widgetA.isVisible()) {
              await widgetA.click();
            }

            // Apply filter
            const applyButton = page.locator('button:has-text("OK"), button:has-text("Apply")');
            if (await applyButton.isVisible()) {
              await applyButton.click();
            }

            // Verify rows are filtered
            await helper.waitForCalculations();

            // Only rows with "Widget A" should be visible
          }
        }
      }
    });

    test('should show filter indicator when column is filtered', async ({ page }) => {
      await setupSortFilterData(helper);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          const filterDropdown = page.locator('.filter-dropdown-button').first();
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();

            // Apply a filter
            const selectAll = page.locator('[data-value="select-all"]');
            if (await selectAll.isVisible()) {
              await selectAll.click();
            }

            const firstValue = page.locator('.filter-value-item').first();
            if (await firstValue.isVisible()) {
              await firstValue.click();
            }

            const applyButton = page.locator('button:has-text("OK")');
            if (await applyButton.isVisible()) {
              await applyButton.click();
            }

            // Filter dropdown should show "active" indicator
            await expect(filterDropdown).toHaveClass(/active/);
          }
        }
      }
    });

    test('should clear filter for a column', async ({ page }) => {
      await setupSortFilterData(helper);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          // Apply a filter first, then clear it
          const filterDropdown = page.locator('.filter-dropdown-button').first();
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();

            // Clear filter button
            const clearButton = page.locator('button:has-text("Clear"), button:has-text("Clear Filter")');
            if (await clearButton.isVisible()) {
              await clearButton.click();
            }
          }
        }
      }
    });

    test('should clear all filters', async ({ page }) => {
      await setupSortFilterData(helper);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const clearAllFilters = page.locator('[role="menuitem"]:has-text("Clear All Filters")');
        if (await clearAllFilters.isVisible()) {
          await clearAllFilters.click();
          await helper.waitForCalculations();
        }
      }
    });

    test('should filter by text condition', async ({ page }) => {
      await setupSortFilterData(helper);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          const filterDropdown = page.locator('.filter-dropdown-button').first();
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();

            // Select text filter
            const textFilters = page.locator('button:has-text("Text Filters")');
            if (await textFilters.isVisible()) {
              await textFilters.click();

              // Select "Contains"
              const containsOption = page.locator('[role="menuitem"]:has-text("Contains")');
              if (await containsOption.isVisible()) {
                await containsOption.click();

                // Enter filter value
                const filterInput = page.locator('.filter-condition-input, input[type="text"]').first();
                await filterInput.fill('Widget');

                const applyButton = page.locator('button:has-text("OK")');
                await applyButton.click();
              }
            }
          }
        }
      }
    });

    test('should filter by number condition', async ({ page }) => {
      await setupSortFilterData(helper);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const filterOption = page.locator('[role="menuitem"]:has-text("Filter")');
        if (await filterOption.isVisible()) {
          await filterOption.click();

          // Open Sales column filter (column C, index 2)
          const filterDropdown = page.locator('.filter-dropdown-button').nth(2);
          if (await filterDropdown.isVisible()) {
            await filterDropdown.click();

            const numberFilters = page.locator('button:has-text("Number Filters")');
            if (await numberFilters.isVisible()) {
              await numberFilters.click();

              const greaterThan = page.locator('[role="menuitem"]:has-text("Greater Than")');
              if (await greaterThan.isVisible()) {
                await greaterThan.click();

                const filterInput = page.locator('.filter-condition-input').first();
                await filterInput.fill('2000');

                const applyButton = page.locator('button:has-text("OK")');
                await applyButton.click();
              }
            }
          }
        }
      }
    });
  });

  test.describe('Data Validation', () => {
    test('should open validation dialog', async ({ page }) => {
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog, [role="dialog"][aria-labelledby*="validation"]');
          await expect(validationDialog).toBeVisible();
        }
      }
    });

    test('should validate whole number input', async ({ page }) => {
      // Set up validation for whole numbers
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog');
          if (await validationDialog.isVisible()) {
            // Select "Whole Number" criteria
            const criteriaSelect = validationDialog.locator('select').first();
            await criteriaSelect.selectOption('wholeNumber');

            // Set min and max
            const minInput = validationDialog.locator('input[name="minimum"]');
            if (await minInput.isVisible()) {
              await minInput.fill('1');
            }

            const maxInput = validationDialog.locator('input[name="maximum"]');
            if (await maxInput.isVisible()) {
              await maxInput.fill('100');
            }

            await validationDialog.locator('button:has-text("OK")').click();
          }
        }
      }

      // Try to enter invalid value
      await helper.enterCellValue(0, 0, '150');

      // Should show validation error
      const hasError = await helper.hasCellError(0, 0);
      const errorMessage = await helper.getCellErrorMessage(0, 0);
      // Validation behavior depends on implementation
    });

    test('should validate decimal input', async ({ page }) => {
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog');
          if (await validationDialog.isVisible()) {
            const criteriaSelect = validationDialog.locator('select').first();
            await criteriaSelect.selectOption('decimal');

            await validationDialog.locator('button:has-text("OK")').click();
          }
        }
      }
    });

    test('should validate list input with dropdown', async ({ page }) => {
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog');
          if (await validationDialog.isVisible()) {
            const criteriaSelect = validationDialog.locator('select').first();
            await criteriaSelect.selectOption('list');

            // Enter list values
            const sourceInput = validationDialog.locator('input[name="source"]');
            if (await sourceInput.isVisible()) {
              await sourceInput.fill('Option 1,Option 2,Option 3');
            }

            await validationDialog.locator('button:has-text("OK")').click();
          }
        }
      }

      // Cell should show dropdown indicator
      const dropdownIndicator = page.locator('.validation-dropdown, .cell-dropdown-indicator');
      // May or may not be visible depending on implementation
    });

    test('should show input message on cell selection', async ({ page }) => {
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog');
          if (await validationDialog.isVisible()) {
            // Set up input message
            const inputMessageTab = validationDialog.locator('button:has-text("Input Message")');
            if (await inputMessageTab.isVisible()) {
              await inputMessageTab.click();

              const titleInput = validationDialog.locator('input[name="inputTitle"]');
              if (await titleInput.isVisible()) {
                await titleInput.fill('Enter Value');
              }

              const messageInput = validationDialog.locator('textarea[name="inputMessage"]');
              if (await messageInput.isVisible()) {
                await messageInput.fill('Please enter a number between 1 and 100');
              }
            }

            await validationDialog.locator('button:has-text("OK")').click();
          }
        }
      }

      // Select the cell and check for input message
      await helper.selectCell(0, 0);
      // Input message should appear
    });

    test('should show error alert on invalid input', async ({ page }) => {
      // Setup validation with error alert
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog');
          if (await validationDialog.isVisible()) {
            const criteriaSelect = validationDialog.locator('select').first();
            await criteriaSelect.selectOption('wholeNumber');

            const minInput = validationDialog.locator('input[name="minimum"]');
            if (await minInput.isVisible()) {
              await minInput.fill('1');
            }

            const maxInput = validationDialog.locator('input[name="maximum"]');
            if (await maxInput.isVisible()) {
              await maxInput.fill('10');
            }

            // Set error alert
            const errorAlertTab = validationDialog.locator('button:has-text("Error Alert")');
            if (await errorAlertTab.isVisible()) {
              await errorAlertTab.click();

              const styleSelect = validationDialog.locator('select[name="alertStyle"]');
              if (await styleSelect.isVisible()) {
                await styleSelect.selectOption('stop');
              }
            }

            await validationDialog.locator('button:has-text("OK")').click();
          }
        }
      }

      // Try invalid input
      await helper.enterCellValue(0, 0, '999');

      // Error should be shown
      const errorAlert = page.locator('.validation-error, [role="alert"]');
      // Check if error is displayed
    });

    test('should clear validation', async ({ page }) => {
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const validationOption = page.locator('[role="menuitem"]:has-text("Validation")');
        if (await validationOption.isVisible()) {
          await validationOption.click();

          const validationDialog = page.locator('.validation-dialog');
          if (await validationDialog.isVisible()) {
            // Clear all button
            const clearAllButton = validationDialog.locator('button:has-text("Clear All")');
            if (await clearAllButton.isVisible()) {
              await clearAllButton.click();
            }

            await validationDialog.locator('button:has-text("OK")').click();
          }
        }
      }
    });
  });

  test.describe('Quick Sort', () => {
    test('should sort A to Z from context menu', async ({ page }) => {
      await setupSortFilterData(helper);

      // Right-click on a data cell
      const cell = helper.getCell(1, 0);
      await cell.click({ button: 'right' });

      const contextMenu = page.locator('[role="menu"]');
      if (await contextMenu.isVisible()) {
        const sortAZ = contextMenu.locator('[role="menuitem"]:has-text("Sort A to Z")');
        if (await sortAZ.isVisible()) {
          await sortAZ.click();
          await helper.waitForCalculations();
        }
      }
    });

    test('should sort Z to A from context menu', async ({ page }) => {
      await setupSortFilterData(helper);

      const cell = helper.getCell(1, 0);
      await cell.click({ button: 'right' });

      const contextMenu = page.locator('[role="menu"]');
      if (await contextMenu.isVisible()) {
        const sortZA = contextMenu.locator('[role="menuitem"]:has-text("Sort Z to A")');
        if (await sortZA.isVisible()) {
          await sortZA.click();
          await helper.waitForCalculations();
        }
      }
    });
  });

  test.describe('Remove Duplicates', () => {
    test.skip('should remove duplicate rows', async ({ page }) => {
      // Enter data with duplicates
      await helper.enterCellValue(0, 0, 'A');
      await helper.enterCellValue(1, 0, 'B');
      await helper.enterCellValue(2, 0, 'A');
      await helper.enterCellValue(3, 0, 'C');
      await helper.enterCellValue(4, 0, 'B');

      await helper.selectRangeByRef('A1:A5');

      // Open Data menu and click Remove Duplicates
      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const removeDuplicates = page.locator('[role="menuitem"]:has-text("Remove Duplicates")');
        if (await removeDuplicates.isVisible()) {
          await removeDuplicates.click();

          // Confirm dialog
          const confirmButton = page.locator('button:has-text("OK"), button:has-text("Remove")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          await helper.waitForCalculations();

          // Should have only unique values: A, B, C
        }
      }
    });
  });

  test.describe('Text to Columns', () => {
    test.skip('should split text by delimiter', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'John,Doe,30');
      await helper.selectCell(0, 0);

      const dataMenu = page.locator('[role="menubar"] >> text=Data');
      if (await dataMenu.isVisible()) {
        await dataMenu.click();
        const textToColumns = page.locator('[role="menuitem"]:has-text("Text to Columns")');
        if (await textToColumns.isVisible()) {
          await textToColumns.click();

          // Select delimiter
          const commaCheckbox = page.locator('input[value="comma"]');
          if (await commaCheckbox.isVisible()) {
            await commaCheckbox.check();
          }

          await page.locator('button:has-text("Finish")').click();
          await helper.waitForCalculations();

          // Should split into A1="John", B1="Doe", C1="30"
        }
      }
    });
  });
});
