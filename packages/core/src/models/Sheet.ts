import type { Cell } from './Cell';
import type { CellAddress } from './CellAddress';
import type { CellRange } from './CellRange';
import type { CellStyle } from './CellStyle';
import { createEmptyCell, createCell } from './Cell';
import { cellAddressKey } from './CellAddress';
import { generateId } from '@excel/shared';
import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_ROW_HEIGHT,
  MAX_ROWS,
  MAX_COLUMNS,
} from '@excel/shared';

/**
 * Merged cell region
 */
export interface MergedRegion {
  range: CellRange;
}

/**
 * Frozen pane configuration
 */
export interface FrozenPanes {
  rows: number;
  columns: number;
}

/**
 * Auto-filter configuration
 */
export interface AutoFilter {
  range: CellRange;
  filters: Map<number, FilterCriteria>;
}

/**
 * Filter criteria for a column
 */
export interface FilterCriteria {
  type: 'values' | 'condition';
  /** For value filters: selected values to show */
  values?: Set<string>;
  /** For condition filters: the condition to apply */
  condition?: FilterCondition;
}

/**
 * Filter condition
 */
export interface FilterCondition {
  operator: 'contains' | 'notContains' | 'beginsWith' | 'endsWith' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between';
  value1: string | number;
  value2?: string | number;
}

/**
 * Sort order
 */
export interface SortOrder {
  column: number;
  ascending: boolean;
}

/**
 * Conditional formatting rule
 */
export interface ConditionalFormatRule {
  id: string;
  range: CellRange;
  type: 'cellValue' | 'formula' | 'colorScale' | 'dataBar' | 'iconSet' | 'top10' | 'aboveAverage' | 'duplicates' | 'unique';
  priority: number;
  stopIfTrue?: boolean;
  style?: CellStyle;
  formula?: string;
}

/**
 * Chart embedded in the sheet
 */
export interface EmbeddedChart {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  dataRange: CellRange;
  position: { row: number; col: number };
  size: { width: number; height: number };
  title?: string;
  options?: Record<string, unknown>;
}

/**
 * Represents a single sheet/worksheet in a workbook
 */
export interface Sheet {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Cell data (sparse storage - only non-empty cells) */
  cells: Map<string, Cell>;

  /** Column widths (sparse - only non-default widths) */
  columnWidths: Map<number, number>;

  /** Row heights (sparse - only non-default heights) */
  rowHeights: Map<number, number>;

  /** Hidden columns */
  hiddenColumns: Set<number>;

  /** Hidden rows */
  hiddenRows: Set<number>;

  /** Merged cell regions */
  mergedRegions: MergedRegion[];

  /** Frozen panes */
  frozenPanes?: FrozenPanes;

  /** Auto-filter */
  autoFilter?: AutoFilter;

  /** Conditional formatting rules */
  conditionalFormats: ConditionalFormatRule[];

  /** Embedded charts */
  charts: EmbeddedChart[];

  /** Default column style */
  defaultColumnStyle?: CellStyle;

  /** Default row style */
  defaultRowStyle?: CellStyle;

  /** Column-specific default styles */
  columnStyles: Map<number, CellStyle>;

  /** Row-specific default styles */
  rowStyles: Map<number, CellStyle>;

  /** Sheet is hidden */
  hidden?: boolean;

  /** Sheet tab color */
  tabColor?: string;

  /** Zoom level (percentage) */
  zoom: number;

  /** Show gridlines */
  showGridlines: boolean;

  /** Show row/column headers */
  showHeaders: boolean;
}

/**
 * Creates a new empty sheet
 */
export function createSheet(name: string): Sheet {
  return {
    id: generateId(),
    name,
    cells: new Map(),
    columnWidths: new Map(),
    rowHeights: new Map(),
    hiddenColumns: new Set(),
    hiddenRows: new Set(),
    mergedRegions: [],
    conditionalFormats: [],
    charts: [],
    columnStyles: new Map(),
    rowStyles: new Map(),
    zoom: 100,
    showGridlines: true,
    showHeaders: true,
  };
}

