/**
 * Cell value types
 */
export type CellValueType =
  | 'empty'
  | 'string'
  | 'number'
  | 'boolean'
  | 'error'
  | 'formula';

/**
 * Error codes for cell errors
 */
export enum CellErrorCode {
  /** Division by zero */
  DIV_ZERO = '#DIV/0!',
  /** Name not recognized */
  NAME = '#NAME?',
  /** Not available */
  NA = '#N/A',
  /** Null intersection */
  NULL = '#NULL!',
  /** Invalid numeric value */
  NUM = '#NUM!',
  /** Invalid cell reference */
  REF = '#REF!',
  /** Wrong type of argument */
  VALUE = '#VALUE!',
  /** Circular reference */
  CIRCULAR = '#CIRCULAR!',
  /** Getting data (async) */
  GETTING_DATA = '#GETTING_DATA',
  /** Spill error */
  SPILL = '#SPILL!',
  /** Calculation error */
  CALC = '#CALC!',
}

/**
 * Cell error value
 */
export interface CellError {
  code: CellErrorCode;
  message?: string;
}

/**
 * Represents the computed/display value of a cell
 */
export type CellValue =
  | { type: 'empty' }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'error'; error: CellError };

/**
 * Creates an empty cell value
 */
export function emptyValue(): CellValue {
  return { type: 'empty' };
}

/**
 * Creates a string cell value
 */
export function stringValue(value: string): CellValue {
  return { type: 'string', value };
}

/**
 * Creates a number cell value
 */
export function numberValue(value: number): CellValue {
  return { type: 'number', value };
}

/**
 * Creates a boolean cell value
 */
export function booleanValue(value: boolean): CellValue {
  return { type: 'boolean', value };
}

/**
 * Creates an error cell value
 */
export function errorValue(code: CellErrorCode, message?: string): CellValue {
  return { type: 'error', error: { code, message } };
}

/**
 * Checks if a cell value is empty
 */
export function isEmpty(value: CellValue): boolean {
  return value.type === 'empty';
}

/**
 * Checks if a cell value is an error
 */
export function isError(value: CellValue): value is { type: 'error'; error: CellError } {
  return value.type === 'error';
}

/**
 * Gets the raw value from a CellValue (for formulas/display)
 */
export function getRawValue(value: CellValue): string | number | boolean | null {
  switch (value.type) {
    case 'empty':
      return null;
    case 'string':
      return value.value;
    case 'number':
      return value.value;
    case 'boolean':
      return value.value;
    case 'error':
      return value.error.code;
  }
}

/**
 * Converts a CellValue to a display string
 */
export function valueToDisplayString(value: CellValue): string {
  switch (value.type) {
    case 'empty':
      return '';
    case 'string':
      return value.value;
    case 'number':
      return formatNumber(value.value);
    case 'boolean':
      return value.value ? 'TRUE' : 'FALSE';
    case 'error':
      return value.error.code;
  }
}

/**
 * Basic number formatting (can be enhanced later)
 */
function formatNumber(value: number): string {
  // Handle integers vs decimals
  if (Number.isInteger(value)) {
    return value.toString();
  }

  // Limit decimal places for display
  const formatted = value.toPrecision(15);
  // Remove trailing zeros after decimal
  return parseFloat(formatted).toString();
}

/**
 * Coerces a value to a number for calculations
 */
export function coerceToNumber(value: CellValue): CellValue {
  switch (value.type) {
    case 'empty':
      return numberValue(0);
    case 'number':
      return value;
    case 'boolean':
      return numberValue(value.value ? 1 : 0);
    case 'string': {
      const num = parseFloat(value.value);
      if (isNaN(num)) {
        return errorValue(CellErrorCode.VALUE, 'Cannot convert text to number');
      }
      return numberValue(num);
    }
    case 'error':
      return value;
  }
}

/**
 * Coerces a value to a string for calculations
 */
export function coerceToString(value: CellValue): string {
  switch (value.type) {
    case 'empty':
      return '';
    case 'string':
      return value.value;
    case 'number':
      return value.value.toString();
    case 'boolean':
      return value.value ? 'TRUE' : 'FALSE';
    case 'error':
      return value.error.code;
  }
}

/**
 * Coerces a value to a boolean for calculations
 */
export function coerceToBoolean(value: CellValue): CellValue {
  switch (value.type) {
    case 'empty':
      return booleanValue(false);
    case 'boolean':
      return value;
    case 'number':
      return booleanValue(value.value !== 0);
    case 'string': {
      const upper = value.value.toUpperCase();
      if (upper === 'TRUE') return booleanValue(true);
      if (upper === 'FALSE') return booleanValue(false);
      return errorValue(CellErrorCode.VALUE, 'Cannot convert text to boolean');
    }
    case 'error':
      return value;
  }
}

/**
 * Parses user input into a CellValue
 */
export function parseInput(input: string): CellValue {
  const trimmed = input.trim();

  if (trimmed === '') {
    return emptyValue();
  }

  // Check for boolean
  const upper = trimmed.toUpperCase();
  if (upper === 'TRUE') {
    return booleanValue(true);
  }
  if (upper === 'FALSE') {
    return booleanValue(false);
  }

  // Check for number
  const num = parseFloat(trimmed);
  if (!isNaN(num) && trimmed === num.toString()) {
    return numberValue(num);
  }

  // Check for percentage
  if (trimmed.endsWith('%')) {
    const percentNum = parseFloat(trimmed.slice(0, -1));
    if (!isNaN(percentNum)) {
      return numberValue(percentNum / 100);
    }
  }

  // Default to string
  return stringValue(trimmed);
}

/**
 * Compares two cell values for equality
 */
export function valuesEqual(a: CellValue, b: CellValue): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case 'empty':
      return true;
    case 'string':
      return a.value === (b as { type: 'string'; value: string }).value;
    case 'number':
      return a.value === (b as { type: 'number'; value: number }).value;
    case 'boolean':
      return a.value === (b as { type: 'boolean'; value: boolean }).value;
    case 'error':
      return a.error.code === (b as { type: 'error'; error: CellError }).error.code;
  }
}

/**
 * Compares two cell values for sorting
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareValues(a: CellValue, b: CellValue): number {
  // Empty values sort last
  if (a.type === 'empty' && b.type === 'empty') return 0;
  if (a.type === 'empty') return 1;
  if (b.type === 'empty') return -1;

  // Errors sort after values
  if (a.type === 'error' && b.type === 'error') {
    return a.error.code.localeCompare(b.error.code);
  }
  if (a.type === 'error') return 1;
  if (b.type === 'error') return -1;

  // Numbers before text
  if (a.type === 'number' && b.type !== 'number') return -1;
  if (b.type === 'number' && a.type !== 'number') return 1;

  // Booleans before text, after numbers
  if (a.type === 'boolean' && b.type === 'string') return -1;
  if (b.type === 'boolean' && a.type === 'string') return 1;

  // Same type comparisons
  if (a.type === 'number' && b.type === 'number') {
    return a.value - b.value;
  }
  if (a.type === 'boolean' && b.type === 'boolean') {
    return (a.value ? 1 : 0) - (b.value ? 1 : 0);
  }
  if (a.type === 'string' && b.type === 'string') {
    return a.value.localeCompare(b.value);
  }

  return 0;
}
