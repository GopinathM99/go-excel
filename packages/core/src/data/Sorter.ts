import type { Sheet } from '../models/Sheet';
import type { CellRange } from '../models/CellRange';
import type { CellAddress } from '../models/CellAddress';
import type { Cell } from '../models/Cell';
import type { CellValue } from '../models/CellValue';
import { getCell } from '../models/Sheet';
import { cellAddressKey } from '../models/CellAddress';
import { MAX_ROWS, MAX_COLUMNS } from '@excel/shared';

/**
 * Criteria for sorting by a single column
 */
export interface SortCriteria {
  /** Column index (0-based, relative to the range) */
  column: number;
  /** Sort direction: true for ascending, false for descending */
  ascending: boolean;
}

/**
 * Options for sorting operations
 */
export interface SortOptions {
  /** If true, exclude the first row from sorting (treat as header) */
  hasHeader: boolean;
  /** If true, perform case-sensitive text comparison */
  caseSensitive: boolean;
}

/**
 * Mapping of original row to new row position
 */
export interface RowMapping {
  /** Original row index (absolute, in sheet coordinates) */
  originalRow: number;
  /** New row index after sorting (absolute, in sheet coordinates) */
  newRow: number;
}

/**
 * Result of a sort operation
 */
export interface SortResult {
  /** The cells with updated addresses after sorting */
  sortedCells: Cell[];
  /** Mapping from original rows to new rows (for undo support) */
  rowMappings: RowMapping[];
  /** The range that was sorted */
  sortedRange: CellRange;
  /** Whether the sort operation was successful */
  success: boolean;
  /** Error message if the sort failed */
  error?: string;
}

/**
 * Default sort options
 */
const DEFAULT_SORT_OPTIONS: SortOptions = {
  hasHeader: false,
  caseSensitive: false,
};

/**
 * Value type priority for sorting (lower number = higher priority)
 * Order: numbers < text < booleans < errors < blanks
 */
enum ValueTypePriority {
  NUMBER = 0,
  TEXT = 1,
  BOOLEAN = 2,
  ERROR = 3,
  EMPTY = 4,
}

/**
 * Gets the type priority for a cell value
 */
function getValueTypePriority(value: CellValue): ValueTypePriority {
  switch (value.type) {
    case 'number':
      return ValueTypePriority.NUMBER;
    case 'string':
      return ValueTypePriority.TEXT;
    case 'boolean':
      return ValueTypePriority.BOOLEAN;
    case 'error':
      return ValueTypePriority.ERROR;
    case 'empty':
      return ValueTypePriority.EMPTY;
  }
}

/**
 * Natural sort comparison for strings
 * Handles strings with numbers correctly (e.g., "A2" before "A10")
 */