/**
 * Gets a cell from the sheet, creating an empty one if it doesn't exist
 */
export function getCell(sheet: Sheet, address: CellAddress): Cell {
  const key = cellAddressKey(address);
  const existing = sheet.cells.get(key);
  if (existing) return existing;
  return createEmptyCell(address);
}

/**
 * Sets a cell in the sheet
 */
export function setCell(sheet: Sheet, cell: Cell): Sheet {
  const key = cellAddressKey(cell.address);
  const newCells = new Map(sheet.cells);
  newCells.set(key, cell);
  return { ...sheet, cells: newCells };
}

/**
 * Sets multiple cells in the sheet
 */
export function setCells(sheet: Sheet, cells: Cell[]): Sheet {
  const newCells = new Map(sheet.cells);
  for (const cell of cells) {
    newCells.set(cellAddressKey(cell.address), cell);
  }
  return { ...sheet, cells: newCells };
}

/**
 * Deletes a cell from the sheet
 */
export function deleteCell(sheet: Sheet, address: CellAddress): Sheet {
  const key = cellAddressKey(address);
  if (!sheet.cells.has(key)) return sheet;
  const newCells = new Map(sheet.cells);
  newCells.delete(key);
  return { ...sheet, cells: newCells };
}

/**
 * Gets the width of a column
 */
export function getColumnWidth(sheet: Sheet, col: number): number {
  return sheet.columnWidths.get(col) ?? DEFAULT_COLUMN_WIDTH;
}

/**
 * Sets the width of a column
 */
export function setColumnWidth(sheet: Sheet, col: number, width: number): Sheet {
  const newWidths = new Map(sheet.columnWidths);
  if (width === DEFAULT_COLUMN_WIDTH) {
    newWidths.delete(col);
  } else {
    newWidths.set(col, width);
  }
  return { ...sheet, columnWidths: newWidths };
}

/**
 * Gets the height of a row
 */
export function getRowHeight(sheet: Sheet, row: number): number {
  return sheet.rowHeights.get(row) ?? DEFAULT_ROW_HEIGHT;
}

/**
 * Sets the height of a row
 */
export function setRowHeight(sheet: Sheet, row: number, height: number): Sheet {
  const newHeights = new Map(sheet.rowHeights);
  if (height === DEFAULT_ROW_HEIGHT) {
    newHeights.delete(row);
  } else {
    newHeights.set(row, height);
  }
  return { ...sheet, rowHeights: newHeights };
}

/**
 * Hides a column
 */
export function hideColumn(sheet: Sheet, col: number): Sheet {
  const newHidden = new Set(sheet.hiddenColumns);
  newHidden.add(col);
  return { ...sheet, hiddenColumns: newHidden };
}

/**
 * Shows a hidden column
 */
export function showColumn(sheet: Sheet, col: number): Sheet {
  const newHidden = new Set(sheet.hiddenColumns);
  newHidden.delete(col);
  return { ...sheet, hiddenColumns: newHidden };
}

/**
 * Hides a row
 */
export function hideRow(sheet: Sheet, row: number): Sheet {
  const newHidden = new Set(sheet.hiddenRows);
  newHidden.add(row);
  return { ...sheet, hiddenRows: newHidden };
}

/**
 * Shows a hidden row
 */
export function showRow(sheet: Sheet, row: number): Sheet {
  const newHidden = new Set(sheet.hiddenRows);
  newHidden.delete(row);
  return { ...sheet, hiddenRows: newHidden };
}

/**
 * Adds a merged region
 */
export function addMergedRegion(sheet: Sheet, range: CellRange): Sheet {
  const newRegions = [...sheet.mergedRegions, { range }];
  return { ...sheet, mergedRegions: newRegions };
}

/**
 * Removes a merged region containing the given address
 */
