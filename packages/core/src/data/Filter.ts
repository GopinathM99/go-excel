/**
 * Auto-filter functionality for Go Excel
 * Supports value-based and condition-based filtering
 */

import type { Sheet } from '../models/Sheet';
import type { CellRange } from '../models/CellRange';
import type { CellValue } from '../models/CellValue';
import { getCell } from '../models/Sheet';
import { valueToDisplayString, isError, isEmpty } from '../models/CellValue';

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'notBetween'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'top10'
  | 'bottom10'
  | 'aboveAverage'
  | 'belowAverage'
  | 'blank'
  | 'notBlank';

/**
 * Filter condition for condition-based filtering
 */
export interface FilterCondition {
  operator: FilterOperator;
  value1?: string | number;
  value2?: string | number; // For 'between' and 'notBetween'
}

/**
 * Column filter configuration
 */
export interface ColumnFilter {
  type: 'values' | 'condition';
  /** For value filter - show only rows with these values */
  values?: Set<string>;
  /** For condition filter */
  conditions?: FilterCondition[];
  /** Logic for combining multiple conditions */
  conditionLogic?: 'and' | 'or';
}

/**
 * Auto-filter configuration for a range
 */
export interface AutoFilter {
  range: CellRange;
  filters: Map<number, ColumnFilter>; // column index -> filter
}

/**
 * Result of applying a filter
 */
export interface FilterResult {
  visibleRows: number[];
  hiddenRows: number[];
  matchCounts: Map<number, number>; // column -> matching row count
}

/**
 * Creates a new auto-filter for the given range
 */
export function createAutoFilter(sheet: Sheet, range: CellRange): AutoFilter {
  return {
    range: {
      start: { ...range.start },
      end: { ...range.end },
    },
    filters: new Map(),
  };
}

/**
 * Sets a filter for a specific column
 */
export function setColumnFilter(
  filter: AutoFilter,
  column: number,
  columnFilter: ColumnFilter
): void {
  filter.filters.set(column, columnFilter);
}

/**
 * Clears the filter for a specific column
 */
export function clearColumnFilter(filter: AutoFilter, column: number): void {
  filter.filters.delete(column);
}

/**
 * Clears all column filters
 */
export function clearAllFilters(filter: AutoFilter): void {
  filter.filters.clear();
}

/**
 * Gets the cell value as a string for comparison
 */
function getCellValueString(value: CellValue): string {
  if (isEmpty(value)) {
    return '';
  }
  return valueToDisplayString(value);
}

/**
 * Gets the numeric value from a cell value for comparison
 */
function getCellNumericValue(value: CellValue): number | null {
  if (value.type === 'number') {
    return value.value;
  }
  if (value.type === 'string') {
    const parsed = parseFloat(value.value);
    return isNaN(parsed) ? null : parsed;
  }
  if (value.type === 'boolean') {
    return value.value ? 1 : 0;
  }
  return null;
}

/**
 * Checks if a cell value is blank (empty or error)
 */
function isCellBlank(value: CellValue): boolean {
  return isEmpty(value) || isError(value);
}

/**
 * Compares two values for numeric operations
 */
function numericCompare(
  cellValue: CellValue,
  operator: FilterOperator,
  value1?: string | number,
  value2?: string | number
): boolean {
  const numValue = getCellNumericValue(cellValue);

  // Special operators that don't require value1
  if (operator === 'blank') {
    return isCellBlank(cellValue);
  }
  if (operator === 'notBlank') {
    return !isCellBlank(cellValue);
  }

  // If cell has no numeric value and operator requires numeric comparison
  if (numValue === null) {
    // For string-based operators, we'll handle them in textCompare
    return false;
  }

  const num1 = typeof value1 === 'number' ? value1 : parseFloat(value1 ?? '');
  const num2 = typeof value2 === 'number' ? value2 : parseFloat(value2 ?? '');

  switch (operator) {
    case 'equals':
      return numValue === num1;
    case 'notEquals':
      return numValue !== num1;
    case 'greaterThan':
      return numValue > num1;
    case 'greaterThanOrEqual':
      return numValue >= num1;
    case 'lessThan':
      return numValue < num1;
    case 'lessThanOrEqual':
      return numValue <= num1;
    case 'between':
      return numValue >= num1 && numValue <= num2;
    case 'notBetween':
      return numValue < num1 || numValue > num2;
    default:
      return false;
  }
}