function naturalCompare(a: string, b: string, caseSensitive: boolean): number {
  const aStr = caseSensitive ? a : a.toLowerCase();
  const bStr = caseSensitive ? b : b.toLowerCase();

  // Split strings into segments of text and numbers
  const aSegments = aStr.match(/(\d+|\D+)/g) ?? [];
  const bSegments = bStr.match(/(\d+|\D+)/g) ?? [];

  const maxLen = Math.max(aSegments.length, bSegments.length);

  for (let i = 0; i < maxLen; i++) {
    const aSeg = aSegments[i] ?? '';
    const bSeg = bSegments[i] ?? '';

    // If one segment is empty, the other is "greater"
    if (aSeg === '' && bSeg !== '') return -1;
    if (aSeg !== '' && bSeg === '') return 1;

    // Check if both segments are numeric
    const aNum = parseFloat(aSeg);
    const bNum = parseFloat(bSeg);
    const aIsNum = !isNaN(aNum) && /^\d+$/.test(aSeg);
    const bIsNum = !isNaN(bNum) && /^\d+$/.test(bSeg);

    if (aIsNum && bIsNum) {
      // Both are numbers - compare numerically
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else if (aIsNum !== bIsNum) {
      // Mixed: numbers come before text
      return aIsNum ? -1 : 1;
    } else {
      // Both are text - compare as strings
      const cmp = aSeg.localeCompare(bSeg);
      if (cmp !== 0) {
        return cmp;
      }
    }
  }

  return 0;
}

/**
 * Compares two cell values according to Excel sort rules
 *
 * Sort order:
 * 1. Numbers (sorted numerically)
 * 2. Text (sorted alphabetically with natural sort)
 * 3. Logical (FALSE before TRUE)
 * 4. Errors (maintain original order among errors)
 * 5. Blanks (always at end)
 *
 * @param a First value
 * @param b Second value
 * @param ascending Sort direction
 * @param caseSensitive Case sensitivity for text comparison
 * @param aOriginalIndex Original index of a (for stable sort)
 * @param bOriginalIndex Original index of b (for stable sort)
 * @returns Comparison result: negative if a < b, positive if a > b, 0 if equal
 */
function compareCellValues(
  a: CellValue,
  b: CellValue,
  ascending: boolean,
  caseSensitive: boolean,
  aOriginalIndex: number,
  bOriginalIndex: number
): number {
  const aPriority = getValueTypePriority(a);
  const bPriority = getValueTypePriority(b);

  // Blanks always go to the end, regardless of sort direction
  if (a.type === 'empty' && b.type === 'empty') {
    return aOriginalIndex - bOriginalIndex; // Stable sort
  }
  if (a.type === 'empty') return 1; // a goes after b
  if (b.type === 'empty') return -1; // a goes before b

  // Errors go after non-error values, regardless of sort direction
  // But before blanks
  if (a.type === 'error' && b.type === 'error') {
    return aOriginalIndex - bOriginalIndex; // Maintain original order among errors
  }
  if (a.type === 'error') return 1;
  if (b.type === 'error') return -1;

  // Different types - use priority
  if (aPriority !== bPriority) {
    const result = aPriority - bPriority;
    return ascending ? result : -result;
  }

  // Same type - compare values
  let result = 0;

  switch (a.type) {
    case 'number':
      result = a.value - (b as { type: 'number'; value: number }).value;
      break;

    case 'string':
      result = naturalCompare(
        a.value,
        (b as { type: 'string'; value: string }).value,
        caseSensitive
      );
      break;

    case 'boolean':
      // FALSE (0) before TRUE (1)
      result = (a.value ? 1 : 0) - ((b as { type: 'boolean'; value: boolean }).value ? 1 : 0);
      break;
  }

  // Apply sort direction
  if (!ascending) {
    result = -result;
  }

  // Stable sort: if values are equal, maintain original order
  if (result === 0) {
    return aOriginalIndex - bOriginalIndex;
  }

  return result;
}

/**
 * Represents a row of data with its original index for sorting
 */
interface SortableRow {
  /** Original row index (absolute, in sheet coordinates) */
  originalRowIndex: number;
  /** Cell values for each column in the range */
  values: CellValue[];
  /** All cells in this row */
  cells: Cell[];
}

/**
 * Extracts rows from the sheet for sorting
 */
function extractRows(
  sheet: Sheet,
  range: CellRange,
  skipHeader: boolean
): SortableRow[] {
  const rows: SortableRow[] = [];
  const startRow = skipHeader ? range.start.row + 1 : range.start.row;

  for (let row = startRow; row <= range.end.row; row++) {
    const values: CellValue[] = [];
    const cells: Cell[] = [];

    for (let col = range.start.col; col <= range.end.col; col++) {
      const cell = getCell(sheet, { row, col });
      values.push(cell.value);
      cells.push(cell);
    }

    rows.push({
      originalRowIndex: row,
      values,
      cells,
    });
  }

  return rows;
}

/**
 * Creates a comparison function for multi-column sorting
 */
function createMultiColumnComparator(
  criteria: SortCriteria[],
  caseSensitive: boolean
): (a: SortableRow, b: SortableRow) => number {
  return (a: SortableRow, b: SortableRow): number => {
    // Try each criterion in order
    for (const criterion of criteria) {
      const aValue = a.values[criterion.column];
      const bValue = b.values[criterion.column];

      // Skip if values are not defined (should not happen with proper validation)
      if (aValue === undefined || bValue === undefined) continue;

      const result = compareCellValues(
        aValue,
        bValue,
        criterion.ascending,
        caseSensitive,
        a.originalRowIndex,
        b.originalRowIndex
      );

      if (result !== 0) {
        return result;
      }
    }

    // All criteria equal - maintain original order (stable sort)
    return a.originalRowIndex - b.originalRowIndex;
  };
}

/**
 * Sorts a range of cells in a sheet by multiple columns
 *
 * This function does NOT mutate the original sheet. Instead, it returns:
 * - sortedCells: Cells with updated addresses reflecting the new positions
 * - rowMappings: Mapping from original rows to new rows (for undo support)
 *
 * @param sheet The sheet containing the data
 * @param range The range of cells to sort
 * @param criteria Array of sort criteria (first is primary, etc.)
 * @param options Sort options
 * @returns Sort result with new cell positions
 *
 * @example
 * ```typescript
 * const criteria = [
 *   { column: 0, ascending: true },   // Primary: Column A ascending
 *   { column: 2, ascending: false },  // Secondary: Column C descending
 * ];
 * const result = sortRange(sheet, range, criteria, { hasHeader: true });
 * ```
 */
export function sortRange(
  sheet: Sheet,
  range: CellRange,
  criteria: SortCriteria[],
  options?: Partial<SortOptions>
): SortResult {
  const opts: SortOptions = { ...DEFAULT_SORT_OPTIONS, ...options };

  // Validate inputs
  if (criteria.length === 0) {
    return {
      sortedCells: [],
      rowMappings: [],
      sortedRange: range,
      success: false,
      error: 'At least one sort criterion is required',
    };
  }

  // Validate column indices
  const rangeColCount = range.end.col - range.start.col + 1;
  for (const criterion of criteria) {
    if (criterion.column < 0 || criterion.column >= rangeColCount) {
      return {
        sortedCells: [],
        rowMappings: [],
        sortedRange: range,
        success: false,
        error: `Invalid column index ${criterion.column}. Must be between 0 and ${rangeColCount - 1}`,
      };
    }
  }

  // Check if range has enough rows to sort
  const totalRows = range.end.row - range.start.row + 1;
  const dataRows = opts.hasHeader ? totalRows - 1 : totalRows;

  if (dataRows <= 1) {
    // Nothing to sort or only one row
    const cells = extractCellsFromRange(sheet, range);
    return {
      sortedCells: cells,
      rowMappings: [],
      sortedRange: range,
      success: true,
    };
  }

  // Extract rows for sorting
  const rows = extractRows(sheet, range, opts.hasHeader);

  // Sort rows
  const comparator = createMultiColumnComparator(criteria, opts.caseSensitive);
  const sortedRows = [...rows].sort(comparator);

  // Build result
  const sortedCells: Cell[] = [];
  const rowMappings: RowMapping[] = [];

  // Include header row if present (unchanged)
  if (opts.hasHeader) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      const cell = getCell(sheet, { row: range.start.row, col });
      sortedCells.push(cell);
    }
  }

  // Process sorted rows
  const startDataRow = opts.hasHeader ? range.start.row + 1 : range.start.row;

  sortedRows.forEach((row, newIndex) => {
    const newRowIndex = startDataRow + newIndex;

    // Record row mapping
    rowMappings.push({
      originalRow: row.originalRowIndex,
      newRow: newRowIndex,
    });

    // Update cell addresses
    row.cells.forEach((cell, colIndex) => {
      const newAddress: CellAddress = {
        ...cell.address,
        row: newRowIndex,
        col: range.start.col + colIndex,
      };

      sortedCells.push({
        ...cell,
        address: newAddress,
      });
    });
  });

  return {
    sortedCells,
    rowMappings,
    sortedRange: range,
    success: true,
  };
}

