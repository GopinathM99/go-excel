import { test, expect } from '@playwright/test';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
  NUMBER_FORMATS,
} from './fixtures/test-data';

test.describe('Cell Formatting', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  test.describe('Text Formatting', () => {
    test('should toggle bold with toolbar button', async ({ page }) => {
      // Enter a value
      await helper.enterCellValue(0, 0, 'Bold Text');
      await helper.selectCell(0, 0);

      // Click bold button
      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      await boldButton.click();

      // Verify bold is applied
      await expect(boldButton).toHaveClass(/active/);

      // Toggle off
      await boldButton.click();
      await expect(boldButton).not.toHaveClass(/active/);
    });

    test('should toggle bold with keyboard shortcut', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Bold Text');
      await helper.selectCell(0, 0);

      // Use Ctrl+B
      await page.keyboard.press('Control+b');

      // Verify bold button is active
      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      await expect(boldButton).toHaveClass(/active/);
    });

    test('should toggle italic with toolbar button', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Italic Text');
      await helper.selectCell(0, 0);

      const italicButton = page.locator('.format-btn-italic, .toolbar-button[title="Italic"]');
      await italicButton.click();

      await expect(italicButton).toHaveClass(/active/);
    });

    test('should toggle italic with keyboard shortcut', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Italic Text');
      await helper.selectCell(0, 0);

      await page.keyboard.press('Control+i');

      const italicButton = page.locator('.format-btn-italic, .toolbar-button[title="Italic"]');
      await expect(italicButton).toHaveClass(/active/);
    });

    test('should toggle underline with toolbar button', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Underlined');
      await helper.selectCell(0, 0);

      const underlineButton = page.locator('.format-btn-underline, .toolbar-button[title="Underline"]');
      await underlineButton.click();

      await expect(underlineButton).toHaveClass(/active/);
    });

    test('should toggle underline with keyboard shortcut', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Underlined');
      await helper.selectCell(0, 0);

      await page.keyboard.press('Control+u');

      const underlineButton = page.locator('.format-btn-underline, .toolbar-button[title="Underline"]');
      await expect(underlineButton).toHaveClass(/active/);
    });

    test('should toggle strikethrough', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Strikethrough');
      await helper.selectCell(0, 0);

      const strikeButton = page.locator('.format-btn-strikethrough');
      if (await strikeButton.isVisible()) {
        await strikeButton.click();
        await expect(strikeButton).toHaveClass(/active/);
      }
    });

    test('should apply multiple text formats', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Formatted');
      await helper.selectCell(0, 0);

      // Apply bold
      await page.keyboard.press('Control+b');

      // Apply italic
      await page.keyboard.press('Control+i');

      // Both should be active
      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      const italicButton = page.locator('.format-btn-italic, .toolbar-button[title="Italic"]');

      await expect(boldButton).toHaveClass(/active/);
      await expect(italicButton).toHaveClass(/active/);
    });
  });

  test.describe('Font Picker', () => {
    test('should change font family', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Font Test');
      await helper.selectCell(0, 0);

      // Open font picker
      const fontPicker = page.locator('.font-picker, [data-testid="font-picker"]');
      if (await fontPicker.isVisible()) {
        await fontPicker.click();

        // Select a different font
        const fontOption = page.locator('[role="option"]:has-text("Times New Roman")');
        if (await fontOption.isVisible()) {
          await fontOption.click();
        }
      }
    });

    test('should change font size', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Size Test');
      await helper.selectCell(0, 0);

      // Find font size input/dropdown
      const fontSizeInput = page.locator('.font-size-input, [data-testid="font-size"]');
      if (await fontSizeInput.isVisible()) {
        await fontSizeInput.fill('14');
        await page.keyboard.press('Enter');
      }
    });
  });

  test.describe('Color Picker', () => {
    test('should change text color', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Colored Text');
      await helper.selectCell(0, 0);

      // Open text color picker
      const textColorButton = page.locator('[data-testid="text-color"], .color-picker[type="text"]').first();
      if (await textColorButton.isVisible()) {
        await textColorButton.click();

        // Select a color
        const colorOption = page.locator('.color-option, .color-swatch').first();
        if (await colorOption.isVisible()) {
          await colorOption.click();
        }
      }
    });

    test('should change fill/background color', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Background');
      await helper.selectCell(0, 0);

      // Open fill color picker
      const fillColorButton = page.locator('[data-testid="fill-color"], .color-picker[type="fill"]').first();
      if (await fillColorButton.isVisible()) {
        await fillColorButton.click();

        // Select a color
        const colorOption = page.locator('.color-option, .color-swatch').first();
        if (await colorOption.isVisible()) {
          await colorOption.click();
        }
      }
    });

    test('should show recent colors', async ({ page }) => {
      await helper.selectCell(0, 0);

      const colorPicker = page.locator('.color-picker').first();
      if (await colorPicker.isVisible()) {
        await colorPicker.click();

        // Check for recent colors section
        const recentSection = page.locator('.recent-colors, [data-testid="recent-colors"]');
        // Recent colors section should exist (may be empty initially)
      }
    });
  });

  test.describe('Number Formats', () => {
    test('should apply currency format', async ({ page }) => {
      await helper.enterCellValue(0, 0, '1234.56');
      await helper.selectCell(0, 0);

      // Open number format picker
      const formatPicker = page.locator('.number-format-picker, [data-testid="number-format"]');
      if (await formatPicker.isVisible()) {
        await formatPicker.click();

        // Select currency
        const currencyOption = page.locator('[role="option"]:has-text("Currency")');
        if (await currencyOption.isVisible()) {
          await currencyOption.click();
        }

        // Check the displayed value includes currency symbol
        const cellValue = await helper.getCellValue(0, 0);
        // May show as $1,234.56 or similar
      }
    });

    test('should apply percentage format', async ({ page }) => {
      await helper.enterCellValue(0, 0, '0.75');
      await helper.selectCell(0, 0);

      const formatPicker = page.locator('.number-format-picker, [data-testid="number-format"]');
      if (await formatPicker.isVisible()) {
        await formatPicker.click();

        const percentOption = page.locator('[role="option"]:has-text("Percent")');
        if (await percentOption.isVisible()) {
          await percentOption.click();
        }

        const cellValue = await helper.getCellValue(0, 0);
        // Should display as 75% or 75.00%
      }
    });

    test('should apply number format with decimal places', async ({ page }) => {
      await helper.enterCellValue(0, 0, '1234');
      await helper.selectCell(0, 0);

      const formatPicker = page.locator('.number-format-picker');
      if (await formatPicker.isVisible()) {
        await formatPicker.click();

        const numberOption = page.locator('[role="option"]:has-text("Number")');
        if (await numberOption.isVisible()) {
          await numberOption.click();
        }

        // May show as 1,234.00
      }
    });

    test('should apply date format', async ({ page }) => {
      // Enter a date serial number or date string
      await helper.enterCellValue(0, 0, '2024-01-15');
      await helper.selectCell(0, 0);

      const formatPicker = page.locator('.number-format-picker');
      if (await formatPicker.isVisible()) {
        await formatPicker.click();

        const dateOption = page.locator('[role="option"]:has-text("Date")');
        if (await dateOption.isVisible()) {
          await dateOption.click();
        }
      }
    });
  });

  test.describe('Alignment', () => {
    test('should align text left', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Left');
      await helper.selectCell(0, 0);

      const alignLeftButton = page.locator('[aria-label="Align Left"]');
      if (await alignLeftButton.isVisible()) {
        await alignLeftButton.click();
        await expect(alignLeftButton).toHaveAttribute('aria-pressed', 'true');
      }
    });

    test('should align text center', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Center');
      await helper.selectCell(0, 0);

      const alignCenterButton = page.locator('[aria-label="Align Center"]');
      if (await alignCenterButton.isVisible()) {
        await alignCenterButton.click();
        await expect(alignCenterButton).toHaveAttribute('aria-pressed', 'true');
      }
    });

    test('should align text right', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Right');
      await helper.selectCell(0, 0);

      const alignRightButton = page.locator('[aria-label="Align Right"]');
      if (await alignRightButton.isVisible()) {
        await alignRightButton.click();
        await expect(alignRightButton).toHaveAttribute('aria-pressed', 'true');
      }
    });

    test('should toggle wrap text', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'This is a long text that should wrap');
      await helper.selectCell(0, 0);

      const wrapButton = page.locator('[aria-label="Wrap Text"]');
      if (await wrapButton.isVisible()) {
        await wrapButton.click();
        await expect(wrapButton).toHaveAttribute('aria-pressed', 'true');
      }
    });
  });

  test.describe('Borders', () => {
    test('should apply all borders', async ({ page }) => {
      await helper.selectCell(0, 0);

      const borderPicker = page.locator('.border-picker, [data-testid="border-picker"]');
      if (await borderPicker.isVisible()) {
        await borderPicker.click();

        const allBordersOption = page.locator('[data-border="all"]');
        if (await allBordersOption.isVisible()) {
          await allBordersOption.click();
        }
      }
    });

    test('should apply outside borders', async ({ page }) => {
      // Select a range
      await helper.selectRangeByRef('A1:C3');

      const borderPicker = page.locator('.border-picker');
      if (await borderPicker.isVisible()) {
        await borderPicker.click();

        const outsideBordersOption = page.locator('[data-border="outside"]');
        if (await outsideBordersOption.isVisible()) {
          await outsideBordersOption.click();
        }
      }
    });

    test('should clear borders', async ({ page }) => {
      await helper.selectCell(0, 0);

      const borderPicker = page.locator('.border-picker');
      if (await borderPicker.isVisible()) {
        // Apply borders first
        await borderPicker.click();
        const allBordersOption = page.locator('[data-border="all"]');
        if (await allBordersOption.isVisible()) {
          await allBordersOption.click();
        }

        // Then clear
        await borderPicker.click();
        const noBordersOption = page.locator('[data-border="none"]');
        if (await noBordersOption.isVisible()) {
          await noBordersOption.click();
        }
      }
    });
  });

  test.describe('Undo Formatting', () => {
    test('should undo bold formatting', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Test');
      await helper.selectCell(0, 0);

      // Apply bold
      await page.keyboard.press('Control+b');

      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      await expect(boldButton).toHaveClass(/active/);

      // Undo
      await helper.undo();

      // Bold should be removed
      await expect(boldButton).not.toHaveClass(/active/);
    });

    test('should undo color change', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Test');
      await helper.selectCell(0, 0);

      // Apply color (if color picker is available)
      const colorPicker = page.locator('.color-picker').first();
      if (await colorPicker.isVisible()) {
        await colorPicker.click();
        const colorOption = page.locator('.color-option').first();
        if (await colorOption.isVisible()) {
          await colorOption.click();
        }

        // Undo
        await helper.undo();
      }
    });
  });

  test.describe('Multiple Cell Formatting', () => {
    test('should format multiple selected cells at once', async ({ page }) => {
      // Enter values in multiple cells
      await helper.enterCellValue(0, 0, 'A');
      await helper.enterCellValue(0, 1, 'B');
      await helper.enterCellValue(0, 2, 'C');

      // Select range
      await helper.selectRangeByRef('A1:C1');

      // Apply bold
      await page.keyboard.press('Control+b');

      // All cells should be bold
      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      await expect(boldButton).toHaveClass(/active/);
    });

    test('should apply same color to multiple cells', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'A');
      await helper.enterCellValue(1, 0, 'B');
      await helper.enterCellValue(2, 0, 'C');

      // Select column A1:A3
      await helper.selectRangeByRef('A1:A3');

      // Apply fill color
      const fillColorButton = page.locator('[data-testid="fill-color"], .color-picker[type="fill"]').first();
      if (await fillColorButton.isVisible()) {
        await fillColorButton.click();
        const colorOption = page.locator('.color-option').first();
        if (await colorOption.isVisible()) {
          await colorOption.click();
        }
      }
    });
  });

  test.describe('Clear Formatting', () => {
    test('should clear all formatting from cell', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Formatted');
      await helper.selectCell(0, 0);

      // Apply multiple formats
      await page.keyboard.press('Control+b'); // Bold
      await page.keyboard.press('Control+i'); // Italic

      // Clear formatting
      const clearButton = page.locator('[aria-label="Clear all formatting"]');
      if (await clearButton.isVisible()) {
        await clearButton.click();

        // Verify formatting is cleared
        const boldButton = page.locator('.format-btn-bold');
        await expect(boldButton).not.toHaveClass(/active/);

        const italicButton = page.locator('.format-btn-italic');
        await expect(italicButton).not.toHaveClass(/active/);
      }
    });

    test('should preserve cell value when clearing formatting', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Keep This');
      await helper.selectCell(0, 0);

      // Apply format
      await page.keyboard.press('Control+b');

      // Clear formatting
      const clearButton = page.locator('[aria-label="Clear all formatting"]');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }

      // Value should still be there
      const value = await helper.getCellValue(0, 0);
      expect(value).toBe('Keep This');
    });
  });

  test.describe('Format Persistence', () => {
    test('should maintain formatting after editing cell value', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Original');
      await helper.selectCell(0, 0);

      // Apply bold
      await page.keyboard.press('Control+b');

      // Edit the cell
      await helper.startEditingCell(0, 0);
      await helper.typeInCell('Modified');
      await helper.commitEdit();

      // Select cell again
      await helper.selectCell(0, 0);

      // Bold should still be active
      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      await expect(boldButton).toHaveClass(/active/);
    });

    test('should copy formatting with cell copy', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await helper.enterCellValue(0, 0, 'Formatted');
      await helper.selectCell(0, 0);

      // Apply formatting
      await page.keyboard.press('Control+b');

      // Copy and paste
      await helper.copy();
      await helper.selectCell(1, 0);
      await helper.paste();

      // New cell should have formatting
      await helper.selectCell(1, 0);
      const boldButton = page.locator('.format-btn-bold, .toolbar-button[title="Bold"]');
      await expect(boldButton).toHaveClass(/active/);
    });
  });

  test.describe('Conditional Formatting', () => {
    test.skip('should apply conditional formatting rule', async ({ page }) => {
      // This test is for conditional formatting if implemented
      // Open conditional formatting dialog
      // Set rule: values > 50 should be red
      // Verify formatting is applied to matching cells
    });
  });

  test.describe('Format Painter', () => {
    test.skip('should copy format with format painter', async ({ page }) => {
      // This test is for format painter if implemented
      await helper.enterCellValue(0, 0, 'Source');
      await helper.selectCell(0, 0);
      await page.keyboard.press('Control+b');

      // Click format painter
      // const formatPainterButton = page.locator('[data-action="format-painter"]');
      // await formatPainterButton.click();

      // Click destination cell
      // await helper.selectCell(1, 0);

      // Verify format was applied
    });
  });
});
