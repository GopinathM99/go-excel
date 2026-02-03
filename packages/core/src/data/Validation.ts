/**
 * Data Validation Module
 *
 * Provides comprehensive data validation for spreadsheet cells including:
 * - Numeric validations (whole numbers, decimals, ranges)
 * - List/dropdown validations
 * - Date and time validations
 * - Text length constraints
 * - Custom formula-based validations
 */

import type { CellAddress } from '../models/CellAddress';
import type { CellRange } from '../models/CellRange';
import type { CellValue } from '../models/CellValue';
import type { Sheet } from '../models/Sheet';
import { cellAddressKey, parseA1Reference } from '../models/CellAddress';
import { parseRangeReference, iterateRange } from '../models/CellRange';
import { getCell, setCell } from '../models/Sheet';
import { isEmpty, coerceToNumber, coerceToString, isError } from '../models/CellValue';

/**
 * Types of data validation
 */
export type ValidationType =
  | 'any'         // No validation
  | 'whole'       // Whole number
  | 'decimal'     // Decimal number
  | 'list'        // Dropdown list
  | 'date'        // Date value
  | 'time'        // Time value
  | 'textLength'  // Text length constraint
  | 'custom';     // Custom formula

/**
 * Validation comparison operators
 */
export type ValidationOperator =
  | 'between'
  | 'notBetween'
  | 'equal'
  | 'notEqual'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual';

/**
 * Error display styles
 */
export type ValidationErrorStyle = 'stop' | 'warning' | 'information';

/**
 * Data validation rule configuration
 */
export interface DataValidation {
  /** Type of validation to apply */
  type: ValidationType;

  /** Comparison operator (not needed for 'any', 'list', 'custom') */
  operator?: ValidationOperator;

  /** First formula/value (can be value, cell reference, or formula) */
  formula1?: string;

  /** Second formula/value (for 'between' and 'notBetween' operators) */
  formula2?: string;

  /** Dropdown values (for 'list' type) */
  values?: string[];

  /** Input message settings (shown when cell is selected) */
  showInputMessage?: boolean;
  inputTitle?: string;
  inputMessage?: string;

  /** Error handling settings */
  showError?: boolean;
  errorStyle?: ValidationErrorStyle;
  errorTitle?: string;
  errorMessage?: string;

  /** Whether to allow blank/empty values */
  allowBlank?: boolean;

  /** Show dropdown arrow in cell (for list type) */
  showDropdown?: boolean;

  /** Show dropdown inside cell (for list type) */
  inCellDropdown?: boolean;
}

/**
 * Result of validation check
 */
export interface ValidationResult {
  /** Whether the value is valid */
  valid: boolean;

  /** Error style if invalid */
  errorStyle?: ValidationErrorStyle;

  /** Error title if invalid */
  errorTitle?: string;

  /** Error message if invalid */
  errorMessage?: string;
}

/**
 * Context for validation (provides access to sheet data for formula evaluation)
 */
export interface ValidationContext {
  /** The sheet containing the cell being validated */
  sheet: Sheet;

  /** The address of the cell being validated */
  cellAddress: CellAddress;

  /** Function to evaluate formulas (optional, for custom formula validation) */
  evaluateFormula?: (formula: string, sheet: Sheet, cellAddress: CellAddress) => CellValue;
}

/**
 * Stored validation rules for a sheet (maps cell keys to validations)
 */
export type ValidationMap = Map<string, DataValidation>;

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION: DataValidation = {
  type: 'any',
  allowBlank: true,
  showError: true,
  errorStyle: 'stop',
  showInputMessage: false,
  showDropdown: true,
  inCellDropdown: true,
};

/**
 * Creates a new data validation rule with defaults
 */
