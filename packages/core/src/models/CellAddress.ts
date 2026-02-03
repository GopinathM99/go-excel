/**
 * Represents a cell address with row and column indices
 */
export interface CellAddress {
  row: number;
  col: number;
  /** Whether the row reference is absolute ($A$1) */
  rowAbsolute?: boolean;
  /** Whether the column reference is absolute ($A$1) */
  colAbsolute?: boolean;
  /** Sheet name for cross-sheet references */
  sheetName?: string;
}

/**
 * Converts a column index (0-based) to a column label (A, B, ..., Z, AA, AB, ...)
 */
export function columnIndexToLabel(index: number): string {
  let label = '';
  let n = index;

  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }

  return label;
}

/**
 * Converts a column label (A, B, ..., Z, AA, AB, ...) to a column index (0-based)
 */
export function columnLabelToIndex(label: string): number {
  let index = 0;
  const upper = label.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }

  return index - 1;
}

/**
 * Regular expression for parsing A1-style cell references
 * Matches: A1, $A1, A$1, $A$1, Sheet1!A1, 'Sheet Name'!A1
 */
const A1_REGEX = /^(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!)?\$?([A-Z]+)\$?(\d+)$/i;

/**
 * Parses an A1-style cell reference string into a CellAddress
 * @param reference - The cell reference string (e.g., "A1", "$A$1", "Sheet1!A1")
 * @returns The parsed CellAddress or null if invalid
 */
export function parseA1Reference(reference: string): CellAddress | null {
  const match = reference.match(A1_REGEX);
  if (!match) return null;

  const sheetName = match[1] ?? match[2];
  const colPart = reference.includes('$' + (match[3] ?? '').toUpperCase())
    ? match[3]
    : match[3];
  const rowPart = match[4];

  if (!colPart || !rowPart) return null;

  const colAbsolute = reference.includes('$' + colPart.toUpperCase());
  const rowAbsolute = reference.includes('$' + rowPart);

  const col = columnLabelToIndex(colPart);
  const row = parseInt(rowPart, 10) - 1; // Convert to 0-based

  if (row < 0 || col < 0) return null;

  return {
    row,
    col,
    rowAbsolute,
    colAbsolute,
    sheetName,
  };
}

/**
 * Formats a CellAddress as an A1-style reference string
 */
export function formatA1Reference(address: CellAddress): string {
  let result = '';

  if (address.sheetName) {
    // Quote sheet name if it contains spaces or special characters
    if (/[\s!']/.test(address.sheetName)) {
      result = `'${address.sheetName.replace(/'/g, "''")}'!`;
    } else {
      result = `${address.sheetName}!`;
    }
  }

  if (address.colAbsolute) result += '$';
  result += columnIndexToLabel(address.col);

  if (address.rowAbsolute) result += '$';
  result += (address.row + 1).toString(); // Convert to 1-based

  return result;
}

/**
 * Regular expression for parsing R1C1-style cell references
 * Matches: R1C1, R[1]C[1], R[-1]C[-1], R1C[1], Sheet1!R1C1
 */
const R1C1_REGEX =
  /^(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!)?R(\[?-?\d+\]?)C(\[?-?\d+\]?)$/i;

/**
 * Parses an R1C1-style cell reference string
 * @param reference - The cell reference string (e.g., "R1C1", "R[-1]C[2]")
 * @param baseAddress - The base address for relative references
 * @returns The parsed CellAddress or null if invalid
 */
export function parseR1C1Reference(
  reference: string,
  baseAddress?: CellAddress
): CellAddress | null {
  const match = reference.match(R1C1_REGEX);
  if (!match) return null;

  const sheetName = match[1] ?? match[2];
  const rowPart = match[3];
  const colPart = match[4];

  if (!rowPart || !colPart) return null;

  let row: number;
  let col: number;
  let rowAbsolute = true;
  let colAbsolute = true;

  // Parse row
  if (rowPart.startsWith('[')) {
    // Relative reference
    rowAbsolute = false;
    const offset = parseInt(rowPart.slice(1, -1), 10);
    row = (baseAddress?.row ?? 0) + offset;
  } else {
    row = parseInt(rowPart, 10) - 1; // Convert to 0-based
  }

  // Parse column
  if (colPart.startsWith('[')) {
    // Relative reference
    colAbsolute = false;
    const offset = parseInt(colPart.slice(1, -1), 10);
    col = (baseAddress?.col ?? 0) + offset;
  } else {
    col = parseInt(colPart, 10) - 1; // Convert to 0-based
  }

  if (row < 0 || col < 0) return null;

  return {
    row,
    col,
    rowAbsolute,
    colAbsolute,
    sheetName,
  };
}

/**
 * Formats a CellAddress as an R1C1-style reference string
 */
export function formatR1C1Reference(
  address: CellAddress,
  baseAddress?: CellAddress
): string {
  let result = '';

  if (address.sheetName) {
    if (/[\s!']/.test(address.sheetName)) {
      result = `'${address.sheetName.replace(/'/g, "''")}'!`;
    } else {
      result = `${address.sheetName}!`;
    }
  }

  if (address.rowAbsolute ?? true) {
    result += `R${address.row + 1}`;
  } else {
    const offset = address.row - (baseAddress?.row ?? 0);
    result += `R[${offset}]`;
  }

  if (address.colAbsolute ?? true) {
    result += `C${address.col + 1}`;
  } else {
    const offset = address.col - (baseAddress?.col ?? 0);
    result += `C[${offset}]`;
  }

  return result;
}

/**
 * Creates a cell address from row and column indices
 */
export function createCellAddress(
  row: number,
  col: number,
  options?: {
    rowAbsolute?: boolean;
    colAbsolute?: boolean;
    sheetName?: string;
  }
): CellAddress {
  return {
    row,
    col,
    rowAbsolute: options?.rowAbsolute,
    colAbsolute: options?.colAbsolute,
    sheetName: options?.sheetName,
  };
}

/**
 * Checks if two cell addresses are equal
 */
export function cellAddressesEqual(a: CellAddress, b: CellAddress): boolean {
  return (
    a.row === b.row &&
    a.col === b.col &&
    a.sheetName === b.sheetName
  );
}

/**
 * Creates a unique key for a cell address (for use in Maps/Sets)
 */
export function cellAddressKey(address: CellAddress): string {
  const sheet = address.sheetName ? `${address.sheetName}!` : '';
  return `${sheet}${address.row},${address.col}`;
}
