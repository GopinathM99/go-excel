import { describe, it, expect } from 'vitest';
import {
  sortRange,
  detectDataRange,
  createUndoMappings,
  applySortResult,
  validateSortCriteria,
  SortCriteria,
  SortOptions,
} from '../Sorter';
import { createSheet, setCell, getCell } from '../../models/Sheet';
import { createCell } from '../../models/Cell';
import {
  numberValue,
  stringValue,
  booleanValue,
  errorValue,
  emptyValue,
  CellErrorCode,
} from '../../models/CellValue';
import type { CellRange } from '../../models/CellRange';
import type { Sheet } from '../../models/Sheet';

/**
 * Helper to create a sheet with data
 */
function createSheetWithData(
  data: (string | number | boolean | null)[][]
): Sheet {
  let sheet = createSheet('TestSheet');

  for (let row = 0; row < data.length; row++) {
    const rowData = data[row];
    if (rowData === undefined) continue;

    for (let col = 0; col < rowData.length; col++) {
      const cellData = rowData[col];
      if (cellData !== null && cellData !== undefined) {
        const rawValue = String(cellData);
        let value;
        if (typeof cellData === 'number') {
          value = numberValue(cellData);
        } else if (typeof cellData === 'boolean') {
          value = booleanValue(cellData);
        } else {
          value = stringValue(cellData);
        }
        const cell = createCell({ row, col }, rawValue, value);
        sheet = setCell(sheet, cell);
      }
    }
  }

  return sheet;
}

/**
 * Helper to extract values from sorted cells for easy comparison
 */
function extractSortedValues(
  sortedCells: ReturnType<typeof sortRange>['sortedCells'],
  range: CellRange
): (string | number | boolean | null)[][] {
  const result: (string | number | boolean | null)[][] = [];
  const rowCount = range.end.row - range.start.row + 1;
  const colCount = range.end.col - range.start.col + 1;

  // Initialize result array
  for (let r = 0; r < rowCount; r++) {
    result.push(new Array(colCount).fill(null) as (string | number | boolean | null)[]);
  }

  // Fill in values from sorted cells
  for (const cell of sortedCells) {
    const row = cell.address.row - range.start.row;
    const col = cell.address.col - range.start.col;
    if (row >= 0 && row < rowCount && col >= 0 && col < colCount) {
      const resultRow = result[row];
      if (resultRow === undefined) continue;

      const value = cell.value;
      switch (value.type) {
        case 'number':
          resultRow[col] = value.value;
          break;
        case 'string':
          resultRow[col] = value.value;
          break;
        case 'boolean':
          resultRow[col] = value.value;
          break;
        case 'error':
          resultRow[col] = value.error.code;
          break;
        case 'empty':
          resultRow[col] = null;
          break;
      }
    }
  }

  return result;
}