export function createValidation(config: Partial<DataValidation>): DataValidation {
  const validation: DataValidation = {
    ...DEFAULT_VALIDATION,
    ...config,
  };

  // Ensure proper defaults based on type
  if (validation.type === 'list') {
    validation.showDropdown = config.showDropdown ?? true;
    validation.inCellDropdown = config.inCellDropdown ?? true;
  }

  // Validate the configuration
  validateValidationConfig(validation);

  return validation;
}

/**
 * Validates the validation configuration itself
 */
function validateValidationConfig(validation: DataValidation): void {
  const { type, operator, formula1, formula2, values } = validation;

  // Check for required operator for numeric/date/time/textLength types
  if (['whole', 'decimal', 'date', 'time', 'textLength'].includes(type)) {
    if (!operator) {
      throw new Error(`Validation type '${type}' requires an operator`);
    }
  }

  // Check for required formula1 for types that need it
  if (['whole', 'decimal', 'date', 'time', 'textLength', 'custom'].includes(type)) {
    if (type !== 'custom' && operator && !formula1) {
      throw new Error(`Validation type '${type}' requires formula1`);
    }
    if (type === 'custom' && !formula1) {
      throw new Error("Custom validation requires formula1");
    }
  }

  // Check for required formula2 for 'between' operators
  if (operator === 'between' || operator === 'notBetween') {
    if (!formula2) {
      throw new Error(`Operator '${operator}' requires formula2`);
    }
  }

  // Check for values in list type
  if (type === 'list') {
    if (!values && !formula1) {
      throw new Error("List validation requires either 'values' array or 'formula1' (cell range reference)");
    }
  }
}

/**
 * Validates a cell value against a data validation rule
 */
export function validateValue(
  value: CellValue,
  validation: DataValidation,
  context?: ValidationContext
): ValidationResult {
  const { type, allowBlank, showError, errorStyle, errorTitle, errorMessage } = validation;

  // Create error result helper
  // Use the validation's errorMessage if defined, otherwise fall back to custom message
  const createError = (customMessage?: string): ValidationResult => ({
    valid: false,
    errorStyle: showError ? errorStyle : undefined,
    errorTitle: showError ? errorTitle : undefined,
    errorMessage: showError ? (errorMessage ?? customMessage) : undefined,
  });

  // Handle blank/empty values
  if (isEmpty(value)) {
    if (allowBlank) {
      return { valid: true };
    }
    return createError('This cell requires a value');
  }

  // No validation for 'any' type
  if (type === 'any') {
    return { valid: true };
  }

  // Delegate to specific validators
  switch (type) {
    case 'whole':
      return validateWholeNumber(value, validation, createError);

    case 'decimal':
      return validateDecimal(value, validation, createError);

    case 'list':
      return validateList(value, validation, context, createError);

    case 'date':
      return validateDate(value, validation, createError);

    case 'time':
      return validateTime(value, validation, createError);

    case 'textLength':
      return validateTextLength(value, validation, createError);

    case 'custom':
      return validateCustomFormula(value, validation, context, createError);

    default:
      return { valid: true };
  }
}

/**
 * Validates a whole number value
 */
function validateWholeNumber(
  value: CellValue,
  validation: DataValidation,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  const numValue = coerceToNumber(value);

  if (isError(numValue)) {
    return createError('Value must be a whole number');
  }

  const num = (numValue as { type: 'number'; value: number }).value;

  // Check if it's a whole number
  if (!Number.isInteger(num)) {
    return createError('Value must be a whole number');
  }

  return validateNumericComparison(num, validation, createError);
}

/**
 * Validates a decimal number value
 */
function validateDecimal(
  value: CellValue,
  validation: DataValidation,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  const numValue = coerceToNumber(value);

  if (isError(numValue)) {
    return createError('Value must be a number');
  }

  const num = (numValue as { type: 'number'; value: number }).value;

  return validateNumericComparison(num, validation, createError);
}

/**
 * Validates a numeric value against the operator and formulas
 */
