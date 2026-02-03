import {
  CellAddress,
  parseA1Reference,
  formatA1Reference,
  columnIndexToLabel,
  columnLabelToIndex,
} from './CellAddress';

/**
 * Represents a rectangular range of cells
 */
export interface CellRange {
  /** Starting cell (top-left) */
  start: CellAddress;
  /** Ending cell (bottom-right) */
  end: CellAddress;
}

/**
 * Regular expression for parsing A1-style range references
 * Matches: A1:B2, $A$1:$B$2, Sheet1!A1:B2
 */
const RANGE_REGEX =
  /^(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!)?\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/i;

/**
 * Parses an A1-style range reference string into a CellRange
 * @param reference - The range reference string (e.g., "A1:B2", "Sheet1!A1:C10")
 * @returns The parsed CellRange or null if invalid
 */
export function parseRangeReference(reference: string): CellRange | null {
  // Try parsing as a range (A1:B2)
  const rangeMatch = reference.match(RANGE_REGEX);
  if (rangeMatch) {
    const sheetName = rangeMatch[1] ?? rangeMatch[2];
    const startCol = columnLabelToIndex(rangeMatch[3]!);
    const startRow = parseInt(rangeMatch[4]!, 10) - 1;
    const endCol = columnLabelToIndex(rangeMatch[5]!);
    const endRow = parseInt(rangeMatch[6]!, 10) - 1;

    if (startRow < 0 || startCol < 0 || endRow < 0 || endCol < 0) {
      return null;
    }

    return {
      start: {
        row: Math.min(startRow, endRow),
        col: Math.min(startCol, endCol),
        sheetName,
      },
      end: {
        row: Math.max(startRow, endRow),
        col: Math.max(startCol, endCol),
        sheetName,
      },
    };
  }

  // Try parsing as a single cell (A1)
  const singleCell = parseA1Reference(reference);
  if (singleCell) {
    return {
      start: singleCell,
      end: singleCell,
    };
  }

  return null;
}

/**
 * Formats a CellRange as an A1-style reference string
 */
export function formatRangeReference(range: CellRange): string {
  const startRef = formatA1Reference(range.start);
  const endRef = formatA1Reference({
    ...range.end,
    sheetName: undefined, // Don't repeat sheet name
  });

  if (range.start.row === range.end.row && range.start.col === range.end.col) {
    return startRef;
  }

  return `${startRef}:${endRef}`;
}

/**
 * Creates a cell range from two cell addresses
 */
export function createCellRange(start: CellAddress, end: CellAddress): CellRange {
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col),
      sheetName: start.sheetName,
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col),
      sheetName: start.sheetName,
    },
  };
}

/**
 * Checks if a cell address is within a range
 */
export function isAddressInRange(address: CellAddress, range: CellRange): boolean {
  return (
    address.row >= range.start.row &&
    address.row <= range.end.row &&
    address.col >= range.start.col &&
    address.col <= range.end.col &&
    address.sheetName === range.start.sheetName
  );
}

/**
 * Checks if two ranges overlap
 */
export function rangesOverlap(a: CellRange, b: CellRange): boolean {
  if (a.start.sheetName !== b.start.sheetName) {
    return false;
  }

  return !(
    a.end.col < b.start.col ||
    a.start.col > b.end.col ||
    a.end.row < b.start.row ||
    a.start.row > b.end.row
  );
}

/**
 * Returns the intersection of two ranges, or null if they don't overlap
 */
export function rangeIntersection(a: CellRange, b: CellRange): CellRange | null {
  if (!rangesOverlap(a, b)) {
    return null;
  }

  return {
    start: {
      row: Math.max(a.start.row, b.start.row),
      col: Math.max(a.start.col, b.start.col),
      sheetName: a.start.sheetName,
    },
    end: {
      row: Math.min(a.end.row, b.end.row),
      col: Math.min(a.end.col, b.end.col),
      sheetName: a.start.sheetName,
    },
  };
}

/**
 * Returns the union of two ranges (smallest range that contains both)
 */
export function rangeUnion(a: CellRange, b: CellRange): CellRange {
  return {
    start: {
      row: Math.min(a.start.row, b.start.row),
      col: Math.min(a.start.col, b.start.col),
      sheetName: a.start.sheetName,
    },
    end: {
      row: Math.max(a.end.row, b.end.row),
      col: Math.max(a.end.col, b.end.col),
      sheetName: a.start.sheetName,
    },
  };
}

/**
 * Gets the number of rows in a range
 */
export function rangeRowCount(range: CellRange): number {
  return range.end.row - range.start.row + 1;
}

/**
 * Gets the number of columns in a range
 */
export function rangeColumnCount(range: CellRange): number {
  return range.end.col - range.start.col + 1;
}

/**
 * Gets the total number of cells in a range
 */
export function rangeCellCount(range: CellRange): number {
  return rangeRowCount(range) * rangeColumnCount(range);
}

/**
 * Iterates over all cell addresses in a range
 */
export function* iterateRange(range: CellRange): Generator<CellAddress> {
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      yield {
        row,
        col,
        sheetName: range.start.sheetName,
      };
    }
  }
}

/**
 * Checks if two ranges are equal
 */
export function rangesEqual(a: CellRange, b: CellRange): boolean {
  return (
    a.start.row === b.start.row &&
    a.start.col === b.start.col &&
    a.end.row === b.end.row &&
    a.end.col === b.end.col &&
    a.start.sheetName === b.start.sheetName
  );
}

/**
 * Shifts a range by the given row and column offsets
 */
export function shiftRange(
  range: CellRange,
  rowOffset: number,
  colOffset: number
): CellRange {
  return {
    start: {
      ...range.start,
      row: range.start.row + rowOffset,
      col: range.start.col + colOffset,
    },
    end: {
      ...range.end,
      row: range.end.row + rowOffset,
      col: range.end.col + colOffset,
    },
  };
}

/**
 * Parses a column range reference (e.g., "A:C" for columns A through C)
 */
export function parseColumnRange(reference: string): { start: number; end: number } | null {
  const match = reference.match(/^([A-Z]+):([A-Z]+)$/i);
  if (!match || !match[1] || !match[2]) return null;

  const start = columnLabelToIndex(match[1]);
  const end = columnLabelToIndex(match[2]);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

/**
 * Parses a row range reference (e.g., "1:10" for rows 1 through 10)
 */
export function parseRowRange(reference: string): { start: number; end: number } | null {
  const match = reference.match(/^(\d+):(\d+)$/);
  if (!match || !match[1] || !match[2]) return null;

  const start = parseInt(match[1], 10) - 1;
  const end = parseInt(match[2], 10) - 1;

  if (start < 0 || end < 0) return null;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}