/**
 * Extracts all cells from a range
 */
function extractCellsFromRange(sheet: Sheet, range: CellRange): Cell[] {
  const cells: Cell[] = [];
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      const cell = getCell(sheet, { row, col });
      cells.push(cell);
    }
  }
  return cells;
}

/**
 * Auto-detects the data range starting from a given cell
 *
 * Detection rules:
 * 1. Expand right while cells have content
 * 2. Expand down while any cell in the current row has content
 * 3. Stop at empty row or column boundaries
 *
 * @param sheet The sheet to analyze
 * @param startCell The starting cell address
 * @returns The detected data range
 *
 * @example
 * ```typescript
 * // If A1:C5 contains data, starting from A1:
 * const range = detectDataRange(sheet, { row: 0, col: 0 });
 * // Returns { start: { row: 0, col: 0 }, end: { row: 4, col: 2 } }
 * ```
 */
export function detectDataRange(sheet: Sheet, startCell: CellAddress): CellRange {
  const { row: startRow, col: startCol, sheetName } = startCell;

  // First, find the rightmost column with data in the starting row
  let endCol = startCol;
  let col = startCol;

  while (col < MAX_COLUMNS) {
    const cell = getCell(sheet, { row: startRow, col });
    if (cell.content.raw === '') {
      // Check if there's data after a gap (for sparse data)
      // Look ahead a few columns
      let hasMoreData = false;
      for (let lookahead = 1; lookahead <= 3 && col + lookahead < MAX_COLUMNS; lookahead++) {
        const nextCell = getCell(sheet, { row: startRow, col: col + lookahead });
        if (nextCell.content.raw !== '') {
          hasMoreData = true;
          break;
        }
      }
      if (!hasMoreData) {
        break;
      }
    } else {
      endCol = col;
    }
    col++;
  }

  // If no data found, return single cell range
  if (endCol < startCol) {
    const cell = getCell(sheet, startCell);
    if (cell.content.raw === '') {
      return {
        start: { row: startRow, col: startCol, sheetName },
        end: { row: startRow, col: startCol, sheetName },
      };
    }
    endCol = startCol;
  }

  // Now find the last row with data in any of the detected columns
  let endRow = startRow;
  let row = startRow;
  let consecutiveEmptyRows = 0;
  const maxConsecutiveEmpty = 1; // Stop after 1 completely empty row

  while (row < MAX_ROWS && consecutiveEmptyRows <= maxConsecutiveEmpty) {
    let rowHasData = false;

    for (let c = startCol; c <= endCol; c++) {
      const cell = getCell(sheet, { row, col: c });
      if (cell.content.raw !== '') {
        rowHasData = true;
        endRow = row;
        break;
      }
    }

    if (!rowHasData) {
      consecutiveEmptyRows++;
    } else {
      consecutiveEmptyRows = 0;
    }

    row++;
  }

  return {
    start: { row: startRow, col: startCol, sheetName },
    end: { row: endRow, col: endCol, sheetName },
  };
}

