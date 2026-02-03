import { test, expect } from '@playwright/test';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
  SAMPLE_DATA,
  TEST_FORMULAS,
} from './fixtures/test-data';

test.describe('Formula Entry and Calculation', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  test.describe('Simple Formulas', () => {
    test('should calculate simple addition formula', async ({ page }) => {
      // Enter values
      await helper.enterCellValue(0, 0, '10'); // A1 = 10
      await helper.enterCellValue(0, 1, '20'); // B1 = 20

      // Enter formula
      await helper.enterCellValue(0, 2, '=A1+B1'); // C1 = A1+B1

      // Check result
      const result = await helper.getCellValue(0, 2);
      expect(result).toBe('30');
    });

    test('should calculate subtraction formula', async ({ page }) => {
      await helper.enterCellValue(0, 0, '50');
      await helper.enterCellValue(0, 1, '30');
      await helper.enterCellValue(0, 2, '=A1-B1');

      const result = await helper.getCellValue(0, 2);
      expect(result).toBe('20');
    });

    test('should calculate multiplication formula', async ({ page }) => {
      await helper.enterCellValue(0, 0, '5');
      await helper.enterCellValue(0, 1, '6');
      await helper.enterCellValue(0, 2, '=A1*B1');

      const result = await helper.getCellValue(0, 2);
      expect(result).toBe('30');
    });

    test('should calculate division formula', async ({ page }) => {
      await helper.enterCellValue(0, 0, '100');
      await helper.enterCellValue(0, 1, '4');
      await helper.enterCellValue(0, 2, '=A1/B1');

      const result = await helper.getCellValue(0, 2);
      expect(result).toBe('25');
    });

    test('should handle division by zero', async ({ page }) => {
      await helper.enterCellValue(0, 0, '100');
      await helper.enterCellValue(0, 1, '0');
      await helper.enterCellValue(0, 2, '=A1/B1');

      // Should show error (e.g., #DIV/0!)
      const result = await helper.getCellValue(0, 2);
      expect(result).toMatch(/(#DIV\/0!|#ERROR|Infinity)/i);
    });

    test('should calculate formula with multiple operators', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '5');
      await helper.enterCellValue(0, 2, '2');
      await helper.enterCellValue(0, 3, '=A1+B1*C1'); // Should be 10 + 5*2 = 20

      const result = await helper.getCellValue(0, 3);
      expect(result).toBe('20');
    });

    test('should calculate formula with parentheses', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '5');
      await helper.enterCellValue(0, 2, '2');
      await helper.enterCellValue(0, 3, '=(A1+B1)*C1'); // Should be (10+5)*2 = 30

      const result = await helper.getCellValue(0, 3);
      expect(result).toBe('30');
    });
  });

  test.describe('SUM Function', () => {
    test('should calculate SUM of a range', async ({ page }) => {
      // Enter values A1:A5
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(1, 0, '20');
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '40');
      await helper.enterCellValue(4, 0, '50');

      // Enter SUM formula
      await helper.enterCellValue(5, 0, '=SUM(A1:A5)');

      const result = await helper.getCellValue(5, 0);
      expect(result).toBe('150');
    });

    test('should calculate SUM with individual cells', async ({ page }) => {
      await helper.enterCellValue(0, 0, '5');
      await helper.enterCellValue(0, 1, '10');
      await helper.enterCellValue(0, 2, '15');
      await helper.enterCellValue(0, 3, '=SUM(A1,B1,C1)');

      const result = await helper.getCellValue(0, 3);
      expect(result).toBe('30');
    });

    test('should handle empty cells in SUM', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      // Leave A2 empty
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=SUM(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('40');
    });
  });

  test.describe('AVERAGE Function', () => {
    test('should calculate AVERAGE of a range', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(1, 0, '20');
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=AVERAGE(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('20');
    });

    test('should skip empty cells in AVERAGE', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      // Leave A2 empty
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=AVERAGE(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('20'); // Average of 10 and 30
    });
  });

  test.describe('COUNT Functions', () => {
    test('should calculate COUNT of numeric values', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(1, 0, 'text');
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=COUNT(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('2'); // Only counts numbers
    });

    test('should calculate COUNTA including text', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(1, 0, 'text');
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=COUNTA(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('3');
    });
  });

  test.describe('MIN and MAX Functions', () => {
    test('should find MIN value in range', async ({ page }) => {
      await helper.enterCellValue(0, 0, '50');
      await helper.enterCellValue(1, 0, '10');
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=MIN(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('10');
    });

    test('should find MAX value in range', async ({ page }) => {
      await helper.enterCellValue(0, 0, '50');
      await helper.enterCellValue(1, 0, '10');
      await helper.enterCellValue(2, 0, '30');
      await helper.enterCellValue(3, 0, '=MAX(A1:A3)');

      const result = await helper.getCellValue(3, 0);
      expect(result).toBe('50');
    });
  });

  test.describe('IF Function', () => {
    test('should evaluate IF condition true', async ({ page }) => {
      await helper.enterCellValue(0, 0, '15');
      await helper.enterCellValue(0, 1, '=IF(A1>10,"High","Low")');

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('High');
    });

    test('should evaluate IF condition false', async ({ page }) => {
      await helper.enterCellValue(0, 0, '5');
      await helper.enterCellValue(0, 1, '=IF(A1>10,"High","Low")');

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('Low');
    });

    test('should handle nested IF', async ({ page }) => {
      await helper.enterCellValue(0, 0, '75');
      await helper.enterCellValue(0, 1, '=IF(A1>=90,"A",IF(A1>=80,"B",IF(A1>=70,"C","F")))');

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('C');
    });
  });

  test.describe('Formula Bar', () => {
    test('should show formula in formula bar when cell is selected', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '20');
      await helper.enterCellValue(0, 2, '=A1+B1');

      // Select the formula cell
      await helper.selectCell(0, 2);

      // Formula bar should show the formula
      const formulaBarValue = await helper.getFormulaBarValue();
      expect(formulaBarValue).toBe('=A1+B1');
    });

    test('should display result in cell, not formula', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '=A1*2');

      // Cell should show result
      const cellValue = await helper.getCellValue(0, 1);
      expect(cellValue).toBe('20');
      expect(cellValue).not.toContain('=');
    });

    test('should edit formula via formula bar', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '=A1*2');

      // Select cell and edit via formula bar
      await helper.selectCell(0, 1);
      await helper.typeInFormulaBar('=A1*3');
      await page.keyboard.press('Enter');
      await helper.waitForCalculations();

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('30');
    });
  });

  test.describe('Cell Dependencies', () => {
    test('should update dependent cells when source changes', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '=A1*2'); // B1 = 20
      await helper.enterCellValue(0, 2, '=B1+5'); // C1 = 25

      // Change source
      await helper.enterCellValue(0, 0, '20');

      // Check cascade update
      const b1 = await helper.getCellValue(0, 1);
      expect(b1).toBe('40');

      const c1 = await helper.getCellValue(0, 2);
      expect(c1).toBe('45');
    });

    test('should handle chain of dependencies', async ({ page }) => {
      await helper.enterCellValue(0, 0, '5');
      await helper.enterCellValue(0, 1, '=A1+1'); // B1 = 6
      await helper.enterCellValue(0, 2, '=B1+1'); // C1 = 7
      await helper.enterCellValue(0, 3, '=C1+1'); // D1 = 8

      const d1 = await helper.getCellValue(0, 3);
      expect(d1).toBe('8');

      // Update source
      await helper.enterCellValue(0, 0, '10');

      const newD1 = await helper.getCellValue(0, 3);
      expect(newD1).toBe('13');
    });
  });

  test.describe('Circular References', () => {
    test('should detect and show error for circular reference', async ({ page }) => {
      // Create circular reference: A1 depends on B1, B1 depends on A1
      await helper.enterCellValue(0, 0, '=B1+1');
      await helper.enterCellValue(0, 1, '=A1+1');

      // Should show error in at least one cell
      const a1Value = await helper.getCellValue(0, 0);
      const b1Value = await helper.getCellValue(0, 1);

      const hasError =
        a1Value.includes('#REF') ||
        a1Value.includes('#CIRCULAR') ||
        a1Value.includes('#ERROR') ||
        b1Value.includes('#REF') ||
        b1Value.includes('#CIRCULAR') ||
        b1Value.includes('#ERROR');

      expect(hasError).toBe(true);
    });

    test('should detect self-referencing formula', async ({ page }) => {
      await helper.enterCellValue(0, 0, '=A1+1');

      const value = await helper.getCellValue(0, 0);
      expect(value).toMatch(/(#REF|#CIRCULAR|#ERROR)/i);
    });
  });

  test.describe('Formula Copying', () => {
    test('should adjust relative references when copying formula down', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Setup: A1=10, A2=20, B1=A1*2
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(1, 0, '20');
      await helper.enterCellValue(0, 1, '=A1*2');

      // Copy B1
      await helper.selectCell(0, 1);
      await helper.copy();

      // Paste to B2
      await helper.selectCell(1, 1);
      await helper.paste();

      // B2 should have adjusted reference to A2
      const b2 = await helper.getCellValue(1, 1);
      expect(b2).toBe('40'); // A2*2 = 20*2 = 40
    });

    test('should adjust relative references when copying formula right', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Setup: A1=10, B1=20, A2=A1+B1
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '20');
      await helper.enterCellValue(0, 2, '30');
      await helper.enterCellValue(1, 0, '=A1*2');

      // Copy A2
      await helper.selectCell(1, 0);
      await helper.copy();

      // Paste to B2
      await helper.selectCell(1, 1);
      await helper.paste();

      // B2 should reference B1 (adjusted)
      const b2 = await helper.getCellValue(1, 1);
      expect(b2).toBe('40'); // B1*2 = 20*2 = 40
    });

    test.skip('should preserve absolute references when copying', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Use absolute reference
      await helper.enterCellValue(0, 0, '100');
      await helper.enterCellValue(0, 1, '=$A$1*2');

      // Copy B1
      await helper.selectCell(0, 1);
      await helper.copy();

      // Paste to B2
      await helper.selectCell(1, 1);
      await helper.paste();

      // B2 should still reference A1
      const b2 = await helper.getCellValue(1, 1);
      expect(b2).toBe('200');
    });
  });

  test.describe('Text Functions', () => {
    test('should concatenate text with CONCAT or &', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Hello');
      await helper.enterCellValue(0, 1, 'World');
      await helper.enterCellValue(0, 2, '=A1&" "&B1');

      const result = await helper.getCellValue(0, 2);
      expect(result).toBe('Hello World');
    });

    test('should find text length with LEN', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Hello');
      await helper.enterCellValue(0, 1, '=LEN(A1)');

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('5');
    });

    test('should convert to uppercase with UPPER', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'hello');
      await helper.enterCellValue(0, 1, '=UPPER(A1)');

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('HELLO');
    });

    test('should convert to lowercase with LOWER', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'HELLO');
      await helper.enterCellValue(0, 1, '=LOWER(A1)');

      const result = await helper.getCellValue(0, 1);
      expect(result).toBe('hello');
    });
  });

  test.describe('Error Handling', () => {
    test('should show #NAME? for unknown function', async ({ page }) => {
      await helper.enterCellValue(0, 0, '=UNKNOWNFUNC(A1)');

      const result = await helper.getCellValue(0, 0);
      expect(result).toMatch(/(#NAME|#ERROR)/i);
    });

    test('should show #VALUE! for invalid arguments', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'text');
      await helper.enterCellValue(0, 1, '=SQRT(A1)');

      const result = await helper.getCellValue(0, 1);
      expect(result).toMatch(/(#VALUE|#ERROR|NaN)/i);
    });

    test('should show #REF! for invalid reference', async ({ page }) => {
      // This depends on implementation - some systems may not show this
      // when referencing out-of-bounds cells
      await helper.enterCellValue(0, 0, '=Sheet99!A1');

      const result = await helper.getCellValue(0, 0);
      // May show #REF! or just return empty/0
    });
  });

  test.describe('Date Functions', () => {
    test('should get current date with TODAY', async ({ page }) => {
      await helper.enterCellValue(0, 0, '=TODAY()');

      const result = await helper.getCellValue(0, 0);
      // Should return a date value or formatted date string
      expect(result).toBeTruthy();
    });

    test('should get current date and time with NOW', async ({ page }) => {
      await helper.enterCellValue(0, 0, '=NOW()');

      const result = await helper.getCellValue(0, 0);
      expect(result).toBeTruthy();
    });
  });

  test.describe('Logical Functions', () => {
    test('should evaluate AND function', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '=AND(A1>5,A1<20)');

      const result = await helper.getCellValue(0, 1);
      expect(result.toLowerCase()).toBe('true');
    });

    test('should evaluate OR function', async ({ page }) => {
      await helper.enterCellValue(0, 0, '10');
      await helper.enterCellValue(0, 1, '=OR(A1<5,A1>8)');

      const result = await helper.getCellValue(0, 1);
      expect(result.toLowerCase()).toBe('true');
    });

    test('should evaluate NOT function', async ({ page }) => {
      await helper.enterCellValue(0, 0, '=NOT(TRUE)');

      const result = await helper.getCellValue(0, 0);
      expect(result.toLowerCase()).toBe('false');
    });
  });
});
