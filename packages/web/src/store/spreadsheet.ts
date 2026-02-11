import { create } from 'zustand';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT } from '@excel/shared';
import type { Workbook } from '@excel/core';

interface CellPosition {
  row: number;
  col: number;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface CellData {
  value: string;
  formula?: string;
  style?: CellStyle;
}

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}

type EditTrigger = 'type' | 'doubleclick' | 'f2' | null;

export interface SheetData {
  id: string;
  name: string;
  cells: Map<string, CellData>;
  columnWidths: Map<number, number>;
  rowHeights: Map<number, number>;
}

let sheetCounter = 1;

function createSheet(name?: string): SheetData {
  const id = `sheet-${String(sheetCounter)}`;
  const sheetName = name ?? `Sheet${String(sheetCounter)}`;
  sheetCounter++;
  return {
    id,
    name: sheetName,
    cells: new Map(),
    columnWidths: new Map(),
    rowHeights: new Map(),
  };
}

interface SpreadsheetState {
  // Workbook (for version history)
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  workbook: Workbook | null;

  // Current user
  currentUser: UserInfo | null;
  // Sheet dimensions
  rowCount: number;
  columnCount: number;

  // Multi-sheet support
  sheets: SheetData[];
  activeSheetId: string;

  // Cell data (points to active sheet's data)
  cells: Map<string, CellData>;

  // Column widths (sparse - only stores non-default widths)
  columnWidths: Map<number, number>;

  // Row heights (sparse - only stores non-default heights)
  rowHeights: Map<number, number>;

  // Frozen panes
  frozenRows: number;
  frozenCols: number;

  // Selection
  selectedCell: CellPosition | null;
  selectionRange: { start: CellPosition; end: CellPosition } | null;

  // Editing
  editingCell: CellPosition | null;
  editValue: string;
  editTrigger: EditTrigger;

  // Actions
  getColumnWidth: (col: number) => number;
  getRowHeight: (row: number) => number;
  setColumnWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
  getCellValue: (row: number, col: number) => string;
  setCellValue: (row: number, col: number, value: string) => void;
  setCellValues: (updates: { row: number; col: number; value: string }[]) => void;
  getCellData: (row: number, col: number) => CellData | undefined;
  setSelectedCell: (pos: CellPosition | null) => void;
  setSelectionRange: (range: { start: CellPosition; end: CellPosition } | null) => void;
  startEditing: (row: number, col: number, trigger?: EditTrigger) => void;
  updateEditValue: (value: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;

  // Sheet actions
  addSheet: () => void;
  switchSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;

  // Formatting actions
  getCellStyle: (row: number, col: number) => CellStyle | undefined;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;

  // Workbook actions (for version history)
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  setWorkbook: (workbook: Workbook | null) => void;
  updateWorkbook: (workbook: Workbook) => void;
  setCurrentUser: (user: UserInfo | null) => void;

  // New file action
  resetWorkbook: () => void;

  // Load CSV data into the current sheet
  loadCsvData: (cellData: Map<string, CellData>) => void;

  // Multi-sheet save/load
  getAllSheetsData: () => SheetData[];
  loadAllSheets: (sheetsData: { name: string; cells: Map<string, CellData> }[]) => void;

  // Dirty state tracking
  isDirty: boolean;
  markDirty: () => void;
  markClean: () => void;
}

function cellKey(row: number, col: number): string {
  return `${String(row)},${String(col)}`;
}

/**
 * Save current cells/columnWidths/rowHeights back into the active sheet in the sheets array.
 * Returns a new sheets array with the active sheet updated.
 */
function saveActiveSheetData(state: SpreadsheetState): SheetData[] {
  return state.sheets.map((sheet) => {
    if (sheet.id === state.activeSheetId) {
      return {
        ...sheet,
        cells: state.cells,
        columnWidths: state.columnWidths,
        rowHeights: state.rowHeights,
      };
    }
    return sheet;
  });
}

const initialSheet = createSheet();

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  // Workbook and user
  workbook: null,
  currentUser: null,

  // Sheet dimensions
  rowCount: 100000, // 100k rows
  columnCount: 1000, // 1k columns

  // Multi-sheet support
  sheets: [initialSheet],
  activeSheetId: initialSheet.id,