export function removeMergedRegion(sheet: Sheet, address: CellAddress): Sheet {
  const newRegions = sheet.mergedRegions.filter(
    (region) =>
      !(
        address.row >= region.range.start.row &&
        address.row <= region.range.end.row &&
        address.col >= region.range.start.col &&
        address.col <= region.range.end.col
      )
  );
  return { ...sheet, mergedRegions: newRegions };
}

/**
 * Gets the merged region containing the given address
 */
export function getMergedRegion(
  sheet: Sheet,
  address: CellAddress
): MergedRegion | undefined {
  return sheet.mergedRegions.find(
    (region) =>
      address.row >= region.range.start.row &&
      address.row <= region.range.end.row &&
      address.col >= region.range.start.col &&
      address.col <= region.range.end.col
  );
}

/**
 * Sets frozen panes
 */
export function setFrozenPanes(
  sheet: Sheet,
  rows: number,
  columns: number
): Sheet {
  if (rows === 0 && columns === 0) {
    return { ...sheet, frozenPanes: undefined };
  }
  return { ...sheet, frozenPanes: { rows, columns } };
}

/**
 * Gets the used range of the sheet (smallest rectangle containing all data)
 */
export function getUsedRange(sheet: Sheet): CellRange | null {
  let minRow = MAX_ROWS;
  let maxRow = -1;
  let minCol = MAX_COLUMNS;
  let maxCol = -1;

  for (const cell of sheet.cells.values()) {
    if (cell.content.raw !== '') {
      minRow = Math.min(minRow, cell.address.row);
      maxRow = Math.max(maxRow, cell.address.row);
      minCol = Math.min(minCol, cell.address.col);
      maxCol = Math.max(maxCol, cell.address.col);
    }
  }

  if (maxRow < 0) return null;

  return {
    start: { row: minRow, col: minCol },
    end: { row: maxRow, col: maxCol },
  };
}

/**
 * Gets all non-empty cells in a range
 */
export function getCellsInRange(sheet: Sheet, range: CellRange): Cell[] {
  const cells: Cell[] = [];
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      const key = cellAddressKey({ row, col });
      const cell = sheet.cells.get(key);
      if (cell) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

/**
 * Clears all cells in a range
 */
export function clearRange(sheet: Sheet, range: CellRange): Sheet {
  const newCells = new Map(sheet.cells);
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      newCells.delete(cellAddressKey({ row, col }));
    }
  }
  return { ...sheet, cells: newCells };
}

/**
 * Inserts rows at the specified position
 */
export function insertRows(sheet: Sheet, startRow: number, count: number): Sheet {
  const newCells = new Map<string, Cell>();
  const newRowHeights = new Map<number, number>();
  const newHiddenRows = new Set<number>();

  // Shift existing cells
  for (const [, cell] of sheet.cells) {
    if (cell.address.row >= startRow) {
      const newAddress = { ...cell.address, row: cell.address.row + count };
      newCells.set(cellAddressKey(newAddress), { ...cell, address: newAddress });
    } else {
      newCells.set(cellAddressKey(cell.address), cell);
    }
  }

  // Shift row heights
  for (const [row, height] of sheet.rowHeights) {
    if (row >= startRow) {
      newRowHeights.set(row + count, height);
    } else {
      newRowHeights.set(row, height);
    }
  }

  // Shift hidden rows
  for (const row of sheet.hiddenRows) {
    if (row >= startRow) {
      newHiddenRows.add(row + count);
    } else {
      newHiddenRows.add(row);
    }
  }

  return {
    ...sheet,
    cells: newCells,
    rowHeights: newRowHeights,
    hiddenRows: newHiddenRows,
  };
}

/**
 * Inserts columns at the specified position
 */