describe('sortRange', () => {
  describe('single column sorting', () => {
    it('should sort numbers in ascending order', () => {
      const sheet = createSheetWithData([
        [3],
        [1],
        [4],
        [1],
        [5],
        [9],
        [2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 6, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual([1, 1, 2, 3, 4, 5, 9]);
    });

    it('should sort numbers in descending order', () => {
      const sheet = createSheetWithData([
        [3],
        [1],
        [4],
        [5],
        [2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 4, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: false }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual([5, 4, 3, 2, 1]);
    });

    it('should sort strings alphabetically', () => {
      const sheet = createSheetWithData([
        ['Banana'],
        ['Apple'],
        ['Cherry'],
        ['Date'],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
    });

    it('should sort strings with natural sort (A2 before A10)', () => {
      const sheet = createSheetWithData([
        ['Item10'],
        ['Item2'],
        ['Item1'],
        ['Item20'],
        ['Item3'],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 4, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual(['Item1', 'Item2', 'Item3', 'Item10', 'Item20']);
    });

    it('should sort booleans (FALSE before TRUE)', () => {
      const sheet = createSheetWithData([
        [true],
        [false],
        [true],
        [false],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual([false, false, true, true]);
    });
  });

  describe('mixed type sorting', () => {
    it('should sort numbers before text', () => {
      const sheet = createSheetWithData([
        ['Text'],
        [1],
        ['Another'],
        [2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      // Numbers first, then text
      expect(values.flat()).toEqual([1, 2, 'Another', 'Text']);
    });

    it('should sort blanks at the end (ascending)', () => {
      const sheet = createSheetWithData([
        [3],
        [null],
        [1],
        [null],
        [2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 4, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual([1, 2, 3, null, null]);
    });

    it('should sort blanks at the end (descending)', () => {
      const sheet = createSheetWithData([
        [3],
        [null],
        [1],
        [null],
        [2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 4, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: false }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      // Blanks still at end even in descending
      expect(values.flat()).toEqual([3, 2, 1, null, null]);
    });

    it('should handle errors (after values, before blanks)', () => {
      let sheet = createSheet('TestSheet');

      // Add a number
      sheet = setCell(sheet, createCell({ row: 0, col: 0 }, '2', numberValue(2)));
      // Add an error
      sheet = setCell(
        sheet,
        createCell({ row: 1, col: 0 }, '#DIV/0!', errorValue(CellErrorCode.DIV_ZERO))
      );
      // Add another number
      sheet = setCell(sheet, createCell({ row: 2, col: 0 }, '1', numberValue(1)));
      // Add blank (no cell)
      // Add another error
      sheet = setCell(
        sheet,
        createCell({ row: 4, col: 0 }, '#VALUE!', errorValue(CellErrorCode.VALUE))
      );

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 4, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      // Numbers, then errors (maintaining order), then blanks
      expect(values.flat()).toEqual([1, 2, '#DIV/0!', '#VALUE!', null]);
    });
  });

  describe('multi-column sorting', () => {
    it('should sort by primary column first', () => {
      const sheet = createSheetWithData([
        ['B', 2],
        ['A', 1],
        ['B', 1],
        ['A', 2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 1 },
      };
      const criteria: SortCriteria[] = [
        { column: 0, ascending: true }, // Primary: first column
        { column: 1, ascending: true }, // Secondary: second column
      ];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values).toEqual([
        ['A', 1],
        ['A', 2],
        ['B', 1],
        ['B', 2],
      ]);
    });

    it('should use secondary criteria when primary values are equal', () => {
      const sheet = createSheetWithData([
        ['A', 3],
        ['A', 1],
        ['B', 2],
        ['A', 2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 1 },
      };
      const criteria: SortCriteria[] = [
        { column: 0, ascending: true },
        { column: 1, ascending: true },
      ];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values).toEqual([
        ['A', 1],
        ['A', 2],
        ['A', 3],
        ['B', 2],
      ]);
    });

    it('should handle mixed ascending/descending in multi-column sort', () => {
      const sheet = createSheetWithData([
        ['A', 1],
        ['A', 3],
        ['B', 2],
        ['A', 2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 1 },
      };
      const criteria: SortCriteria[] = [
        { column: 0, ascending: true },   // Column A ascending
        { column: 1, ascending: false },  // Column B descending
      ];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values).toEqual([
        ['A', 3],
        ['A', 2],
        ['A', 1],
        ['B', 2],
      ]);
    });

    it('should support three-level sorting', () => {
      const sheet = createSheetWithData([
        ['A', 1, 'z'],
        ['A', 1, 'a'],
        ['A', 2, 'b'],
        ['B', 1, 'c'],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 2 },
      };
      const criteria: SortCriteria[] = [
        { column: 0, ascending: true },
        { column: 1, ascending: true },
        { column: 2, ascending: true },
      ];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values).toEqual([
        ['A', 1, 'a'],
        ['A', 1, 'z'],
        ['A', 2, 'b'],
        ['B', 1, 'c'],
      ]);
    });
  });

  describe('header row handling', () => {
    it('should exclude header row when hasHeader is true', () => {
      const sheet = createSheetWithData([
        ['Name', 'Age'],  // Header
        ['Charlie', 30],
        ['Alice', 25],
        ['Bob', 35],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 1 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];
      const options: Partial<SortOptions> = { hasHeader: true };

      const result = sortRange(sheet, range, criteria, options);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values).toEqual([
        ['Name', 'Age'],   // Header stays at top
        ['Alice', 25],
        ['Bob', 35],
        ['Charlie', 30],
      ]);
    });

    it('should sort all rows when hasHeader is false', () => {
      const sheet = createSheetWithData([
        ['Zebra', 1],
        ['Apple', 2],
        ['Banana', 3],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 1 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];
      const options: Partial<SortOptions> = { hasHeader: false };

      const result = sortRange(sheet, range, criteria, options);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values).toEqual([
        ['Apple', 2],
        ['Banana', 3],
        ['Zebra', 1],
      ]);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-insensitive by default', () => {
      const sheet = createSheetWithData([
        ['banana'],
        ['APPLE'],
        ['Cherry'],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      expect(values.flat()).toEqual(['APPLE', 'banana', 'Cherry']);
    });

    it('should respect case when caseSensitive is true', () => {
      const sheet = createSheetWithData([
        ['banana'],
        ['Banana'],
        ['BANANA'],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];
      const options: Partial<SortOptions> = { caseSensitive: true };

      const result = sortRange(sheet, range, criteria, options);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      // Case-sensitive sort: uppercase letters typically sort before lowercase in locale
      expect(values.flat()).toEqual(['BANANA', 'Banana', 'banana']);
    });
  });

  describe('stable sort', () => {
    it('should maintain original order for equal values', () => {
      const sheet = createSheetWithData([
        ['A', 'first'],
        ['B', 'x'],
        ['A', 'second'],
        ['B', 'y'],
        ['A', 'third'],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 4, col: 1 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      const values = extractSortedValues(result.sortedCells, range);
      // All 'A' rows should maintain their relative order
      expect(values).toEqual([
        ['A', 'first'],
        ['A', 'second'],
        ['A', 'third'],
        ['B', 'x'],
        ['B', 'y'],
      ]);
    });
  });

  describe('row mappings for undo', () => {
    it('should return correct row mappings', () => {
      const sheet = createSheetWithData([
        [3],
        [1],
        [2],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      expect(result.rowMappings).toHaveLength(3);

      // Original row 1 (value 1) -> new row 0
      // Original row 2 (value 2) -> new row 1
      // Original row 0 (value 3) -> new row 2
      const mapping1 = result.rowMappings.find((m) => m.originalRow === 1);
      expect(mapping1?.newRow).toBe(0);

      const mapping2 = result.rowMappings.find((m) => m.originalRow === 2);
      expect(mapping2?.newRow).toBe(1);

      const mapping3 = result.rowMappings.find((m) => m.originalRow === 0);
      expect(mapping3?.newRow).toBe(2);
    });

    it('should not include header row in mappings', () => {
      const sheet = createSheetWithData([
        ['Header'],
        [2],
        [1],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];
      const options: Partial<SortOptions> = { hasHeader: true };

      const result = sortRange(sheet, range, criteria, options);

      expect(result.success).toBe(true);
      // Only data rows in mappings, not header
      expect(result.rowMappings).toHaveLength(2);
      expect(result.rowMappings.every((m) => m.originalRow !== 0)).toBe(true);
    });
  });

  describe('validation and error handling', () => {
    it('should fail with no criteria', () => {
      const sheet = createSheetWithData([[1], [2]]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 0 },
      };

      const result = sortRange(sheet, range, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one sort criterion');
    });

    it('should fail with invalid column index', () => {
      const sheet = createSheetWithData([
        [1, 2],
        [3, 4],
      ]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 },
      };
      const criteria: SortCriteria[] = [{ column: 5, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid column index');
    });

    it('should succeed with single row (nothing to sort)', () => {
      const sheet = createSheetWithData([[1, 2, 3]]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 2 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = sortRange(sheet, range, criteria);

      expect(result.success).toBe(true);
      expect(result.rowMappings).toHaveLength(0);
    });

    it('should succeed with only header row', () => {
      const sheet = createSheetWithData([['A', 'B', 'C']]);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 2 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];
      const options: Partial<SortOptions> = { hasHeader: true };

      const result = sortRange(sheet, range, criteria, options);

      expect(result.success).toBe(true);
    });
  });
});

describe('detectDataRange', () => {
  it('should detect single cell', () => {
    const sheet = createSheetWithData([[1]]);
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range).toEqual({
      start: { row: 0, col: 0, sheetName: undefined },
      end: { row: 0, col: 0, sheetName: undefined },
    });
  });

  it('should detect horizontal range', () => {
    const sheet = createSheetWithData([[1, 2, 3, 4]]);
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range.start.col).toBe(0);
    expect(range.end.col).toBe(3);
    expect(range.start.row).toBe(0);
    expect(range.end.row).toBe(0);
  });

  it('should detect vertical range', () => {
    const sheet = createSheetWithData([
      [1],
      [2],
      [3],
    ]);
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range.start.row).toBe(0);
    expect(range.end.row).toBe(2);
    expect(range.start.col).toBe(0);
    expect(range.end.col).toBe(0);
  });

  it('should detect rectangular range', () => {
    const sheet = createSheetWithData([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range).toEqual({
      start: { row: 0, col: 0, sheetName: undefined },
      end: { row: 2, col: 2, sheetName: undefined },
    });
  });

  it('should stop at empty row', () => {
    const sheet = createSheetWithData([
      [1, 2],
      [3, 4],
      [null, null],  // Empty row
      [5, 6],        // This should not be included
    ]);
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range.end.row).toBe(1);
  });

  it('should handle sparse data in rows', () => {
    const sheet = createSheetWithData([
      [1, null, 3],
      [4, 5, null],
    ]);
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range.end.col).toBe(2);
    expect(range.end.row).toBe(1);
  });

  it('should return empty range for empty start cell', () => {
    const sheet = createSheet('Empty');
    const range = detectDataRange(sheet, { row: 0, col: 0 });

    expect(range).toEqual({
      start: { row: 0, col: 0, sheetName: undefined },
      end: { row: 0, col: 0, sheetName: undefined },
    });
  });
});

describe('createUndoMappings', () => {
  it('should create inverse mappings', () => {
    const originalMappings = [
      { originalRow: 0, newRow: 2 },
      { originalRow: 1, newRow: 0 },
      { originalRow: 2, newRow: 1 },
    ];

    const undoMappings = createUndoMappings(originalMappings);

    expect(undoMappings).toEqual([
      { originalRow: 2, newRow: 0 },
      { originalRow: 0, newRow: 1 },
      { originalRow: 1, newRow: 2 },
    ]);
  });
});

describe('applySortResult', () => {
  it('should apply sorted cells to sheet', () => {
    const sheet = createSheetWithData([
      [3],
      [1],
      [2],
    ]);
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 2, col: 0 },
    };
    const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

    const sortResult = sortRange(sheet, range, criteria);
    const newSheet = applySortResult(sheet, sortResult.sortedCells, range);

    // Verify the sheet has been updated
    expect(getCell(newSheet, { row: 0, col: 0 }).value).toEqual(numberValue(1));
    expect(getCell(newSheet, { row: 1, col: 0 }).value).toEqual(numberValue(2));
    expect(getCell(newSheet, { row: 2, col: 0 }).value).toEqual(numberValue(3));
  });

  it('should not mutate original sheet', () => {
    const sheet = createSheetWithData([
      [3],
      [1],
      [2],
    ]);
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 2, col: 0 },
    };
    const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

    const sortResult = sortRange(sheet, range, criteria);
    applySortResult(sheet, sortResult.sortedCells, range);

    // Original sheet should be unchanged
    expect(getCell(sheet, { row: 0, col: 0 }).value).toEqual(numberValue(3));
    expect(getCell(sheet, { row: 1, col: 0 }).value).toEqual(numberValue(1));
    expect(getCell(sheet, { row: 2, col: 0 }).value).toEqual(numberValue(2));
  });
});

describe('validateSortCriteria', () => {
  it('should validate valid criteria', () => {
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 5, col: 3 },
    };
    const criteria: SortCriteria[] = [
      { column: 0, ascending: true },
      { column: 2, ascending: false },
    ];

    const result = validateSortCriteria(range, criteria);

    expect(result.valid).toBe(true);
  });

  it('should reject empty criteria', () => {
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 5, col: 3 },
    };

    const result = validateSortCriteria(range, []);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('At least one sort criterion');
  });

  it('should reject negative column index', () => {
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 5, col: 3 },
    };
    const criteria: SortCriteria[] = [{ column: -1, ascending: true }];

    const result = validateSortCriteria(range, criteria);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be negative');
  });

  it('should reject column index exceeding range', () => {
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 5, col: 2 }, // 3 columns (0, 1, 2)
    };
    const criteria: SortCriteria[] = [{ column: 5, ascending: true }];

    const result = validateSortCriteria(range, criteria);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds range');
  });

  it('should reject duplicate columns', () => {
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 5, col: 3 },
    };
    const criteria: SortCriteria[] = [
      { column: 1, ascending: true },
      { column: 2, ascending: false },
      { column: 1, ascending: false }, // Duplicate
    ];

    const result = validateSortCriteria(range, criteria);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('specified more than once');
  });
});

describe('natural sort edge cases', () => {
  it('should handle strings with multiple number segments', () => {
    const sheet = createSheetWithData([
      ['v1.10.2'],
      ['v1.2.10'],
      ['v1.2.2'],
      ['v10.1.1'],
      ['v2.1.1'],
    ]);
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 4, col: 0 },
    };
    const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

    const result = sortRange(sheet, range, criteria);

    expect(result.success).toBe(true);
    const values = extractSortedValues(result.sortedCells, range);
    expect(values.flat()).toEqual([
      'v1.2.2',
      'v1.2.10',
      'v1.10.2',
      'v2.1.1',
      'v10.1.1',
    ]);
  });

  it('should handle pure numeric strings', () => {
    const sheet = createSheetWithData([
      ['100'],
      ['20'],
      ['3'],
    ]);
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 2, col: 0 },
    };
    const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

    const result = sortRange(sheet, range, criteria);

    expect(result.success).toBe(true);
    const values = extractSortedValues(result.sortedCells, range);
    // Note: these are strings, but natural sort handles them numerically
    expect(values.flat()).toEqual(['3', '20', '100']);
  });

  it('should handle empty strings', () => {
    const sheet = createSheetWithData([
      ['b'],
      [''],
      ['a'],
    ]);
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: 2, col: 0 },
    };
    const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

    const result = sortRange(sheet, range, criteria);

    expect(result.success).toBe(true);
    const values = extractSortedValues(result.sortedCells, range);
    // Empty strings sort as text (empty string comes first alphabetically)
    expect(values.flat()).toEqual(['', 'a', 'b']);
  });
});