function validateNumericComparison(
  num: number,
  validation: DataValidation,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  const { operator, formula1, formula2 } = validation;

  if (!operator || !formula1) {
    return { valid: true };
  }

  const value1 = parseNumericFormula(formula1);
  const value2 = formula2 ? parseNumericFormula(formula2) : undefined;

  if (value1 === null) {
    return createError('Invalid validation formula');
  }

  const result = compareWithOperator(num, operator, value1, value2 ?? undefined);

  if (!result) {
    return createError(getOperatorErrorMessage(operator, value1, value2 ?? undefined));
  }

  return { valid: true };
}

/**
 * Parses a formula string to get a numeric value
 */
function parseNumericFormula(formula: string): number | null {
  const trimmed = formula.trim();

  // Try parsing as a number
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return num;
  }

  // Could be a cell reference - in a full implementation,
  // this would evaluate the cell reference
  // For now, we only support literal numbers
  return null;
}

/**
 * Compares a value using the specified operator
 */
function compareWithOperator(
  value: number,
  operator: ValidationOperator,
  value1: number,
  value2?: number
): boolean {
  switch (operator) {
    case 'between':
      return value2 !== undefined && value >= value1 && value <= value2;

    case 'notBetween':
      return value2 !== undefined && (value < value1 || value > value2);

    case 'equal':
      return value === value1;

    case 'notEqual':
      return value !== value1;

    case 'greaterThan':
      return value > value1;

    case 'lessThan':
      return value < value1;

    case 'greaterThanOrEqual':
      return value >= value1;

    case 'lessThanOrEqual':
      return value <= value1;

    default:
      return true;
  }
}

/**
 * Gets an error message for a failed operator comparison
 */
function getOperatorErrorMessage(
  operator: ValidationOperator,
  value1: number,
  value2?: number
): string {
  switch (operator) {
    case 'between':
      return `Value must be between ${value1} and ${value2}`;

    case 'notBetween':
      return `Value must not be between ${value1} and ${value2}`;

    case 'equal':
      return `Value must equal ${value1}`;

    case 'notEqual':
      return `Value must not equal ${value1}`;

    case 'greaterThan':
      return `Value must be greater than ${value1}`;

    case 'lessThan':
      return `Value must be less than ${value1}`;

    case 'greaterThanOrEqual':
      return `Value must be greater than or equal to ${value1}`;

    case 'lessThanOrEqual':
      return `Value must be less than or equal to ${value1}`;

    default:
      return 'Invalid value';
  }
}

/**
 * Validates a value against a list of allowed values
 */
function validateList(
  value: CellValue,
  validation: DataValidation,
  context: ValidationContext | undefined,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  const allowedValues = getDropdownValues(validation, context?.sheet);

  if (allowedValues.length === 0) {
    // No values defined, allow anything
    return { valid: true };
  }

  const stringValue = coerceToString(value).trim();

  // Case-insensitive comparison
  const isValid = allowedValues.some(
    (v) => v.toLowerCase() === stringValue.toLowerCase()
  );

  if (!isValid) {
    return createError('Please select a value from the list');
  }

  return { valid: true };
}

/**
 * Gets the dropdown values for a list validation
 */
export function getDropdownValues(
  validation: DataValidation,
  sheet?: Sheet
): string[] {
  const { values, formula1 } = validation;

  // If explicit values are provided, use them
  if (values && values.length > 0) {
    return values;
  }

  // If formula1 is a range reference, get values from the range
  if (formula1 && sheet) {
    const range = parseRangeReference(formula1);
    if (range) {
      const rangeValues: string[] = [];
      for (const addr of iterateRange(range)) {
        const cell = getCell(sheet, addr);
        if (!isEmpty(cell.value)) {
          rangeValues.push(coerceToString(cell.value));
        }
      }
      return rangeValues;
    }
  }

  // If formula1 is a comma-separated list
  if (formula1) {
    return formula1.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
  }

  return [];
}