export function insertColumns(sheet: Sheet, startCol: number, count: number): Sheet {
  const newCells = new Map<string, Cell>();
  const newColumnWidths = new Map<number, number>();
  const newHiddenColumns = new Set<number>();

  // Shift existing cells
  for (const [, cell] of sheet.cells) {
    if (cell.address.col >= startCol) {
      const newAddress = { ...cell.address, col: cell.address.col + count };
      newCells.set(cellAddressKey(newAddress), { ...cell, address: newAddress });
    } else {
      newCells.set(cellAddressKey(cell.address), cell);
    }
  }

  // Shift column widths
  for (const [col, width] of sheet.columnWidths) {
    if (col >= startCol) {
      newColumnWidths.set(col + count, width);
    } else {
      newColumnWidths.set(col, width);
    }
  }

  // Shift hidden columns
  for (const col of sheet.hiddenColumns) {
    if (col >= startCol) {
      newHiddenColumns.add(col + count);
    } else {
      newHiddenColumns.add(col);
    }
  }

  return {
    ...sheet,
    cells: newCells,
    columnWidths: newColumnWidths,
    hiddenColumns: newHiddenColumns,
  };
}

/**
 * Deletes rows at the specified position
 */
export function deleteRows(sheet: Sheet, startRow: number, count: number): Sheet {
  const endRow = startRow + count - 1;
  const newCells = new Map<string, Cell>();
  const newRowHeights = new Map<number, number>();
  const newHiddenRows = new Set<number>();

  // Remove cells in deleted rows, shift others
  for (const [, cell] of sheet.cells) {
    if (cell.address.row >= startRow && cell.address.row <= endRow) {
      // Skip - cell is in deleted range
    } else if (cell.address.row > endRow) {
      const newAddress = { ...cell.address, row: cell.address.row - count };
      newCells.set(cellAddressKey(newAddress), { ...cell, address: newAddress });
    } else {
      newCells.set(cellAddressKey(cell.address), cell);
    }
  }

  // Shift row heights
  for (const [row, height] of sheet.rowHeights) {
    if (row >= startRow && row <= endRow) {
      // Skip
    } else if (row > endRow) {
      newRowHeights.set(row - count, height);
    } else {
      newRowHeights.set(row, height);
    }
  }

  // Shift hidden rows
  for (const row of sheet.hiddenRows) {
    if (row >= startRow && row <= endRow) {
      // Skip
    } else if (row > endRow) {
      newHiddenRows.add(row - count);
    } else {
      newHiddenRows.add(row);
    }
  }

  return {
    ...sheet,
    cells: newCells,
    rowHeights: newRowHeights,
    hiddenRows: newHiddenRows,
  };
}

/**
 * Deletes columns at the specified position
 */
export function deleteColumns(sheet: Sheet, startCol: number, count: number): Sheet {
  const endCol = startCol + count - 1;
  const newCells = new Map<string, Cell>();
  const newColumnWidths = new Map<number, number>();
  const newHiddenColumns = new Set<number>();

  // Remove cells in deleted columns, shift others
  for (const [, cell] of sheet.cells) {
    if (cell.address.col >= startCol && cell.address.col <= endCol) {
      // Skip - cell is in deleted range
    } else if (cell.address.col > endCol) {
      const newAddress = { ...cell.address, col: cell.address.col - count };
      newCells.set(cellAddressKey(newAddress), { ...cell, address: newAddress });
    } else {
      newCells.set(cellAddressKey(cell.address), cell);
    }
  }

  // Shift column widths
  for (const [col, width] of sheet.columnWidths) {
    if (col >= startCol && col <= endCol) {
      // Skip
    } else if (col > endCol) {
      newColumnWidths.set(col - count, width);
    } else {
      newColumnWidths.set(col, width);
    }
  }

  // Shift hidden columns
  for (const col of sheet.hiddenColumns) {
    if (col >= startCol && col <= endCol) {
      // Skip
    } else if (col > endCol) {
      newHiddenColumns.add(col - count);
    } else {
      newHiddenColumns.add(col);
    }
  }

  return {
    ...sheet,
    cells: newCells,
    columnWidths: newColumnWidths,
    hiddenColumns: newHiddenColumns,
  };
}