  // Active sheet data (initially points to the first sheet)
  cells: initialSheet.cells,
  columnWidths: initialSheet.columnWidths,
  rowHeights: initialSheet.rowHeights,

  frozenRows: 0,
  frozenCols: 0,
  selectedCell: null,
  selectionRange: null,
  editingCell: null,
  editValue: '',
  editTrigger: null,

  // Dirty state tracking
  isDirty: false,

  getColumnWidth: (col: number) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return get().columnWidths.get(col) ?? DEFAULT_COLUMN_WIDTH;
  },

  getRowHeight: (row: number) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return get().rowHeights.get(row) ?? DEFAULT_ROW_HEIGHT;
  },

  setColumnWidth: (col: number, width: number) => {
    set((state) => {
      const newWidths = new Map(state.columnWidths);
      if (width === DEFAULT_COLUMN_WIDTH) {
        newWidths.delete(col);
      } else {
        newWidths.set(col, width);
      }
      return { columnWidths: newWidths, isDirty: true };
    });
  },

  setRowHeight: (row: number, height: number) => {
    set((state) => {
      const newHeights = new Map(state.rowHeights);
      if (height === DEFAULT_ROW_HEIGHT) {
        newHeights.delete(row);
      } else {
        newHeights.set(row, height);
      }
      return { rowHeights: newHeights, isDirty: true };
    });
  },

  getCellValue: (row: number, col: number) => {
    const data = get().cells.get(cellKey(row, col));
    return data?.value ?? '';
  },

  setCellValue: (row: number, col: number, value: string) => {
    set((state) => {
      const newCells = new Map(state.cells);
      const key = cellKey(row, col);
      const existing = state.cells.get(key);
      if (value === '' && !existing?.style) {
        newCells.delete(key);
      } else if (value === '' && existing?.style) {
        newCells.set(key, { value: '', style: existing.style });
      } else {
        newCells.set(key, { ...existing, value });
      }
      return { cells: newCells, isDirty: true };
    });
  },

  setCellValues: (updates) => {
    set((state) => {
      const newCells = new Map(state.cells);
      for (const { row, col, value } of updates) {
        const key = cellKey(row, col);
        const existing = state.cells.get(key);
        if (value === '' && !existing?.style) {
          newCells.delete(key);
        } else {
          newCells.set(key, { ...existing, value });
        }
      }
      return { cells: newCells, isDirty: true };
    });
  },

  getCellData: (row: number, col: number) => {
    return get().cells.get(cellKey(row, col));
  },

  setSelectedCell: (pos: CellPosition | null) => {
    set({ selectedCell: pos, selectionRange: null });
  },

  setSelectionRange: (range: { start: CellPosition; end: CellPosition } | null) => {
    set({ selectionRange: range });
  },

  startEditing: (row: number, col: number, trigger: EditTrigger = null) => {
    const currentValue = get().getCellValue(row, col);
    set({
      editingCell: { row, col },
      editValue: currentValue,
      selectedCell: { row, col },
      editTrigger: trigger,
    });
  },

  updateEditValue: (value: string) => {
    set({ editValue: value });
  },

  commitEdit: () => {
    const { editingCell, editValue, setCellValue } = get();
    if (editingCell) {
      setCellValue(editingCell.row, editingCell.col, editValue);
    }
    set({ editingCell: null, editValue: '', editTrigger: null });
  },

  cancelEdit: () => {
    set({ editingCell: null, editValue: '', editTrigger: null });
  },

  // Sheet actions
  addSheet: () => {
    set((state) => {
      // Save current sheet data first
      const updatedSheets = saveActiveSheetData(state);

      // Create new sheet
      const newSheet = createSheet();

      return {
        sheets: [...updatedSheets, newSheet],
        activeSheetId: newSheet.id,
        cells: newSheet.cells,
        columnWidths: newSheet.columnWidths,
        rowHeights: newSheet.rowHeights,
        // Reset selection/editing state for the new sheet
        selectedCell: null,
        selectionRange: null,
        editingCell: null,
        editValue: '',
        editTrigger: null,
        isDirty: true,
      };
    });
  },

  switchSheet: (sheetId: string) => {
    set((state) => {
      if (sheetId === state.activeSheetId) return state;

      // Save current sheet data
      const updatedSheets = saveActiveSheetData(state);

      // Find the target sheet
      const targetSheet = updatedSheets.find((s) => s.id === sheetId);
      if (!targetSheet) return state;

      return {
        sheets: updatedSheets,
        activeSheetId: sheetId,
        cells: targetSheet.cells,
        columnWidths: targetSheet.columnWidths,
        rowHeights: targetSheet.rowHeights,
        // Reset selection/editing state when switching sheets
        selectedCell: null,
        selectionRange: null,
        editingCell: null,
        editValue: '',
        editTrigger: null,
      };
    });
  },

  renameSheet: (sheetId: string, name: string) => {
    set((state) => ({
      sheets: state.sheets.map((sheet) => (sheet.id === sheetId ? { ...sheet, name } : sheet)),
      isDirty: true,
    }));
  },

  getCellStyle: (row: number, col: number) => {
    const data = get().cells.get(cellKey(row, col));
    return data?.style;
  },

  toggleBold: () => {
    const { selectedCell, cells } = get();
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const existing = cells.get(key);
    const currentBold = existing?.style?.bold ?? false;
    const newCells = new Map(cells);
    newCells.set(key, {
      ...existing,
      value: existing?.value ?? '',
      style: { ...existing?.style, bold: !currentBold },
    });
    set({ cells: newCells, isDirty: true });
  },

  toggleItalic: () => {
    const { selectedCell, cells } = get();
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const existing = cells.get(key);
    const currentItalic = existing?.style?.italic ?? false;
    const newCells = new Map(cells);
    newCells.set(key, {
      ...existing,
      value: existing?.value ?? '',
      style: { ...existing?.style, italic: !currentItalic },
    });
    set({ cells: newCells, isDirty: true });
  },

  toggleUnderline: () => {
    const { selectedCell, cells } = get();
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const existing = cells.get(key);
    const currentUnderline = existing?.style?.underline ?? false;
    const newCells = new Map(cells);
    newCells.set(key, {
      ...existing,
      value: existing?.value ?? '',
      style: { ...existing?.style, underline: !currentUnderline },
    });
    set({ cells: newCells, isDirty: true });
  },

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  setWorkbook: (workbook: Workbook | null) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    set({ workbook });
  },

  updateWorkbook: (workbook: Workbook) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    set({ workbook });
  },

  setCurrentUser: (user: UserInfo | null) => {
    set({ currentUser: user });
  },

  resetWorkbook: () => {
    sheetCounter = 1;
    const freshSheet = createSheet();
    set({
      workbook: null,
      sheets: [freshSheet],
      activeSheetId: freshSheet.id,
      cells: freshSheet.cells,
      columnWidths: freshSheet.columnWidths,
      rowHeights: freshSheet.rowHeights,
      frozenRows: 0,
      frozenCols: 0,
      selectedCell: null,
      selectionRange: null,
      editingCell: null,
      editValue: '',
      editTrigger: null,
      isDirty: false,
    });
  },

  loadCsvData: (cellData: Map<string, CellData>) => {
    set((state) => {
      // Update the active sheet's cells in the sheets array
      const updatedSheets = state.sheets.map((sheet) => {
        if (sheet.id === state.activeSheetId) {
          return { ...sheet, cells: cellData };
        }
        return sheet;
      });

      return {
        cells: cellData,
        sheets: updatedSheets,
        isDirty: false,
      };
    });
  },

  getAllSheetsData: () => {
    const state = get();
    return saveActiveSheetData(state);
  },

  markDirty: () => {
    set({ isDirty: true });
  },

  markClean: () => {
    set({ isDirty: false });
  },

  loadAllSheets: (sheetsData) => {
    if (sheetsData.length === 0) return;

    sheetCounter = 1;
    const newSheets: SheetData[] = sheetsData.map((data) => {
      const sheet = createSheet(data.name);
      return { ...sheet, cells: data.cells };
    });

    const firstSheet = newSheets[0];
    if (!firstSheet) return;
    set({
      sheets: newSheets,
      activeSheetId: firstSheet.id,
      cells: firstSheet.cells,
      columnWidths: firstSheet.columnWidths,
      rowHeights: firstSheet.rowHeights,
      selectedCell: null,
      selectionRange: null,
      editingCell: null,
      editValue: '',
      editTrigger: null,
      isDirty: false,
    });
  },
}));