/**
 * Validates a date value
 */
function validateDate(
  value: CellValue,
  validation: DataValidation,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  // In Excel, dates are stored as numbers (days since 1/1/1900)
  const numValue = coerceToNumber(value);

  if (isError(numValue)) {
    return createError('Value must be a valid date');
  }

  const num = (numValue as { type: 'number'; value: number }).value;

  // Basic date validation: must be a positive number
  if (num < 0) {
    return createError('Value must be a valid date');
  }

  return validateNumericComparison(num, validation, createError);
}

/**
 * Validates a time value
 */
function validateTime(
  value: CellValue,
  validation: DataValidation,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  // In Excel, times are stored as decimals (fraction of a day)
  const numValue = coerceToNumber(value);

  if (isError(numValue)) {
    return createError('Value must be a valid time');
  }

  const num = (numValue as { type: 'number'; value: number }).value;

  // Time values should be between 0 and 1 (or can be > 1 for durations)
  if (num < 0) {
    return createError('Value must be a valid time');
  }

  return validateNumericComparison(num, validation, createError);
}

/**
 * Validates text length
 */
function validateTextLength(
  value: CellValue,
  validation: DataValidation,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  const text = coerceToString(value);
  const length = text.length;

  const { operator, formula1, formula2 } = validation;

  if (!operator || !formula1) {
    return { valid: true };
  }

  const value1 = parseNumericFormula(formula1);
  const value2 = formula2 ? parseNumericFormula(formula2) : undefined;

  if (value1 === null) {
    return createError('Invalid text length validation');
  }

  const result = compareWithOperator(length, operator, value1, value2);

  if (!result) {
    return createError(getTextLengthErrorMessage(operator, value1, value2));
  }

  return { valid: true };
}

/**
 * Gets an error message for a failed text length comparison
 */
function getTextLengthErrorMessage(
  operator: ValidationOperator,
  value1: number,
  value2?: number
): string {
  switch (operator) {
    case 'between':
      return `Text length must be between ${value1} and ${value2} characters`;

    case 'notBetween':
      return `Text length must not be between ${value1} and ${value2} characters`;

    case 'equal':
      return `Text must be exactly ${value1} characters`;

    case 'notEqual':
      return `Text must not be ${value1} characters`;

    case 'greaterThan':
      return `Text must be longer than ${value1} characters`;

    case 'lessThan':
      return `Text must be shorter than ${value1} characters`;

    case 'greaterThanOrEqual':
      return `Text must be at least ${value1} characters`;

    case 'lessThanOrEqual':
      return `Text must be at most ${value1} characters`;

    default:
      return 'Invalid text length';
  }
}

/**
 * Validates using a custom formula
 */
function validateCustomFormula(
  value: CellValue,
  validation: DataValidation,
  context: ValidationContext | undefined,
  createError: (msg?: string) => ValidationResult
): ValidationResult {
  const { formula1 } = validation;

  if (!formula1) {
    return { valid: true };
  }

  // If a formula evaluator is provided, use it
  if (context?.evaluateFormula) {
    const result = context.evaluateFormula(formula1, context.sheet, context.cellAddress);

    // The formula should return TRUE for valid, FALSE for invalid
    if (result.type === 'boolean') {
      if (result.value === true) {
        return { valid: true };
      }
      return createError();
    }

    // Non-zero numbers are also treated as true
    if (result.type === 'number') {
      if (result.value !== 0) {
        return { valid: true };
      }
      return createError();
    }

    // Errors and other values are invalid
    return createError();
  }

  // Without a formula evaluator, we can't validate custom formulas
  // In production, this would integrate with the formula engine
  return { valid: true };
}

/**
 * Storage for validations on a sheet
 */
const sheetValidations = new WeakMap<Sheet, ValidationMap>();

/**
 * Gets the validation map for a sheet, creating one if needed
 */