/**
 * Compares values for text operations (case-insensitive by default)
 */
function textCompare(
  cellValue: CellValue,
  operator: FilterOperator,
  value1?: string | number
): boolean {
  if (operator === 'blank') {
    return isCellBlank(cellValue);
  }
  if (operator === 'notBlank') {
    return !isCellBlank(cellValue);
  }

  const cellStr = getCellValueString(cellValue).toLowerCase();
  const compareStr = String(value1 ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return cellStr === compareStr;
    case 'notEquals':
      return cellStr !== compareStr;
    case 'contains':
      return cellStr.includes(compareStr);
    case 'notContains':
      return !cellStr.includes(compareStr);
    case 'startsWith':
      return cellStr.startsWith(compareStr);
    case 'endsWith':
      return cellStr.endsWith(compareStr);
    default:
      return false;
  }
}

/**
 * Checks if a condition matches a cell value
 */
function matchesCondition(cellValue: CellValue, condition: FilterCondition): boolean {
  const { operator, value1, value2 } = condition;

  // Handle blank/notBlank operators
  if (operator === 'blank') {
    return isCellBlank(cellValue);
  }
  if (operator === 'notBlank') {
    return !isCellBlank(cellValue);
  }

  // Text-based operators
  const textOperators: FilterOperator[] = ['contains', 'notContains', 'startsWith', 'endsWith'];
  if (textOperators.includes(operator)) {
    return textCompare(cellValue, operator, value1);
  }

  // Numeric operators - try numeric comparison first, fall back to text
  const numericOperators: FilterOperator[] = [
    'equals',
    'notEquals',
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
    'between',
    'notBetween',
  ];

  if (numericOperators.includes(operator)) {
    // Try numeric comparison if both cell and value are numeric
    const cellNum = getCellNumericValue(cellValue);
    const val1Num = typeof value1 === 'number' ? value1 : parseFloat(value1 ?? '');

    if (cellNum !== null && !isNaN(val1Num)) {
      return numericCompare(cellValue, operator, value1, value2);
    }

    // Fall back to text comparison for equals/notEquals
    if (operator === 'equals' || operator === 'notEquals') {
      return textCompare(cellValue, operator, value1);
    }

    return false;
  }

  // These operators are handled separately in applyFilter
  if (
    operator === 'top10' ||
    operator === 'bottom10' ||
    operator === 'aboveAverage' ||
    operator === 'belowAverage'
  ) {
    return true; // Will be evaluated with full column data
  }

  return false;
}

/**
 * Checks if a row matches a column filter
 */
function rowMatchesColumnFilter(
  sheet: Sheet,
  row: number,
  column: number,
  columnFilter: ColumnFilter
): boolean {
  const cell = getCell(sheet, { row, col: column });
  const cellValue = cell.value;

  if (columnFilter.type === 'values') {
    // Value-based filter - check if cell value is in the set
    if (!columnFilter.values || columnFilter.values.size === 0) {
      return true; // No filter applied
    }

    const displayValue = getCellValueString(cellValue);
    return columnFilter.values.has(displayValue);
  }

  // columnFilter.type must be 'condition' at this point
  if (!columnFilter.conditions || columnFilter.conditions.length === 0) {
    return true; // No conditions
  }

  const logic = columnFilter.conditionLogic ?? 'and';

  if (logic === 'and') {
    return columnFilter.conditions.every((cond) => matchesCondition(cellValue, cond));
  } else {
    return columnFilter.conditions.some((cond) => matchesCondition(cellValue, cond));
  }
}

/**
 * Gets all numeric values from a column for statistical operators
 */
