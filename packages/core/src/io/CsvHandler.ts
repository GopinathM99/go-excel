import type { Sheet } from '../models/Sheet';
import type { CellAddress } from '../models/CellAddress';
import { createSheet, setCell, getUsedRange, getCell } from '../models/Sheet';
import { createCell } from '../models/Cell';
import { parseInput, valueToDisplayString, CellValue, stringValue } from '../models/CellValue';

/**
 * CSV parsing options
 */
export interface CsvParseOptions {
  /** Field delimiter (default: comma) */
  delimiter?: string;
  /** Line separator (default: auto-detect) */
  lineSeparator?: string;
  /** Quote character (default: double quote) */
  quoteChar?: string;
  /** Whether first row contains headers */
  hasHeaders?: boolean;
  /** Starting row for data (0-based) */
  startRow?: number;
  /** Starting column for data (0-based) */
  startCol?: number;
  /** Encoding (default: UTF-8) */
  encoding?: string;
  /** Whether to trim whitespace from values */
  trimValues?: boolean;
  /** Parse numbers and booleans, or keep as strings */
  parseValues?: boolean;
  /** Locale for number parsing (e.g., 'en-US', 'de-DE') */
  locale?: string;
}

/**
 * CSV export options
 */
export interface CsvExportOptions {
  /** Field delimiter (default: comma) */
  delimiter?: string;
  /** Line separator (default: CRLF) */
  lineSeparator?: string;
  /** Quote character (default: double quote) */
  quoteChar?: string;
  /** Always quote fields, even when not necessary */
  alwaysQuote?: boolean;
  /** Include headers from first row */
  includeHeaders?: boolean;
  /** Range to export (default: used range) */
  range?: { startRow: number; endRow: number; startCol: number; endCol: number };
}

/**
 * Result of CSV parsing
 */
export interface CsvParseResult {
  success: boolean;
  sheet?: Sheet;
  rowCount?: number;
  columnCount?: number;
  errors?: CsvParseError[];
}

/**
 * CSV parsing error
 */
export interface CsvParseError {
  row: number;
  column: number;
  message: string;
}

/**
 * Default CSV options
 */
const DEFAULT_PARSE_OPTIONS: Required<CsvParseOptions> = {
  delimiter: ',',
  lineSeparator: '\n',
  quoteChar: '"',
  hasHeaders: false,
  startRow: 0,
  startCol: 0,
  encoding: 'UTF-8',
  trimValues: true,
  parseValues: true,
  locale: 'en-US',
};

const DEFAULT_EXPORT_OPTIONS: Required<CsvExportOptions> = {
  delimiter: ',',
  lineSeparator: '\r\n',
  quoteChar: '"',
  alwaysQuote: false,
  includeHeaders: false,
  range: { startRow: 0, endRow: -1, startCol: 0, endCol: -1 },
};

/**
 * Parse CSV data into a sheet
 */
export function parseCsv(
  data: string,
  sheetName: string = 'Sheet1',
  options: CsvParseOptions = {}
): CsvParseResult {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };
  const errors: CsvParseError[] = [];

  // Auto-detect line separator if not specified
  let lineSeparator = opts.lineSeparator;
  if (!options.lineSeparator) {
    if (data.includes('\r\n')) {
      lineSeparator = '\r\n';
    } else if (data.includes('\r')) {
      lineSeparator = '\r';
    } else {
      lineSeparator = '\n';
    }
  }

  let sheet = createSheet(sheetName);
  const rows = parseRows(data, opts.delimiter, opts.quoteChar, lineSeparator);

  let maxCol = 0;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    maxCol = Math.max(maxCol, row.length);

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      let value = row[colIndex]!;

      if (opts.trimValues) {
        value = value.trim();
      }

      if (value === '') continue;

      const address: CellAddress = {
        row: rowIndex + opts.startRow,
        col: colIndex + opts.startCol,
      };

      // Parse value or keep as string
      let cellValue: CellValue;
      if (opts.parseValues) {
        cellValue = parseInput(value);
      } else {
        cellValue = stringValue(value);
      }

      const cell = createCell(address, value, cellValue);
      sheet = setCell(sheet, cell);
    }
  }

  return {
    success: errors.length === 0,
    sheet,
    rowCount: rows.length,
    columnCount: maxCol,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Parse CSV rows handling quotes properly
 */
function parseRows(
  data: string,
  delimiter: string,
  quoteChar: string,
  lineSeparator: string
): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < data.length) {
    const char = data[i]!;
    const nextChar = data[i + 1];

    if (inQuotes) {
      if (char === quoteChar) {
        // Check for escaped quote (double quote)
        if (nextChar === quoteChar) {
          currentField += quoteChar;
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === quoteChar) {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (
        data.slice(i, i + lineSeparator.length) === lineSeparator
      ) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += lineSeparator.length;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field/row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Export a sheet to CSV format
 */
export function exportCsv(sheet: Sheet, options: CsvExportOptions = {}): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };

  // Determine range to export
  let range = opts.range;
  if (range.endRow === -1 || range.endCol === -1) {
    const usedRange = getUsedRange(sheet);
    if (!usedRange) {
      return ''; // Empty sheet
    }
    range = {
      startRow: range.startRow,
      endRow: range.endRow === -1 ? usedRange.end.row : range.endRow,
      startCol: range.startCol,
      endCol: range.endCol === -1 ? usedRange.end.col : range.endCol,
    };
  }

  const rows: string[] = [];

  for (let row = range.startRow; row <= range.endRow; row++) {
    const fields: string[] = [];

    for (let col = range.startCol; col <= range.endCol; col++) {
      const cell = getCell(sheet, { row, col });
      const value = valueToDisplayString(cell.value);
      fields.push(escapeField(value, opts.delimiter, opts.quoteChar, opts.alwaysQuote));
    }

    rows.push(fields.join(opts.delimiter));
  }

  return rows.join(opts.lineSeparator);
}

/**
 * Escape a field for CSV output
 */
function escapeField(
  value: string,
  delimiter: string,
  quoteChar: string,
  alwaysQuote: boolean
): string {
  const needsQuoting =
    alwaysQuote ||
    value.includes(delimiter) ||
    value.includes(quoteChar) ||
    value.includes('\n') ||
    value.includes('\r');

  if (!needsQuoting) {
    return value;
  }

  // Escape quote characters by doubling them
  const escaped = value.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);
  return quoteChar + escaped + quoteChar;
}

/**
 * Detect the delimiter used in a CSV string
 */
export function detectDelimiter(data: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts: Record<string, number> = {};

  // Count occurrences of each delimiter in the first few lines
  const lines = data.split('\n').slice(0, 10);
  const sampleText = lines.join('\n');

  for (const delimiter of delimiters) {
    counts[delimiter] = (sampleText.match(new RegExp(`\\${delimiter}`, 'g')) ?? []).length;
  }

  // Return the delimiter with the most occurrences
  let maxCount = 0;
  let bestDelimiter = ',';

  for (const [delimiter, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Validate CSV data
 */
export function validateCsv(data: string, options: CsvParseOptions = {}): CsvParseError[] {
  const errors: CsvParseError[] = [];
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };

  const rows = parseRows(data, opts.delimiter, opts.quoteChar, opts.lineSeparator);

  // Check for inconsistent column counts
  if (rows.length > 0) {
    const firstRowCols = rows[0]!.length;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]!.length !== firstRowCols) {
        errors.push({
          row: i,
          column: 0,
          message: `Row ${i + 1} has ${rows[i]!.length} columns, expected ${firstRowCols}`,
        });
      }
    }
  }

  return errors;
}