function getValidationMap(sheet: Sheet): ValidationMap {
  let validations = sheetValidations.get(sheet);
  if (!validations) {
    validations = new Map();
    sheetValidations.set(sheet, validations);
  }
  return validations;
}

/**
 * Applies a validation rule to a range of cells
 */
export function applyValidationToRange(
  sheet: Sheet,
  range: CellRange,
  validation: DataValidation
): Sheet {
  const validations = getValidationMap(sheet);

  // Apply validation to each cell in the range
  for (const addr of iterateRange(range)) {
    const key = cellAddressKey(addr);
    validations.set(key, validation);

    // Also update the cell's validation property
    const cell = getCell(sheet, addr);
    const updatedCell = {
      ...cell,
      validation: {
        type: validation.type,
        operator: validation.operator,
        formula1: validation.formula1,
        formula2: validation.formula2,
        values: validation.values,
        showDropdown: validation.showDropdown,
        allowBlank: validation.allowBlank,
        errorTitle: validation.errorTitle,
        errorMessage: validation.errorMessage,
        showError: validation.showError,
        promptTitle: validation.inputTitle,
        promptMessage: validation.inputMessage,
        showPrompt: validation.showInputMessage,
      },
    };
    sheet = setCell(sheet, updatedCell);
  }

  // Store the updated validation map
  sheetValidations.set(sheet, validations);

  return sheet;
}

/**
 * Gets the validation rule for a specific cell
 */
export function getValidationForCell(
  sheet: Sheet,
  address: CellAddress
): DataValidation | null {
  const validations = getValidationMap(sheet);
  const key = cellAddressKey(address);
  return validations.get(key) ?? null;
}

/**
 * Removes validation from a range of cells
 */
export function removeValidation(sheet: Sheet, range: CellRange): Sheet {
  const validations = getValidationMap(sheet);

  for (const addr of iterateRange(range)) {
    const key = cellAddressKey(addr);
    validations.delete(key);

    // Also remove validation from the cell
    const cell = getCell(sheet, addr);
    if (cell.validation) {
      const updatedCell = { ...cell };
      delete updatedCell.validation;
      sheet = setCell(sheet, updatedCell);
    }
  }

  sheetValidations.set(sheet, validations);

  return sheet;
}

/**
 * Gets all validation rules in a sheet
 */
export function getAllValidations(sheet: Sheet): Map<string, DataValidation> {
  return new Map(getValidationMap(sheet));
}

/**
 * Checks if a cell has validation
 */
export function hasValidation(sheet: Sheet, address: CellAddress): boolean {
  return getValidationForCell(sheet, address) !== null;
}

/**
 * Validates a cell and returns the result
 */
export function validateCell(
  sheet: Sheet,
  address: CellAddress,
  value: CellValue,
  evaluateFormula?: (formula: string, sheet: Sheet, cellAddress: CellAddress) => CellValue
): ValidationResult {
  const validation = getValidationForCell(sheet, address);

  if (!validation) {
    return { valid: true };
  }

  const context: ValidationContext = {
    sheet,
    cellAddress: address,
    evaluateFormula,
  };

  return validateValue(value, validation, context);
}

/**
 * Creates a list validation with dropdown values
 */
export function createListValidation(
  values: string[],
  options?: {
    allowBlank?: boolean;
    showError?: boolean;
    errorMessage?: string;
    inputMessage?: string;
  }
): DataValidation {
  return createValidation({
    type: 'list',
    values,
    allowBlank: options?.allowBlank ?? true,
    showError: options?.showError ?? true,
    errorMessage: options?.errorMessage ?? 'Please select a value from the list',
    showInputMessage: !!options?.inputMessage,
    inputMessage: options?.inputMessage,
    showDropdown: true,
    inCellDropdown: true,
  });
}

/**
 * Creates a number range validation
 */
