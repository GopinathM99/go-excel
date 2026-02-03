/**
 * Data Tools Performance Tests
 *
 * Tests for measuring sort, filter, and data manipulation
 * performance with large datasets.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  measureTime,
  runBenchmarkWithTarget,
  createLargeSheet,
  PERFORMANCE_TARGETS,
  reportResults,
  type BenchmarkResult,
} from './utils';
import {
  createSheet,
  setCell,
  type Sheet,
} from '../../src/models/Sheet';
import { createCell } from '../../src/models/Cell';
import { numberValue, stringValue } from '../../src/models/CellValue';
import type { CellRange } from '../../src/models/CellRange';
import {
  sortRange,
  detectDataRange,
  type SortCriteria,
} from '../../src/data/Sorter';
import {
  createAutoFilter,
  setColumnFilter,
  applyFilter,
  getUniqueValues,
  createValueFilter,
  createConditionFilter,
  type AutoFilter,
} from '../../src/data/Filter';

describe('Data Tools Performance', () => {
  const results: BenchmarkResult[] = [];

  /**
   * Creates a sheet with sortable data
   */
  function createSortableSheet(rows: number, cols: number): Sheet {
    let sheet = createSheet('SortTest');

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Create varied data for sorting
        let value: string;
        let cellValue;

        if (col === 0) {
          // First column: random numbers
          const num = Math.floor(Math.random() * rows);
          value = String(num);
          cellValue = numberValue(num);
        } else if (col === 1) {
          // Second column: random strings
          const names = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape'];
          const name = names[Math.floor(Math.random() * names.length)]!;
          value = name;
          cellValue = stringValue(name);
        } else {
          // Other columns: sequential numbers
          const num = row * cols + col;
          value = String(num);
          cellValue = numberValue(num);
        }

        const cell = createCell({ row, col }, value, cellValue);
        sheet = setCell(sheet, cell);
      }
    }

    return sheet;
  }

  /**
   * Creates a sheet with filterable data
   */
  function createFilterableSheet(rows: number): Sheet {
    let sheet = createSheet('FilterTest');
    const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Toys'];
    const regions = ['North', 'South', 'East', 'West'];

    // Header row
    const headers = ['ID', 'Category', 'Region', 'Amount', 'Status'];
    for (let col = 0; col < headers.length; col++) {
      const cell = createCell(
        { row: 0, col },
        headers[col]!,
        stringValue(headers[col]!)
      );
      sheet = setCell(sheet, cell);
    }

    // Data rows
    for (let row = 1; row <= rows; row++) {
      // ID
      sheet = setCell(sheet, createCell(
        { row, col: 0 },
        String(row),
        numberValue(row)
      ));

      // Category
      const category = categories[Math.floor(Math.random() * categories.length)]!;
      sheet = setCell(sheet, createCell(
        { row, col: 1 },
        category,
        stringValue(category)
      ));

      // Region
      const region = regions[Math.floor(Math.random() * regions.length)]!;
      sheet = setCell(sheet, createCell(
        { row, col: 2 },
        region,
        stringValue(region)
      ));

      // Amount
      const amount = Math.floor(Math.random() * 10000);
      sheet = setCell(sheet, createCell(
        { row, col: 3 },
        String(amount),
        numberValue(amount)
      ));

      // Status
      const status = Math.random() > 0.5 ? 'Active' : 'Inactive';
      sheet = setCell(sheet, createCell(
        { row, col: 4 },
        status,
        stringValue(status)
      ));
    }

    return sheet;
  }

  describe('Sort 10k Rows', () => {
    let sheet10k: Sheet;

    beforeEach(() => {
      sheet10k = createSortableSheet(10000, 5);
    });

    it('should sort 10k rows under 200ms (single column, ascending)', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 9999, col: 4 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = runBenchmarkWithTarget(
        'Sort 10k rows (single column, ascending)',
        () => sortRange(sheet10k, range, criteria),
        PERFORMANCE_TARGETS.SORT_10K_ROWS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should sort 10k rows (single column, descending)', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 9999, col: 4 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: false }];

      const result = runBenchmarkWithTarget(
        'Sort 10k rows (single column, descending)',
        () => sortRange(sheet10k, range, criteria),
        PERFORMANCE_TARGETS.SORT_10K_ROWS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should sort 10k rows (multi-column)', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 9999, col: 4 },
      };
      const criteria: SortCriteria[] = [
        { column: 0, ascending: true },
        { column: 1, ascending: false },
      ];

      const result = runBenchmarkWithTarget(
        'Sort 10k rows (multi-column)',
        () => sortRange(sheet10k, range, criteria),
        PERFORMANCE_TARGETS.SORT_10K_ROWS_MS * 1.5, // Allow 50% more for multi-column
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should sort 10k rows by text column', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 9999, col: 4 },
      };
      const criteria: SortCriteria[] = [{ column: 1, ascending: true }]; // Text column

      const result = runBenchmarkWithTarget(
        'Sort 10k rows (text column)',
        () => sortRange(sheet10k, range, criteria),
        PERFORMANCE_TARGETS.SORT_10K_ROWS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Sort 100k Rows', () => {
    let sheet100k: Sheet;

    beforeEach(() => {
      sheet100k = createSortableSheet(100000, 5);
    });

    it('should sort 100k rows under 2s', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 99999, col: 4 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const result = runBenchmarkWithTarget(
        'Sort 100k rows (single column)',
        () => sortRange(sheet100k, range, criteria),
        PERFORMANCE_TARGETS.SORT_100K_ROWS_MS,
        3
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should handle sort with header row', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 99999, col: 4 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const { duration } = measureTime(() => {
        sortRange(sheet100k, range, criteria, { hasHeader: true });
      });

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.SORT_100K_ROWS_MS);
    });
  });

  describe('Filter 100k Rows', () => {
    let sheet100k: Sheet;
    let autoFilter: AutoFilter;

    beforeEach(() => {
      sheet100k = createFilterableSheet(100000);
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 100000, col: 4 },
      };
      autoFilter = createAutoFilter(sheet100k, range);
    });

    it('should filter 100k rows under 500ms (single criterion)', () => {
      setColumnFilter(autoFilter, 1, createValueFilter(['Electronics']));

      const result = runBenchmarkWithTarget(
        'Filter 100k rows (single value filter)',
        () => applyFilter(sheet100k, autoFilter),
        PERFORMANCE_TARGETS.FILTER_100K_ROWS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should filter with multiple values', () => {
      setColumnFilter(autoFilter, 1, createValueFilter(['Electronics', 'Clothing', 'Books']));

      const result = runBenchmarkWithTarget(
        'Filter 100k rows (multiple values)',
        () => applyFilter(sheet100k, autoFilter),
        PERFORMANCE_TARGETS.FILTER_100K_ROWS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should filter with condition filter', () => {
      setColumnFilter(autoFilter, 3, createConditionFilter([
        { operator: 'greaterThan', value1: 5000 },
      ]));

      const result = runBenchmarkWithTarget(
        'Filter 100k rows (condition filter)',
        () => applyFilter(sheet100k, autoFilter),
        PERFORMANCE_TARGETS.FILTER_100K_ROWS_MS,
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should filter with multiple criteria', () => {
      setColumnFilter(autoFilter, 1, createValueFilter(['Electronics', 'Clothing']));
      setColumnFilter(autoFilter, 2, createValueFilter(['North', 'South']));
      setColumnFilter(autoFilter, 4, createValueFilter(['Active']));

      const result = runBenchmarkWithTarget(
        'Filter 100k rows (multiple criteria)',
        () => applyFilter(sheet100k, autoFilter),
        PERFORMANCE_TARGETS.FILTER_100K_ROWS_MS * 1.5, // Allow 50% more
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should handle complex filter conditions', () => {
      setColumnFilter(autoFilter, 3, createConditionFilter([
        { operator: 'greaterThan', value1: 2000 },
        { operator: 'lessThan', value1: 8000 },
      ], 'and'));

      const { duration } = measureTime(() => {
        applyFilter(sheet100k, autoFilter);
      });

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FILTER_100K_ROWS_MS);
    });
  });

  describe('Get Unique Values from 100k Rows', () => {
    let sheet100k: Sheet;

    beforeEach(() => {
      sheet100k = createFilterableSheet(100000);
    });

    it('should get unique values from column quickly', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 100000, col: 4 },
      };

      const result = runBenchmarkWithTarget(
        'Get unique values (category column - 5 unique)',
        () => getUniqueValues(sheet100k, range, 1),
        200, // Should complete in under 200ms
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should get unique values from high-cardinality column', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 100000, col: 4 },
      };

      const result = runBenchmarkWithTarget(
        'Get unique values (amount column - high cardinality)',
        () => getUniqueValues(sheet100k, range, 3),
        500, // Allow more time for high cardinality
        5
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Data Range Detection', () => {
    let largeSheet: Sheet;

    beforeEach(() => {
      largeSheet = createSortableSheet(10000, 20);
    });

    it('should detect data range quickly', () => {
      const result = runBenchmarkWithTarget(
        'Detect data range (10k x 20)',
        () => detectDataRange(largeSheet, { row: 0, col: 0 }),
        100, // Should complete in under 100ms
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should detect range from middle of data', () => {
      const { duration } = measureTime(() => {
        detectDataRange(largeSheet, { row: 5000, col: 10 });
      });

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Combined Sort and Filter', () => {
    let sheet: Sheet;

    beforeEach(() => {
      sheet = createFilterableSheet(50000);
    });

    it('should handle filter then sort efficiently', () => {
      // First filter
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 50000, col: 4 },
      };
      const autoFilter = createAutoFilter(sheet, range);
      setColumnFilter(autoFilter, 1, createValueFilter(['Electronics']));

      const filterDuration = measureTime(() => {
        applyFilter(sheet, autoFilter);
      }).duration;

      // Then sort
      const criteria: SortCriteria[] = [{ column: 3, ascending: false }];
      const sortDuration = measureTime(() => {
        sortRange(sheet, range, criteria, { hasHeader: true });
      }).duration;

      console.log(`Filter: ${filterDuration.toFixed(2)}ms, Sort: ${sortDuration.toFixed(2)}ms`);

      // Total should be reasonable
      expect(filterDuration + sortDuration).toBeLessThan(1000);
    });
  });

  describe('Large Text Sorting', () => {
    it('should sort large text fields efficiently', () => {
      let sheet = createSheet('LargeTextSort');

      // Create rows with large text content
      for (let row = 0; row < 10000; row++) {
        const text = `Row ${row} with some additional text content that makes the string longer - ${Math.random().toString(36).substring(2)}`;
        const cell = createCell(
          { row, col: 0 },
          text,
          stringValue(text)
        );
        sheet = setCell(sheet, cell);
      }

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 9999, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const { duration } = measureTime(() => {
        sortRange(sheet, range, criteria);
      });

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Natural Sort Performance', () => {
    it('should perform natural sort efficiently', () => {
      let sheet = createSheet('NaturalSort');

      // Create data that benefits from natural sort
      const values = ['Item 1', 'Item 10', 'Item 2', 'Item 20', 'Item 3'];
      for (let row = 0; row < 10000; row++) {
        const value = `${values[row % values.length]}${Math.floor(row / 5)}`;
        const cell = createCell(
          { row, col: 0 },
          value,
          stringValue(value)
        );
        sheet = setCell(sheet, cell);
      }

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 9999, col: 0 },
      };
      const criteria: SortCriteria[] = [{ column: 0, ascending: true }];

      const { duration } = measureTime(() => {
        sortRange(sheet, range, criteria);
      });

      expect(duration).toBeLessThan(500);
    });
  });

  // Report all results at the end
  describe('Performance Summary', () => {
    it('should report all benchmark results', () => {
      if (results.length > 0) {
        console.log(reportResults(results));
      }
    });
  });
});