/**
 * Creates a reverse mapping for undo operations
 *
 * @param rowMappings Original row mappings from sort result
 * @returns Inverted mappings to restore original order
 */
export function createUndoMappings(rowMappings: RowMapping[]): RowMapping[] {
  return rowMappings.map((mapping) => ({
    originalRow: mapping.newRow,
    newRow: mapping.originalRow,
  }));
}

/**
 * Applies row mappings to move cells to new positions
 * This is useful for applying sort results or undo operations
 *
 * @param sheet The sheet to modify
 * @param sortedCells Cells with updated addresses
 * @param range The range being modified
 * @returns A new sheet with cells moved to new positions
 */
export function applySortResult(
  sheet: Sheet,
  sortedCells: Cell[],
  range: CellRange
): Sheet {
  const newCells = new Map(sheet.cells);

  // Clear the range
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      newCells.delete(cellAddressKey({ row, col }));
    }
  }

  // Add sorted cells
  for (const cell of sortedCells) {
    // Only add non-empty cells
    if (cell.content.raw !== '') {
      newCells.set(cellAddressKey(cell.address), cell);
    }
  }

  return {
    ...sheet,
    cells: newCells,
  };
}

/**
 * Validates that sort criteria are valid for a given range
 *
 * @param range The range to sort
 * @param criteria The sort criteria to validate
 * @returns Validation result with error message if invalid
 */
export function validateSortCriteria(
  range: CellRange,
  criteria: SortCriteria[]
): { valid: boolean; error?: string } {
  if (criteria.length === 0) {
    return { valid: false, error: 'At least one sort criterion is required' };
  }

  const rangeColCount = range.end.col - range.start.col + 1;

  for (let i = 0; i < criteria.length; i++) {
    const criterion = criteria[i];
    if (criterion === undefined) continue;

    if (criterion.column < 0) {
      return {
        valid: false,
        error: `Sort criterion ${i + 1}: Column index cannot be negative`,
      };
    }
    if (criterion.column >= rangeColCount) {
      return {
        valid: false,
        error: `Sort criterion ${i + 1}: Column index ${criterion.column} exceeds range (max: ${rangeColCount - 1})`,
      };
    }
  }

  // Check for duplicate columns
  const seenColumns = new Set<number>();
  for (let i = 0; i < criteria.length; i++) {
    const criterion = criteria[i];
    if (criterion === undefined) continue;

    if (seenColumns.has(criterion.column)) {
      return {
        valid: false,
        error: `Sort criterion ${i + 1}: Column ${criterion.column} is specified more than once`,
      };
    }
    seenColumns.add(criterion.column);
  }

  return { valid: true };
}