export function createNumberRangeValidation(
  min: number,
  max: number,
  options?: {
    allowBlank?: boolean;
    allowDecimal?: boolean;
    showError?: boolean;
    errorMessage?: string;
  }
): DataValidation {
  return createValidation({
    type: options?.allowDecimal ? 'decimal' : 'whole',
    operator: 'between',
    formula1: min.toString(),
    formula2: max.toString(),
    allowBlank: options?.allowBlank ?? true,
    showError: options?.showError ?? true,
    errorMessage: options?.errorMessage ?? `Value must be between ${min} and ${max}`,
  });
}

/**
 * Creates a text length validation
 */
export function createTextLengthValidation(
  maxLength: number,
  options?: {
    minLength?: number;
    allowBlank?: boolean;
    showError?: boolean;
    errorMessage?: string;
  }
): DataValidation {
  const minLength = options?.minLength ?? 0;

  return createValidation({
    type: 'textLength',
    operator: minLength > 0 ? 'between' : 'lessThanOrEqual',
    formula1: minLength > 0 ? minLength.toString() : maxLength.toString(),
    formula2: minLength > 0 ? maxLength.toString() : undefined,
    allowBlank: options?.allowBlank ?? true,
    showError: options?.showError ?? true,
    errorMessage:
      options?.errorMessage ??
      (minLength > 0
        ? `Text must be between ${minLength} and ${maxLength} characters`
        : `Text must be at most ${maxLength} characters`),
  });
}

/**
 * Creates a custom formula validation
 */
export function createCustomValidation(
  formula: string,
  options?: {
    allowBlank?: boolean;
    showError?: boolean;
    errorMessage?: string;
  }
): DataValidation {
  return createValidation({
    type: 'custom',
    formula1: formula,
    allowBlank: options?.allowBlank ?? true,
    showError: options?.showError ?? true,
    errorMessage: options?.errorMessage ?? 'Value does not meet the required criteria',
  });
}

/**
 * Serializes validation rules for storage
 */
export function serializeValidations(
  sheet: Sheet
): Array<{ range: string; validation: DataValidation }> {
  const validations = getValidationMap(sheet);
  const result: Array<{ range: string; validation: DataValidation }> = [];

  // Group validations by their configuration
  const groups = new Map<string, { addresses: CellAddress[]; validation: DataValidation }>();

  for (const [key, validation] of validations) {
    const validationKey = JSON.stringify(validation);
    const [, rowCol] = key.split('!');
    const [rowStr, colStr] = (rowCol ?? key).split(',');
    const row = parseInt(rowStr ?? '0', 10);
    const col = parseInt(colStr ?? '0', 10);
    const address: CellAddress = { row, col };

    if (!groups.has(validationKey)) {
      groups.set(validationKey, { addresses: [], validation });
    }
    groups.get(validationKey)!.addresses.push(address);
  }

  // Convert groups to serialized format
  for (const { addresses, validation } of groups.values()) {
    // For simplicity, just serialize each address as a single-cell range
    // A more sophisticated implementation would merge adjacent cells into ranges
    for (const addr of addresses) {
      const colLabel = columnIndexToLabel(addr.col);
      const range = `${colLabel}${addr.row + 1}`;
      result.push({ range, validation });
    }
  }

  return result;
}

/**
 * Helper function to convert column index to label
 */
function columnIndexToLabel(index: number): string {
  let label = '';
  let n = index;

  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }

  return label;
}

/**
 * Deserializes validation rules and applies them to a sheet
 */
export function deserializeValidations(
  sheet: Sheet,
  serialized: Array<{ range: string; validation: DataValidation }>
): Sheet {
  for (const { range, validation } of serialized) {
    const cellRange = parseRangeReference(range);
    if (cellRange) {
      sheet = applyValidationToRange(sheet, cellRange, validation);
    }
  }
  return sheet;
}

// Re-export types that are already in Cell.ts for convenience
export type { DataValidation as CellDataValidation } from '../models/Cell';
