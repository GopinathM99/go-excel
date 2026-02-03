import { create } from 'zustand';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT } from '@excel/shared';
import type { Workbook } from '@excel/core';

interface CellPosition {
  row: number;
  col: number;
}

interface CellData {
  value: string;
  formula?: string;
}

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface SpreadsheetState {
  // Workbook (for version history)
  workbook: Workbook | null;

  // Current user
  currentUser: UserInfo | null;
  // Sheet dimensions
  rowCount: number;
  columnCount: number;

  // Cell data
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

  // Actions
  getColumnWidth: (col: number) => number;
  getRowHeight: (row: number) => number;
  setColumnWidth: (col: number, width: number) => void;
  setRowHeight: (row: number, height: number) => void;
  getCellValue: (row: number, col: number) => string;
  setCellValue: (row: number, col: number, value: string) => void;
  getCellData: (row: number, col: number) => CellData | undefined;
  setSelectedCell: (pos: CellPosition | null) => void;
  setSelectionRange: (range: { start: CellPosition; end: CellPosition } | null) => void;
  startEditing: (row: number, col: number) => void;
  updateEditValue: (value: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;

  // Workbook actions (for version history)
  setWorkbook: (workbook: Workbook | null) => void;
  updateWorkbook: (workbook: Workbook) => void;
  setCurrentUser: (user: UserInfo | null) => void;
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  // Workbook and user
  workbook: null,
  currentUser: null,

  // Sheet dimensions
  rowCount: 100000, // 100k rows
  columnCount: 1000, // 1k columns
  cells: new Map(),
  columnWidths: new Map(),
  rowHeights: new Map(),
  frozenRows: 0,
  frozenCols: 0,
  selectedCell: null,
  selectionRange: null,
  editingCell: null,
  editValue: '',

  getColumnWidth: (col: number) => {
    return get().columnWidths.get(col) ?? DEFAULT_COLUMN_WIDTH;
  },

  getRowHeight: (row: number) => {
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
      return { columnWidths: newWidths };
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
      return { rowHeights: newHeights };
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
      if (value === '') {
        newCells.delete(key);
      } else {
        newCells.set(key, { value });
      }
      return { cells: newCells };
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

  startEditing: (row: number, col: number) => {
    const currentValue = get().getCellValue(row, col);
    set({
      editingCell: { row, col },
      editValue: currentValue,
      selectedCell: { row, col },
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
    set({ editingCell: null, editValue: '' });
  },

  cancelEdit: () => {
    set({ editingCell: null, editValue: '' });
  },

  setWorkbook: (workbook: Workbook | null) => {
    set({ workbook });
  },

  updateWorkbook: (workbook: Workbook) => {
    set({ workbook });
  },

  setCurrentUser: (user: UserInfo | null) => {
    set({ currentUser: user });
  },
}));