function getColumnNumericValues(
  sheet: Sheet,
  range: CellRange,
  column: number
): { value: number; row: number }[] {
  const values: { value: number; row: number }[] = [];

  // Skip header row (first row of range)
  for (let row = range.start.row + 1; row <= range.end.row; row++) {
    const cell = getCell(sheet, { row, col: column });
    const numValue = getCellNumericValue(cell.value);
    if (numValue !== null) {
      values.push({ value: numValue, row });
    }
  }

  return values;
}

/**
 * Applies statistical filters (top10, bottom10, aboveAverage, belowAverage)
 */
function applyStatisticalFilter(
  sheet: Sheet,
  range: CellRange,
  column: number,
  operator: FilterOperator,
  rows: Set<number>
): void {
  const columnValues = getColumnNumericValues(sheet, range, column);

  if (columnValues.length === 0) {
    // No numeric values - hide all rows
    for (let row = range.start.row + 1; row <= range.end.row; row++) {
      rows.delete(row);
    }
    return;
  }

  let matchingRows: Set<number>;

  switch (operator) {
    case 'top10': {
      // Sort descending and take top 10
      const sorted = [...columnValues].sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 10);
      matchingRows = new Set(top.map((v) => v.row));
      break;
    }
    case 'bottom10': {
      // Sort ascending and take bottom 10
      const sorted = [...columnValues].sort((a, b) => a.value - b.value);
      const bottom = sorted.slice(0, 10);
      matchingRows = new Set(bottom.map((v) => v.row));
      break;
    }
    case 'aboveAverage': {
      const sum = columnValues.reduce((acc, v) => acc + v.value, 0);
      const avg = sum / columnValues.length;
      matchingRows = new Set(columnValues.filter((v) => v.value > avg).map((v) => v.row));
      break;
    }
    case 'belowAverage': {
      const sum = columnValues.reduce((acc, v) => acc + v.value, 0);
      const avg = sum / columnValues.length;
      matchingRows = new Set(columnValues.filter((v) => v.value < avg).map((v) => v.row));
      break;
    }
    default:
      return;
  }

  // Remove rows that don't match from the visible set
  for (let row = range.start.row + 1; row <= range.end.row; row++) {
    if (!matchingRows.has(row)) {
      rows.delete(row);
    }
  }
}

/**
 * Checks if a column filter has any statistical operators
 */
function hasStatisticalOperator(columnFilter: ColumnFilter): FilterOperator | null {
  if (columnFilter.type !== 'condition' || !columnFilter.conditions) {
    return null;
  }

  const statisticalOps: FilterOperator[] = ['top10', 'bottom10', 'aboveAverage', 'belowAverage'];

  for (const cond of columnFilter.conditions) {
    if (statisticalOps.includes(cond.operator)) {
      return cond.operator;
    }
  }

  return null;
}

/**
 * Applies the auto-filter to the sheet and returns visible/hidden rows
 */
export function applyFilter(sheet: Sheet, filter: AutoFilter): FilterResult {
  const { range, filters } = filter;

  // Start with all data rows visible (skip header row)
  const visibleRows = new Set<number>();
  for (let row = range.start.row + 1; row <= range.end.row; row++) {
    visibleRows.add(row);
  }

  const matchCounts = new Map<number, number>();

  // Process each column filter
  for (const [column, columnFilter] of filters) {
    // Check for statistical operators first
    const statOp = hasStatisticalOperator(columnFilter);
    if (statOp) {
      applyStatisticalFilter(sheet, range, column, statOp, visibleRows);
      continue;
    }

    // Apply regular filter
    let columnMatchCount = 0;

    for (let row = range.start.row + 1; row <= range.end.row; row++) {
      if (!visibleRows.has(row)) {
        continue; // Already hidden by another filter
      }

      if (rowMatchesColumnFilter(sheet, row, column, columnFilter)) {
        columnMatchCount++;
      } else {
        visibleRows.delete(row);
      }
    }

    matchCounts.set(column, columnMatchCount);
  }

  // Calculate hidden rows
  const hiddenRows: number[] = [];
  for (let row = range.start.row + 1; row <= range.end.row; row++) {
    if (!visibleRows.has(row)) {
      hiddenRows.push(row);
    }
  }

  return {
    visibleRows: Array.from(visibleRows).sort((a, b) => a - b),
    hiddenRows: hiddenRows.sort((a, b) => a - b),
    matchCounts,
  };
}

