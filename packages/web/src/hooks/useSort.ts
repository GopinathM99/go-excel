import { useCallback } from 'react';
import { useSpreadsheetStore } from '../store/spreadsheet';
import type { CellRange } from '@excel/core';
import type { SortCriteria, SortOptions, SortResult } from '@excel/core';
import {
  sortRange,
  applySortResult,
  validateSortCriteria,
  detectDataRange,
  createSheet,
  getCell,
  columnIndexToLabel,
} from '@excel/core';

/**
 * Sort level configuration for the UI
 */
export interface SortLevel {
  /** Unique ID for React key */
  id: string;
  /** Column index (0-based, relative to the range) */
  column: number;
  /** Sort direction: true for ascending, false for descending */
  ascending: boolean;
}

/**
 * Sort configuration for the dialog
 */
export interface SortConfig {
  levels: SortLevel[];
  hasHeader: boolean;
  caseSensitive: boolean;
}

/**
 * Column option for the dropdown
 */
export interface ColumnOption {
  /** Column index (0-based, relative to the range) */
  index: number;
  /** Display label (e.g., "Column A" or header value) */
  label: string;
}

/**
 * Creates a unique ID for sort levels
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Hook to integrate Sort functionality with the spreadsheet store
 */
export function useSort() {
  const {
    selectedCell,
    selectionRange,
    cells,
    setCellValue,
    getCellValue,
  } = useSpreadsheetStore();

  /**
   * Gets the current selection range, or detects the data range if no range is selected
   */
  const getSortRange = useCallback((): CellRange | null => {
    // If we have a selection range, use it
    if (selectionRange) {
      return {
        start: {
          row: Math.min(selectionRange.start.row, selectionRange.end.row),
          col: Math.min(selectionRange.start.col, selectionRange.end.col),
        },
        end: {
          row: Math.max(selectionRange.start.row, selectionRange.end.row),
          col: Math.max(selectionRange.start.col, selectionRange.end.col),
        },
      };
    }

    // If we have a selected cell, try to detect the data range
    if (selectedCell) {
      // Create a temporary sheet from the store cells to use with detectDataRange
      const tempSheet = createSheet('temp');
      cells.forEach((data, key) => {
        const [row, col] = key.split(',').map(Number);
        if (row !== undefined && col !== undefined && data.value) {
          tempSheet.cells.set(key, {
            address: { row, col },
            content: { raw: data.value, isFormula: data.value.startsWith('=') },
            value: { type: 'string', value: data.value },
          });
        }
      });

      const range = detectDataRange(tempSheet, selectedCell);
      return range;
    }

    return null;
  }, [selectedCell, selectionRange, cells]);

  /**
   * Gets column options for the dropdown based on the range and header setting
   */
  const getColumnOptions = useCallback((
    range: CellRange,
    hasHeader: boolean
  ): ColumnOption[] => {
    const options: ColumnOption[] = [];
    const numCols = range.end.col - range.start.col + 1;

    for (let i = 0; i < numCols; i++) {
      const absoluteCol = range.start.col + i;
      let label = `Column ${columnIndexToLabel(absoluteCol)}`;

      // If has header, try to get the header value
      if (hasHeader) {
        const headerValue = getCellValue(range.start.row, absoluteCol);
        if (headerValue) {
          label = headerValue;
        }
      }

      options.push({ index: i, label });
    }

    return options;
  }, [getCellValue]);

  /**
   * Creates the default sort configuration
   */
  const createDefaultConfig = useCallback((): SortConfig => {
    return {
      levels: [
        {
          id: generateId(),
          column: 0,
          ascending: true,
        },
      ],
      hasHeader: true,
      caseSensitive: false,
    };
  }, []);

  /**
   * Adds a new sort level
   */
  const addSortLevel = useCallback((
    config: SortConfig,
    columnCount: number
  ): SortConfig => {
    if (config.levels.length >= 4) {
      return config; // Max 4 levels like Excel
    }

    // Find the first unused column
    const usedColumns = new Set(config.levels.map((l) => l.column));
    let newColumn = 0;
    for (let i = 0; i < columnCount; i++) {
      if (!usedColumns.has(i)) {
        newColumn = i;
        break;
      }
    }

    return {
      ...config,
      levels: [
        ...config.levels,
        {
          id: generateId(),
          column: newColumn,
          ascending: true,
        },
      ],
    };
  }, []);

  /**
   * Removes a sort level by ID
   */
  const removeSortLevel = useCallback((
    config: SortConfig,
    levelId: string
  ): SortConfig => {
    if (config.levels.length <= 1) {
      return config; // Keep at least one level
    }

    return {
      ...config,
      levels: config.levels.filter((l) => l.id !== levelId),
    };
  }, []);

  /**
   * Updates a sort level
   */
  const updateSortLevel = useCallback((
    config: SortConfig,
    levelId: string,
    updates: Partial<Omit<SortLevel, 'id'>>
  ): SortConfig => {
    return {
      ...config,
      levels: config.levels.map((level) =>
        level.id === levelId ? { ...level, ...updates } : level
      ),
    };
  }, []);

  /**
   * Validates the sort configuration
   */
  const validateConfig = useCallback((
    config: SortConfig,
    range: CellRange
  ): { valid: boolean; error?: string } => {
    const criteria: SortCriteria[] = config.levels.map((level) => ({
      column: level.column,
      ascending: level.ascending,
    }));

    return validateSortCriteria(range, criteria);
  }, []);

  /**
   * Executes the sort operation
   */
  const executeSort = useCallback((
    config: SortConfig,
    range: CellRange
  ): { success: boolean; error?: string } => {
    // Create a temporary sheet from the store cells
    const tempSheet = createSheet('temp');
    cells.forEach((data, key) => {
      const [row, col] = key.split(',').map(Number);
      if (row !== undefined && col !== undefined) {
        const value = data.value || '';
        // Determine value type
        let cellValue: { type: 'string'; value: string } | { type: 'number'; value: number } | { type: 'empty' };
        if (value === '') {
          cellValue = { type: 'empty' };
        } else if (!isNaN(Number(value))) {
          cellValue = { type: 'number', value: Number(value) };
        } else {
          cellValue = { type: 'string', value };
        }

        tempSheet.cells.set(key, {
          address: { row, col },
          content: { raw: value, isFormula: value.startsWith('=') },
          value: cellValue,
        });
      }
    });

    // Convert config to SortCriteria
    const criteria: SortCriteria[] = config.levels.map((level) => ({
      column: level.column,
      ascending: level.ascending,
    }));

    const options: Partial<SortOptions> = {
      hasHeader: config.hasHeader,
      caseSensitive: config.caseSensitive,
    };

    // Execute sort
    const result = sortRange(tempSheet, range, criteria, options);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Apply the sorted cells back to the store
    // First, clear the range
    for (let row = range.start.row; row <= range.end.row; row++) {
      for (let col = range.start.col; col <= range.end.col; col++) {
        setCellValue(row, col, '');
      }
    }

    // Then set the sorted values
    for (const cell of result.sortedCells) {
      setCellValue(cell.address.row, cell.address.col, cell.content.raw);
    }

    return { success: true };
  }, [cells, setCellValue]);

  /**
   * Performs a quick sort (ascending or descending) on the selected column
   */
  const quickSort = useCallback((ascending: boolean): { success: boolean; error?: string } => {
    const range = getSortRange();
    if (!range) {
      return { success: false, error: 'No data range selected' };
    }

    const config: SortConfig = {
      levels: [
        {
          id: generateId(),
          column: 0,
          ascending,
        },
      ],
      hasHeader: true,
      caseSensitive: false,
    };

    return executeSort(config, range);
  }, [getSortRange, executeSort]);

  return {
    getSortRange,
    getColumnOptions,
    createDefaultConfig,
    addSortLevel,
    removeSortLevel,
    updateSortLevel,
    validateConfig,
    executeSort,
    quickSort,
  };
}
