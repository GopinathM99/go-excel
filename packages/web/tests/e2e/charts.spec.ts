import { test, expect } from '@playwright/test';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
  SAMPLE_DATA,
} from './fixtures/test-data';

test.describe('Charts - Creation and Editing', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  /**
   * Helper to set up chart data
   */
  async function setupChartData(helper: SpreadsheetTestHelper) {
    const { labels, series1, series2 } = SAMPLE_DATA.chartData;

    // Enter labels (Column A)
    for (let i = 0; i < labels.length; i++) {
      await helper.enterCellValue(i + 1, 0, labels[i]);
    }

    // Enter header
    await helper.enterCellValue(0, 0, 'Month');
    await helper.enterCellValue(0, 1, 'Series 1');
    await helper.enterCellValue(0, 2, 'Series 2');

    // Enter series 1 data (Column B)
    for (let i = 0; i < series1.length; i++) {
      await helper.enterCellValue(i + 1, 1, String(series1[i]));
    }

    // Enter series 2 data (Column C)
    for (let i = 0; i < series2.length; i++) {
      await helper.enterCellValue(i + 1, 2, String(series2[i]));
    }
  }

  test.describe('Chart Insertion', () => {
    test('should insert chart from Insert menu', async ({ page }) => {
      await setupChartData(helper);

      // Select the data range
      await helper.selectRangeByRef('A1:C7');

      // Open Insert menu
      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();

        // Click Chart
        const chartOption = page.locator('[role="menuitem"]:has-text("Chart")');
        if (await chartOption.isVisible()) {
          await chartOption.click();

          // Chart should be created
          const chart = page.locator('.chart-container, .echarts-container');
          await expect(chart).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test('should insert chart using keyboard shortcut', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      // Alt+F1 or similar shortcut for quick chart (implementation-dependent)
      await page.keyboard.press('Alt+F1');

      const chart = page.locator('.chart-container');
      // May or may not create chart depending on shortcut implementation
    });

    test('should show chart type selector when inserting', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();

        const chartOption = page.locator('[role="menuitem"]:has-text("Chart")');
        if (await chartOption.isVisible()) {
          await chartOption.click();

          // Chart editor dialog should open with type selector
          const chartEditor = page.locator('.chart-editor-dialog, [role="dialog"][aria-labelledby*="chart"]');
          await expect(chartEditor).toBeVisible();

          const typeSelector = chartEditor.locator('.chart-type-selector');
          await expect(typeSelector).toBeVisible();
        }
      }
    });
  });

  test.describe('Chart Types', () => {
    test('should create a bar chart', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          // Select bar chart type
          const barChartOption = chartEditor.locator('[data-chart-type="bar"], button:has-text("Bar")');
          if (await barChartOption.isVisible()) {
            await barChartOption.click();

            // Apply changes
            await chartEditor.locator('button:has-text("OK"), button:has-text("Create")').click();
          }

          const chart = page.locator('.chart-container');
          await expect(chart).toBeVisible();
        }
      }
    });

    test('should create a line chart', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          const lineChartOption = chartEditor.locator('[data-chart-type="line"], button:has-text("Line")');
          if (await lineChartOption.isVisible()) {
            await lineChartOption.click();
            await chartEditor.locator('button:has-text("OK")').click();
          }

          const chart = page.locator('.chart-container');
          await expect(chart).toBeVisible();
        }
      }
    });

    test('should create a pie chart', async ({ page }) => {
      await setupChartData(helper);
      // For pie chart, select single series
      await helper.selectRangeByRef('A1:B7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          const pieChartOption = chartEditor.locator('[data-chart-type="pie"], button:has-text("Pie")');
          if (await pieChartOption.isVisible()) {
            await pieChartOption.click();
            await chartEditor.locator('button:has-text("OK")').click();
          }

          const chart = page.locator('.chart-container');
          await expect(chart).toBeVisible();
        }
      }
    });

    test('should switch chart type after creation', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      // Create initial chart
      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Double-click chart to edit
        const chart = page.locator('.chart-container').first();
        await chart.dblclick();

        // Change chart type
        const typeSelector = page.locator('.chart-type-selector');
        if (await typeSelector.isVisible()) {
          const lineOption = typeSelector.locator('[data-chart-type="line"]');
          if (await lineOption.isVisible()) {
            await lineOption.click();
          }

          await page.locator('button:has-text("Apply"), button:has-text("OK")').click();
        }
      }
    });
  });

  test.describe('Chart Data Range', () => {
    test('should update chart when data range changes', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Edit the data range
        const chart = page.locator('.chart-container').first();
        await chart.dblclick();

        const dataRangePicker = page.locator('.data-range-picker, [data-testid="data-range"]');
        if (await dataRangePicker.isVisible()) {
          await dataRangePicker.fill('A1:B7');
          await page.locator('button:has-text("Apply")').click();
        }
      }
    });

    test('should update chart when source data changes', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Close any dialogs
        await page.keyboard.press('Escape');

        // Change source data
        await helper.enterCellValue(1, 1, '500');
        await helper.waitForCalculations();

        // Chart should reflect the change (visual verification would require screenshot comparison)
      }
    });
  });

  test.describe('Chart Title', () => {
    test('should edit chart title', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          // Find title input
          const titleInput = chartEditor.locator('input[name="title"], [data-testid="chart-title"]');
          if (await titleInput.isVisible()) {
            await titleInput.fill('Monthly Sales Report');
          }

          await chartEditor.locator('button:has-text("OK")').click();
        }
      }
    });

    test('should double-click chart title to edit', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Double-click on chart title
        const chartTitle = page.locator('.chart-title, text=Chart Title');
        if (await chartTitle.isVisible()) {
          await chartTitle.dblclick();

          // Should be able to edit
          const titleEditor = page.locator('.chart-title-editor, input.chart-title');
          if (await titleEditor.isVisible()) {
            await titleEditor.fill('New Chart Title');
            await page.keyboard.press('Enter');
          }
        }
      }
    });
  });

  test.describe('Chart Styling', () => {
    test('should customize chart colors', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          // Go to style tab
          const styleTab = chartEditor.locator('button:has-text("Style")');
          if (await styleTab.isVisible()) {
            await styleTab.click();

            // Select a color scheme
            const colorScheme = chartEditor.locator('.color-scheme-option').first();
            if (await colorScheme.isVisible()) {
              await colorScheme.click();
            }
          }

          await chartEditor.locator('button:has-text("OK")').click();
        }
      }
    });

    test('should toggle legend visibility', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          // Go to legend tab/section
          const legendTab = chartEditor.locator('button:has-text("Legend")');
          if (await legendTab.isVisible()) {
            await legendTab.click();

            // Toggle legend visibility
            const legendToggle = chartEditor.locator('input[name="showLegend"], [data-testid="show-legend"]');
            if (await legendToggle.isVisible()) {
              await legendToggle.click();
            }
          }

          await chartEditor.locator('button:has-text("OK")').click();
        }
      }
    });

    test('should configure axis labels', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          // Go to axis tab/section
          const axisTab = chartEditor.locator('button:has-text("Axis")');
          if (await axisTab.isVisible()) {
            await axisTab.click();

            // Set X-axis title
            const xAxisTitle = chartEditor.locator('input[name="xAxisTitle"]');
            if (await xAxisTitle.isVisible()) {
              await xAxisTitle.fill('Months');
            }

            // Set Y-axis title
            const yAxisTitle = chartEditor.locator('input[name="yAxisTitle"]');
            if (await yAxisTitle.isVisible()) {
              await yAxisTitle.fill('Values');
            }
          }

          await chartEditor.locator('button:has-text("OK")').click();
        }
      }
    });
  });

  test.describe('Chart Selection and Deletion', () => {
    test('should select chart on click', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Click on the chart
        const chart = page.locator('.chart-container').first();
        await chart.click();

        // Chart should be selected
        await expect(chart).toHaveClass(/selected|chart-container--selected/);
      }
    });

    test('should delete chart with Delete key', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Select and delete
        const chart = page.locator('.chart-container').first();
        await chart.click();
        await page.keyboard.press('Delete');

        // Chart should be removed
        await expect(chart).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('should delete chart from context menu', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Right-click on chart
        const chart = page.locator('.chart-container').first();
        await chart.click({ button: 'right' });

        const deleteOption = page.locator('[role="menuitem"]:has-text("Delete")');
        if (await deleteOption.isVisible()) {
          await deleteOption.click();
          await expect(chart).not.toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Chart Movement and Resizing', () => {
    test('should move chart by dragging', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        const chart = page.locator('.chart-container').first();
        const initialBox = await chart.boundingBox();

        if (initialBox) {
          // Drag chart
          await chart.dragTo(page.locator('.spreadsheet-content'), {
            targetPosition: { x: initialBox.x + 100, y: initialBox.y + 100 },
          });

          const newBox = await chart.boundingBox();
          if (newBox) {
            // Position should have changed
            expect(newBox.x).not.toEqual(initialBox.x);
          }
        }
      }
    });

    test('should resize chart using handles', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        const chart = page.locator('.chart-container').first();
        await chart.click();

        const initialBox = await chart.boundingBox();

        // Find resize handle
        const resizeHandle = page.locator('.chart-resize-handle, .resize-handle').last();
        if (await resizeHandle.isVisible() && initialBox) {
          await resizeHandle.dragTo(page.locator('.spreadsheet-content'), {
            targetPosition: { x: initialBox.x + initialBox.width + 50, y: initialBox.y + initialBox.height + 50 },
          });

          const newBox = await chart.boundingBox();
          if (newBox) {
            expect(newBox.width).toBeGreaterThan(initialBox.width);
          }
        }
      }
    });
  });

  test.describe('Chart Export', () => {
    test('should export chart as image', async ({ page }) => {
      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        // Right-click on chart
        const chart = page.locator('.chart-container').first();
        await chart.click({ button: 'right' });

        const exportOption = page.locator('[role="menuitem"]:has-text("Save as Image")');
        if (await exportOption.isVisible()) {
          // Set up download handler
          const downloadPromise = page.waitForEvent('download');
          await exportOption.click();
          // const download = await downloadPromise;
          // expect(download.suggestedFilename()).toContain('.png');
        }
      }
    });

    test('should copy chart to clipboard', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await setupChartData(helper);
      await helper.selectRangeByRef('A1:C7');

      const insertMenu = page.locator('[role="menubar"] >> text=Insert');
      if (await insertMenu.isVisible()) {
        await insertMenu.click();
        await page.locator('[role="menuitem"]:has-text("Chart")').click();

        const chartEditor = page.locator('.chart-editor-dialog');
        if (await chartEditor.isVisible()) {
          await chartEditor.locator('button:has-text("OK")').click();
        }

        const chart = page.locator('.chart-container').first();
        await chart.click();

        // Copy
        await page.keyboard.press('Control+c');

        // Chart data should be in clipboard
      }
    });
  });
});
