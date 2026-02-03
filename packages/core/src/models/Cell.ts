import type { CellValue } from './CellValue';
import type { CellStyle } from './CellStyle';
import type { CellAddress } from './CellAddress';
import { emptyValue } from './CellValue';

/**
 * Represents the raw content of a cell (what the user entered)
 */
export interface CellContent {
  /** The raw input string (formula or value) */
  raw: string;
  /** Whether the content is a formula */
  isFormula: boolean;
}

/**
 * Represents a single cell in the spreadsheet
 */
export interface Cell {
  /** The cell's address */
  address: CellAddress;

  /** The raw content entered by the user */
  content: CellContent;

  /** The computed/evaluated value */
  value: CellValue;

  /** Cell styling */
  style?: CellStyle;

  /** Comment attached to the cell */
  comment?: CellComment;

  /** Data validation rule */
  validation?: DataValidation;

  /** Hyperlink */
  hyperlink?: Hyperlink;

  /** Whether this cell is part of a merged region */
  mergedWith?: CellAddress;
}

/**
 * Cell comment
 */
export interface CellComment {
  text: string;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
  replies?: CellCommentReply[];
  resolved?: boolean;
}

/**
 * Reply to a cell comment
 */
export interface CellCommentReply {
  text: string;
  author?: string;
  createdAt: number;
}

/**
 * Hyperlink data
 */
export interface Hyperlink {
  url: string;
  tooltip?: string;
  displayText?: string;
}

/**
 * Data validation types
 */
export type ValidationType =
  | 'any'
  | 'whole'
  | 'decimal'
  | 'list'
  | 'date'
  | 'time'
  | 'textLength'
  | 'custom';

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
  | 'greaterOrEqual'
  | 'lessOrEqual';

/**
 * Data validation rule
 */
export interface DataValidation {
  type: ValidationType;
  operator?: ValidationOperator;
  formula1?: string;
  formula2?: string;
  /** For list type: dropdown values */
  values?: string[];
  /** Whether to show dropdown arrow for lists */
  showDropdown?: boolean;
  /** Whether to allow blank values */
  allowBlank?: boolean;
  /** Error message settings */
  errorTitle?: string;
  errorMessage?: string;
  showError?: boolean;
  /** Input message settings */
  promptTitle?: string;
  promptMessage?: string;
  showPrompt?: boolean;
}

/**
 * Creates an empty cell
 */
export function createEmptyCell(address: CellAddress): Cell {
  return {
    address,
    content: { raw: '', isFormula: false },
    value: emptyValue(),
  };
}

/**
 * Creates a cell with the given raw content
 */
export function createCell(
  address: CellAddress,
  raw: string,
  value?: CellValue,
  style?: CellStyle
): Cell {
  const isFormula = raw.startsWith('=');
  return {
    address,
    content: { raw, isFormula },
    value: value ?? emptyValue(),
    style,
  };
}

/**
 * Checks if a cell is empty (no content)
 */
export function isCellEmpty(cell: Cell): boolean {
  return cell.content.raw === '';
}

/**
 * Checks if a cell has a formula
 */
export function isCellFormula(cell: Cell): boolean {
  return cell.content.isFormula;
}

/**
 * Gets the formula from a cell (without the leading '=')
 */
export function getCellFormula(cell: Cell): string | null {
  if (!cell.content.isFormula) return null;
  return cell.content.raw.slice(1);
}

/**
 * Updates a cell's content and marks it for recalculation
 */
export function updateCellContent(cell: Cell, raw: string): Cell {
  const isFormula = raw.startsWith('=');
  return {
    ...cell,
    content: { raw, isFormula },
    // Value will be updated by the calculation engine
    value: emptyValue(),
  };
}

/**
 * Updates a cell's computed value
 */
export function updateCellValue(cell: Cell, value: CellValue): Cell {
  return {
    ...cell,
    value,
  };
}

/**
 * Updates a cell's style
 */
export function updateCellStyle(cell: Cell, style: CellStyle): Cell {
  return {
    ...cell,
    style: { ...cell.style, ...style },
  };
}

/**
 * Clears a cell's content (keeps style and other metadata)
 */
export function clearCellContent(cell: Cell): Cell {
  return {
    ...cell,
    content: { raw: '', isFormula: false },
    value: emptyValue(),
  };
}

/**
 * Clears a cell's style
 */
export function clearCellStyle(cell: Cell): Cell {
  return {
    ...cell,
    style: undefined,
  };
}

/**
 * Clears all cell data
 */
export function clearCell(cell: Cell): Cell {
  return createEmptyCell(cell.address);
}

/**
 * Validates cell content against its validation rule
 */
export function validateCell(cell: Cell): { valid: boolean; message?: string } {
  if (!cell.validation) {
    return { valid: true };
  }

  const validation = cell.validation;

  // Allow blank if configured
  if (validation.allowBlank && isCellEmpty(cell)) {
    return { valid: true };
  }

  // Type-specific validation would go here
  // This is a placeholder for the full implementation

  return { valid: true };
}