/**
 * Gets unique values in a column for the filter dropdown
 * Returns values sorted alphabetically
 */
export function getUniqueValues(sheet: Sheet, range: CellRange, column: number): string[] {
  const uniqueValues = new Set<string>();

  // Skip header row (first row of range)
  for (let row = range.start.row + 1; row <= range.end.row; row++) {
    const cell = getCell(sheet, { row, col: column });
    const displayValue = getCellValueString(cell.value);
    uniqueValues.add(displayValue);
  }

  return Array.from(uniqueValues).sort((a, b) => {
    // Sort with blanks last
    if (a === '' && b !== '') return 1;
    if (a !== '' && b === '') return -1;

    // Try numeric sort first
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // Fall back to string sort (case-insensitive)
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
}

/**
 * Gets the visible row indices after applying the filter
 */
export function getVisibleRows(sheet: Sheet, filter: AutoFilter): number[] {
  const result = applyFilter(sheet, filter);
  return result.visibleRows;
}

/**
 * Gets the hidden row indices after applying the filter
 */
export function getHiddenRows(sheet: Sheet, filter: AutoFilter): number[] {
  const result = applyFilter(sheet, filter);
  return result.hiddenRows;
}

/**
 * Creates a value-based column filter
 */
export function createValueFilter(values: string[]): ColumnFilter {
  return {
    type: 'values',
    values: new Set(values),
  };
}

/**
 * Creates a condition-based column filter
 */
export function createConditionFilter(
  conditions: FilterCondition[],
  logic: 'and' | 'or' = 'and'
): ColumnFilter {
  return {
    type: 'condition',
    conditions,
    conditionLogic: logic,
  };
}

/**
 * Updates the sheet with filter results (hides/shows rows)
 */
export function applyFilterToSheet(sheet: Sheet, filter: AutoFilter): Sheet {
  const result = applyFilter(sheet, filter);

  // Create new hidden rows set
  const newHiddenRows = new Set(sheet.hiddenRows);

  // First, show all rows in the filter range (remove from hidden)
  for (let row = filter.range.start.row + 1; row <= filter.range.end.row; row++) {
    newHiddenRows.delete(row);
  }

  // Then hide the filtered-out rows
  for (const row of result.hiddenRows) {
    newHiddenRows.add(row);
  }

  return {
    ...sheet,
    hiddenRows: newHiddenRows,
    autoFilter: filter,
  };
}

/**
 * Removes the auto-filter from the sheet and shows all rows
 */
export function removeAutoFilter(sheet: Sheet): Sheet {
  if (!sheet.autoFilter) {
    return sheet;
  }

  const newHiddenRows = new Set(sheet.hiddenRows);

  // Show all rows that were in the filter range
  for (
    let row = sheet.autoFilter.range.start.row + 1;
    row <= sheet.autoFilter.range.end.row;
    row++
  ) {
    newHiddenRows.delete(row);
  }

  return {
    ...sheet,
    hiddenRows: newHiddenRows,
    autoFilter: undefined,
  };
}

/**
 * Checks if a specific row is visible after applying the filter
 */
export function isRowVisible(sheet: Sheet, filter: AutoFilter, row: number): boolean {
  const result = applyFilter(sheet, filter);
  return result.visibleRows.includes(row);
}

/**
 * Gets the count of visible rows after filtering
 */
export function getVisibleRowCount(sheet: Sheet, filter: AutoFilter): number {
  const result = applyFilter(sheet, filter);
  return result.visibleRows.length;
}

/**
 * Gets the total row count in the filter range (excluding header)
 */
export function getTotalRowCount(filter: AutoFilter): number {
  return filter.range.end.row - filter.range.start.row;
}
