import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAutoFilter,
  setColumnFilter,
  clearColumnFilter,
  clearAllFilters,
  applyFilter,
  getUniqueValues,
  getVisibleRows,
  getHiddenRows,
  createValueFilter,
  createConditionFilter,
  applyFilterToSheet,
  removeAutoFilter,
  isRowVisible,
  getVisibleRowCount,
  getTotalRowCount,
  type AutoFilter,
  type ColumnFilter,
  type FilterCondition,
} from '../Filter';
import { createSheet, setCell, type Sheet } from '../../models/Sheet';
import { createCell } from '../../models/Cell';
import { stringValue, numberValue, emptyValue, booleanValue, errorValue, CellErrorCode } from '../../models/CellValue';
import type { CellRange } from '../../models/CellRange';

describe('Filter', () => {
  let sheet: Sheet;
  let range: CellRange;

  beforeEach(() => {
    // Create a test sheet with sample data
    sheet = createSheet('Test');

    // Header row (row 0)
    sheet = setCell(sheet, createCell({ row: 0, col: 0 }, 'Name', stringValue('Name')));
    sheet = setCell(sheet, createCell({ row: 0, col: 1 }, 'Age', stringValue('Age')));
    sheet = setCell(sheet, createCell({ row: 0, col: 2 }, 'City', stringValue('City')));
    sheet = setCell(sheet, createCell({ row: 0, col: 3 }, 'Score', stringValue('Score')));

    // Data rows (rows 1-6)
    sheet = setCell(sheet, createCell({ row: 1, col: 0 }, 'Alice', stringValue('Alice')));
    sheet = setCell(sheet, createCell({ row: 1, col: 1 }, '25', numberValue(25)));
    sheet = setCell(sheet, createCell({ row: 1, col: 2 }, 'New York', stringValue('New York')));
    sheet = setCell(sheet, createCell({ row: 1, col: 3 }, '85', numberValue(85)));

    sheet = setCell(sheet, createCell({ row: 2, col: 0 }, 'Bob', stringValue('Bob')));
    sheet = setCell(sheet, createCell({ row: 2, col: 1 }, '30', numberValue(30)));
    sheet = setCell(sheet, createCell({ row: 2, col: 2 }, 'Boston', stringValue('Boston')));
    sheet = setCell(sheet, createCell({ row: 2, col: 3 }, '92', numberValue(92)));

    sheet = setCell(sheet, createCell({ row: 3, col: 0 }, 'Charlie', stringValue('Charlie')));
    sheet = setCell(sheet, createCell({ row: 3, col: 1 }, '35', numberValue(35)));
    sheet = setCell(sheet, createCell({ row: 3, col: 2 }, 'New York', stringValue('New York')));
    sheet = setCell(sheet, createCell({ row: 3, col: 3 }, '78', numberValue(78)));

    sheet = setCell(sheet, createCell({ row: 4, col: 0 }, 'Diana', stringValue('Diana')));
    sheet = setCell(sheet, createCell({ row: 4, col: 1 }, '28', numberValue(28)));
    sheet = setCell(sheet, createCell({ row: 4, col: 2 }, 'Chicago', stringValue('Chicago')));
    sheet = setCell(sheet, createCell({ row: 4, col: 3 }, '88', numberValue(88)));

    sheet = setCell(sheet, createCell({ row: 5, col: 0 }, 'Eve', stringValue('Eve')));
    sheet = setCell(sheet, createCell({ row: 5, col: 1 }, '22', numberValue(22)));
    sheet = setCell(sheet, createCell({ row: 5, col: 2 }, 'Boston', stringValue('Boston')));
    sheet = setCell(sheet, createCell({ row: 5, col: 3 }, '95', numberValue(95)));

    sheet = setCell(sheet, createCell({ row: 6, col: 0 }, 'Frank', stringValue('Frank')));
    sheet = setCell(sheet, createCell({ row: 6, col: 1 }, '40', numberValue(40)));
    sheet = setCell(sheet, createCell({ row: 6, col: 2 }, 'New York', stringValue('New York')));
    sheet = setCell(sheet, createCell({ row: 6, col: 3 }, '70', numberValue(70)));

    range = {
      start: { row: 0, col: 0 },
      end: { row: 6, col: 3 },
    };
  });

  describe('createAutoFilter', () => {
    it('should create a new auto-filter for the given range', () => {
      const filter = createAutoFilter(sheet, range);
      expect(filter.range.start).toEqual(range.start);
      expect(filter.range.end).toEqual(range.end);
      expect(filter.filters.size).toBe(0);
    });
  });

  describe('setColumnFilter / clearColumnFilter / clearAllFilters', () => {
    it('should set a column filter', () => {
      const filter = createAutoFilter(sheet, range);
      const columnFilter: ColumnFilter = {
        type: 'values',
        values: new Set(['New York']),
      };
      setColumnFilter(filter, 2, columnFilter);
      expect(filter.filters.has(2)).toBe(true);
      expect(filter.filters.get(2)).toBe(columnFilter);
    });

    it('should clear a specific column filter', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, { type: 'values', values: new Set(['New York']) });
      clearColumnFilter(filter, 2);
      expect(filter.filters.has(2)).toBe(false);
    });

    it('should clear all filters', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 0, { type: 'values', values: new Set(['Alice']) });
      setColumnFilter(filter, 2, { type: 'values', values: new Set(['New York']) });
      clearAllFilters(filter);
      expect(filter.filters.size).toBe(0);
    });
  });

  describe('Value-based filtering', () => {
    it('should filter by single value', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York']));
      const result = applyFilter(sheet, filter);

      // Should show only rows with "New York" (rows 1, 3, 6)
      expect(result.visibleRows).toEqual([1, 3, 6]);
      expect(result.hiddenRows).toEqual([2, 4, 5]);
    });

    it('should filter by multiple values', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York', 'Boston']));
      const result = applyFilter(sheet, filter);

      // Should show rows with "New York" or "Boston" (rows 1, 2, 3, 5, 6)
      expect(result.visibleRows).toEqual([1, 2, 3, 5, 6]);
      expect(result.hiddenRows).toEqual([4]);
    });

    it('should handle empty value filter (show all)', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, { type: 'values', values: new Set() });
      const result = applyFilter(sheet, filter);

      // All rows should be visible
      expect(result.visibleRows).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.hiddenRows).toEqual([]);
    });

    it('should combine filters across multiple columns', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York']));
      setColumnFilter(filter, 0, createValueFilter(['Alice', 'Charlie']));
      const result = applyFilter(sheet, filter);

      // Should show only rows that match BOTH filters (rows 1, 3)
      expect(result.visibleRows).toEqual([1, 3]);
    });
  });

  describe('Condition-based filtering', () => {
    describe('Numeric operators', () => {
      it('should filter by equals', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'equals', value1: 30 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([2]); // Only Bob (age 30)
      });

      it('should filter by notEquals', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'notEquals', value1: 30 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1, 3, 4, 5, 6]); // Everyone except Bob
      });

      it('should filter by greaterThan', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'greaterThan', value1: 30 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([3, 6]); // Charlie (35), Frank (40)
      });

      it('should filter by greaterThanOrEqual', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'greaterThanOrEqual', value1: 30 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([2, 3, 6]); // Bob (30), Charlie (35), Frank (40)
      });

      it('should filter by lessThan', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'lessThan', value1: 28 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1, 5]); // Alice (25), Eve (22)
      });

      it('should filter by lessThanOrEqual', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'lessThanOrEqual', value1: 28 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1, 4, 5]); // Alice (25), Diana (28), Eve (22)
      });

      it('should filter by between', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'between', value1: 25, value2: 30 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1, 2, 4]); // Alice (25), Bob (30), Diana (28)
      });

      it('should filter by notBetween', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'notBetween', value1: 25, value2: 30 },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([3, 5, 6]); // Charlie (35), Eve (22), Frank (40)
      });
    });

    describe('Text operators', () => {
      it('should filter by contains (case-insensitive)', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 2, createConditionFilter([
          { operator: 'contains', value1: 'new' },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1, 3, 6]); // New York rows
      });

      it('should filter by notContains', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 2, createConditionFilter([
          { operator: 'notContains', value1: 'york' },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([2, 4, 5]); // Boston and Chicago
      });

      it('should filter by startsWith', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 0, createConditionFilter([
          { operator: 'startsWith', value1: 'A' },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1]); // Alice
      });

      it('should filter by endsWith', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 0, createConditionFilter([
          { operator: 'endsWith', value1: 'e' },
        ]));
        const result = applyFilter(sheet, filter);
        expect(result.visibleRows).toEqual([1, 3, 5]); // Alice, Charlie, Eve
      });
    });

    describe('Blank operators', () => {
      it('should filter by blank', () => {
        // Add a blank cell
        const testSheet = setCell(sheet, createCell({ row: 7, col: 0 }, '', emptyValue()));
        const testRange = { start: { row: 0, col: 0 }, end: { row: 7, col: 3 } };

        const filter = createAutoFilter(testSheet, testRange);
        setColumnFilter(filter, 0, createConditionFilter([
          { operator: 'blank' },
        ]));
        const result = applyFilter(testSheet, filter);
        expect(result.visibleRows).toEqual([7]); // Only the blank row
      });

      it('should filter by notBlank', () => {
        // Add a blank cell
        const testSheet = setCell(sheet, createCell({ row: 7, col: 0 }, '', emptyValue()));
        const testRange = { start: { row: 0, col: 0 }, end: { row: 7, col: 3 } };

        const filter = createAutoFilter(testSheet, testRange);
        setColumnFilter(filter, 0, createConditionFilter([
          { operator: 'notBlank' },
        ]));
        const result = applyFilter(testSheet, filter);
        expect(result.visibleRows).toEqual([1, 2, 3, 4, 5, 6]); // All non-blank rows
      });
    });

    describe('Multiple conditions with AND/OR logic', () => {
      it('should apply AND logic (default)', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'greaterThan', value1: 25 },
          { operator: 'lessThan', value1: 35 },
        ], 'and'));
        const result = applyFilter(sheet, filter);
        // Age > 25 AND Age < 35: Bob (30), Diana (28)
        expect(result.visibleRows).toEqual([2, 4]);
      });

      it('should apply OR logic', () => {
        const filter = createAutoFilter(sheet, range);
        setColumnFilter(filter, 1, createConditionFilter([
          { operator: 'equals', value1: 22 },
          { operator: 'equals', value1: 40 },
        ], 'or'));
        const result = applyFilter(sheet, filter);
        // Age = 22 OR Age = 40: Eve (22), Frank (40)
        expect(result.visibleRows).toEqual([5, 6]);
      });
    });
  });

  describe('Statistical operators', () => {
    it('should filter by top10', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 3, createConditionFilter([
        { operator: 'top10' },
      ]));
      const result = applyFilter(sheet, filter);
      // All 6 rows have scores, top 10 would include all (less than 10 rows)
      // Scores: 85, 92, 78, 88, 95, 70 - all visible
      expect(result.visibleRows).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should filter by aboveAverage', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 3, createConditionFilter([
        { operator: 'aboveAverage' },
      ]));
      const result = applyFilter(sheet, filter);
      // Scores: 85, 92, 78, 88, 95, 70 -> Average = 84.67
      // Above average: 85, 92, 88, 95 (rows 1, 2, 4, 5)
      expect(result.visibleRows).toEqual([1, 2, 4, 5]);
    });

    it('should filter by belowAverage', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 3, createConditionFilter([
        { operator: 'belowAverage' },
      ]));
      const result = applyFilter(sheet, filter);
      // Scores: 85, 92, 78, 88, 95, 70 -> Average = 84.67
      // Below average: 78, 70 (rows 3, 6)
      expect(result.visibleRows).toEqual([3, 6]);
    });
  });

  describe('getUniqueValues', () => {
    it('should return unique values sorted alphabetically', () => {
      const values = getUniqueValues(sheet, range, 2); // City column
      expect(values).toEqual(['Boston', 'Chicago', 'New York']);
    });

    it('should return unique numeric values sorted numerically', () => {
      const values = getUniqueValues(sheet, range, 1); // Age column
      expect(values).toEqual(['22', '25', '28', '30', '35', '40']);
    });

    it('should handle blank values (sorted last)', () => {
      const testSheet = setCell(sheet, createCell({ row: 7, col: 2 }, '', emptyValue()));
      const testRange = { start: { row: 0, col: 0 }, end: { row: 7, col: 3 } };
      const values = getUniqueValues(testSheet, testRange, 2);
      expect(values[values.length - 1]).toBe('');
    });
  });

  describe('getVisibleRows / getHiddenRows', () => {
    it('should return visible row indices', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['Boston']));
      const visible = getVisibleRows(sheet, filter);
      expect(visible).toEqual([2, 5]); // Bob and Eve
    });

    it('should return hidden row indices', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['Boston']));
      const hidden = getHiddenRows(sheet, filter);
      expect(hidden).toEqual([1, 3, 4, 6]);
    });
  });

  describe('applyFilterToSheet', () => {
    it('should update sheet hiddenRows based on filter', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York']));
      const updatedSheet = applyFilterToSheet(sheet, filter);

      expect(updatedSheet.hiddenRows.has(1)).toBe(false); // Alice - visible
      expect(updatedSheet.hiddenRows.has(2)).toBe(true);  // Bob - hidden
      expect(updatedSheet.hiddenRows.has(3)).toBe(false); // Charlie - visible
      expect(updatedSheet.hiddenRows.has(4)).toBe(true);  // Diana - hidden
      expect(updatedSheet.hiddenRows.has(5)).toBe(true);  // Eve - hidden
      expect(updatedSheet.hiddenRows.has(6)).toBe(false); // Frank - visible
    });

    it('should set autoFilter on the sheet', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York']));
      const updatedSheet = applyFilterToSheet(sheet, filter);

      expect(updatedSheet.autoFilter).toBe(filter);
    });
  });

  describe('removeAutoFilter', () => {
    it('should remove autoFilter and show all rows', () => {
      // First apply a filter
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York']));
      let updatedSheet = applyFilterToSheet(sheet, filter);

      // Then remove it
      updatedSheet = removeAutoFilter(updatedSheet);

      expect(updatedSheet.autoFilter).toBeUndefined();
      // All rows in filter range should be visible
      for (let row = 1; row <= 6; row++) {
        expect(updatedSheet.hiddenRows.has(row)).toBe(false);
      }
    });

    it('should preserve manually hidden rows outside filter range', () => {
      // Manually hide row 10 (outside filter range)
      let testSheet = { ...sheet, hiddenRows: new Set([10]) };

      // Apply and remove filter
      const filter = createAutoFilter(testSheet, range);
      setColumnFilter(filter, 2, createValueFilter(['New York']));
      testSheet = applyFilterToSheet(testSheet, filter);
      testSheet = removeAutoFilter(testSheet);

      // Row 10 should still be hidden
      expect(testSheet.hiddenRows.has(10)).toBe(true);
    });
  });

  describe('isRowVisible / getVisibleRowCount / getTotalRowCount', () => {
    it('should check if a specific row is visible', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['Boston']));

      expect(isRowVisible(sheet, filter, 2)).toBe(true);  // Bob - Boston
      expect(isRowVisible(sheet, filter, 5)).toBe(true);  // Eve - Boston
      expect(isRowVisible(sheet, filter, 1)).toBe(false); // Alice - New York
    });

    it('should return the count of visible rows', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['Boston']));

      expect(getVisibleRowCount(sheet, filter)).toBe(2); // Bob and Eve
    });

    it('should return total row count (excluding header)', () => {
      const filter = createAutoFilter(sheet, range);
      expect(getTotalRowCount(filter)).toBe(6);
    });
  });

  describe('Edge cases', () => {
    it('should handle errors in cells', () => {
      const testSheet = setCell(sheet, createCell(
        { row: 1, col: 3 },
        '=1/0',
        errorValue(CellErrorCode.DIV_ZERO)
      ));

      const filter = createAutoFilter(testSheet, range);
      setColumnFilter(filter, 3, createConditionFilter([
        { operator: 'blank' },
      ]));
      const result = applyFilter(testSheet, filter);

      // Error cells should be considered blank
      expect(result.visibleRows).toContain(1);
    });

    it('should handle boolean values', () => {
      const testSheet = setCell(sheet, createCell(
        { row: 1, col: 3 },
        'TRUE',
        booleanValue(true)
      ));
      const testSheet2 = setCell(testSheet, createCell(
        { row: 2, col: 3 },
        'FALSE',
        booleanValue(false)
      ));

      const values = getUniqueValues(testSheet2, range, 3);
      expect(values).toContain('TRUE');
      expect(values).toContain('FALSE');
    });

    it('should handle no filters (all rows visible)', () => {
      const filter = createAutoFilter(sheet, range);
      const result = applyFilter(sheet, filter);

      expect(result.visibleRows).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.hiddenRows).toEqual([]);
    });

    it('should handle filter with no matching rows', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 2, createValueFilter(['London'])); // No London in data
      const result = applyFilter(sheet, filter);

      expect(result.visibleRows).toEqual([]);
      expect(result.hiddenRows).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle text equals for text values', () => {
      const filter = createAutoFilter(sheet, range);
      setColumnFilter(filter, 0, createConditionFilter([
        { operator: 'equals', value1: 'alice' }, // lowercase
      ]));
      const result = applyFilter(sheet, filter);

      // Case-insensitive matching should find Alice
      expect(result.visibleRows).toEqual([1]);
    });
  });
});
