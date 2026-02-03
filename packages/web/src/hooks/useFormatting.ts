import { useCallback, useMemo, useEffect } from 'react';
import { create } from 'zustand';
import type {
  CellStyle,
  FontStyle,
  CellBorders,
  Border,
  BorderStyle,
  NumberFormat,
  HorizontalAlign,
  VerticalAlign,
  NumberFormatCategory,
} from '@excel/core';
import {
  mergeCellStyles,
  DEFAULT_CELL_STYLE,
  DEFAULT_FONT_STYLE,
} from '@excel/core';
import { useSpreadsheetStore } from '../store/spreadsheet';

/**
 * Cell position interface
 */
interface CellPosition {
  row: number;
  col: number;
}

/**
 * Selection range interface
 */
interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

/**
 * Formatting store state
 */
interface FormattingState {
  // Cell styles map (row,col -> style)
  cellStyles: Map<string, CellStyle>;

  // Recent colors for quick access
  recentTextColors: string[];
  recentFillColors: string[];

  // Actions
  getCellStyle: (row: number, col: number) => CellStyle | undefined;
  setCellStyle: (row: number, col: number, style: CellStyle) => void;
  updateCellStyle: (row: number, col: number, updates: Partial<CellStyle>) => void;
  addRecentTextColor: (color: string) => void;
  addRecentFillColor: (color: string) => void;
  clearStyles: () => void;
}

/**
 * Generate cell key from row and column
 */
function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Maximum recent colors to track
 */
const MAX_RECENT_COLORS = 10;

/**
 * Zustand store for formatting state
 */
export const useFormattingStore = create<FormattingState>((set, get) => ({
  cellStyles: new Map(),
  recentTextColors: [],
  recentFillColors: [],

  getCellStyle: (row: number, col: number) => {
    return get().cellStyles.get(cellKey(row, col));
  },

  setCellStyle: (row: number, col: number, style: CellStyle) => {
    set((state) => {
      const newStyles = new Map(state.cellStyles);
      newStyles.set(cellKey(row, col), style);
      return { cellStyles: newStyles };
    });
  },

  updateCellStyle: (row: number, col: number, updates: Partial<CellStyle>) => {
    set((state) => {
      const newStyles = new Map(state.cellStyles);
      const key = cellKey(row, col);
      const existing = newStyles.get(key) || {};
      const merged = mergeCellStyles(existing, updates as CellStyle);
      newStyles.set(key, merged);
      return { cellStyles: newStyles };
    });
  },

  addRecentTextColor: (color: string) => {
    set((state) => {
      const colors = state.recentTextColors.filter((c) => c !== color);
      colors.unshift(color);
      return { recentTextColors: colors.slice(0, MAX_RECENT_COLORS) };
    });
  },

  addRecentFillColor: (color: string) => {
    set((state) => {
      const colors = state.recentFillColors.filter((c) => c !== color);
      colors.unshift(color);
      return { recentFillColors: colors.slice(0, MAX_RECENT_COLORS) };
    });
  },

  clearStyles: () => {
    set({
      cellStyles: new Map(),
    });
  },
}));

/**
 * Hook to manage cell formatting
 */
export function useFormatting() {
  const {
    cellStyles,
    recentTextColors,
    recentFillColors,
    getCellStyle,
    setCellStyle,
    updateCellStyle,
    addRecentTextColor,
    addRecentFillColor,
  } = useFormattingStore();

  const { selectedCell, selectionRange } = useSpreadsheetStore();

  /**
   * Get all cells in selection
   */
  const getSelectedCells = useCallback((): CellPosition[] => {
    if (!selectedCell) return [];

    if (selectionRange) {
      const cells: CellPosition[] = [];
      const startRow = Math.min(selectionRange.start.row, selectionRange.end.row);
      const endRow = Math.max(selectionRange.start.row, selectionRange.end.row);
      const startCol = Math.min(selectionRange.start.col, selectionRange.end.col);
      const endCol = Math.max(selectionRange.start.col, selectionRange.end.col);

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          cells.push({ row, col });
        }
      }
      return cells;
    }

    return [selectedCell];
  }, [selectedCell, selectionRange]);

  /**
   * Get the current style of the primary selected cell
   */
  const currentStyle = useMemo((): CellStyle => {
    if (!selectedCell) return DEFAULT_CELL_STYLE;
    return getCellStyle(selectedCell.row, selectedCell.col) || DEFAULT_CELL_STYLE;
  }, [selectedCell, getCellStyle, cellStyles]);

  /**
   * Apply a style update to all selected cells
   */
  const applyStyleToSelection = useCallback(
    (updates: Partial<CellStyle>) => {
      const cells = getSelectedCells();
      cells.forEach(({ row, col }) => {
        updateCellStyle(row, col, updates);
      });
    },
    [getSelectedCells, updateCellStyle]
  );

  /**
   * Toggle bold on selected cells
   */
  const toggleBold = useCallback(() => {
    const isBold = currentStyle.font?.bold ?? false;
    applyStyleToSelection({
      font: { ...currentStyle.font, bold: !isBold },
    });
  }, [currentStyle, applyStyleToSelection]);

  /**
   * Toggle italic on selected cells
   */
  const toggleItalic = useCallback(() => {
    const isItalic = currentStyle.font?.italic ?? false;
    applyStyleToSelection({
      font: { ...currentStyle.font, italic: !isItalic },
    });
  }, [currentStyle, applyStyleToSelection]);

  /**
   * Toggle underline on selected cells
   */
  const toggleUnderline = useCallback(() => {
    const isUnderline = currentStyle.font?.underline ?? false;
    applyStyleToSelection({
      font: { ...currentStyle.font, underline: !isUnderline },
    });
  }, [currentStyle, applyStyleToSelection]);

  /**
   * Toggle strikethrough on selected cells
   */
  const toggleStrikethrough = useCallback(() => {
    const isStrikethrough = currentStyle.font?.strikethrough ?? false;
    applyStyleToSelection({
      font: { ...currentStyle.font, strikethrough: !isStrikethrough },
    });
  }, [currentStyle, applyStyleToSelection]);

  /**
   * Set font family on selected cells
   */
  const setFontFamily = useCallback(
    (family: string) => {
      applyStyleToSelection({
        font: { ...currentStyle.font, family },
      });
    },
    [currentStyle, applyStyleToSelection]
  );

  /**
   * Set font size on selected cells
   */
  const setFontSize = useCallback(
    (size: number) => {
      applyStyleToSelection({
        font: { ...currentStyle.font, size },
      });
    },
    [currentStyle, applyStyleToSelection]
  );

  /**
   * Set text color on selected cells
   */
  const setTextColor = useCallback(
    (color: string) => {
      applyStyleToSelection({
        font: { ...currentStyle.font, color },
      });
      addRecentTextColor(color);
    },
    [currentStyle, applyStyleToSelection, addRecentTextColor]
  );

  /**
   * Set fill color on selected cells
   */
  const setFillColor = useCallback(
    (color: string) => {
      applyStyleToSelection({
        fill: color === 'transparent' ? undefined : color,
      });
      if (color !== 'transparent') {
        addRecentFillColor(color);
      }
    },
    [applyStyleToSelection, addRecentFillColor]
  );

  /**
   * Set horizontal alignment on selected cells
   */
  const setHorizontalAlign = useCallback(
    (align: HorizontalAlign) => {
      applyStyleToSelection({ horizontalAlign: align });
    },
    [applyStyleToSelection]
  );

  /**
   * Set vertical alignment on selected cells
   */
  const setVerticalAlign = useCallback(
    (align: VerticalAlign) => {
      applyStyleToSelection({ verticalAlign: align });
    },
    [applyStyleToSelection]
  );

  /**
   * Set number format on selected cells
   */
  const setNumberFormat = useCallback(
    (format: NumberFormat) => {
      applyStyleToSelection({ numberFormat: format });
    },
    [applyStyleToSelection]
  );

  /**
   * Set borders on selected cells
   */
  const setBorders = useCallback(
    (borders: CellBorders) => {
      applyStyleToSelection({ borders });
    },
    [applyStyleToSelection]
  );

  /**
   * Apply border preset to selection
   */
  const applyBorderPreset = useCallback(
    (preset: 'all' | 'outside' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right', style: BorderStyle = 'thin', color: string = '#000000') => {
      const cells = getSelectedCells();
      if (cells.length === 0) return;

      const border: Border = { style, color };
      const noBorder: Border = { style: 'none', color: '' };

      // Calculate bounds
      const rows = cells.map((c) => c.row);
      const cols = cells.map((c) => c.col);
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      cells.forEach(({ row, col }) => {
        let borders: CellBorders = {};

        switch (preset) {
          case 'all':
            borders = { top: border, right: border, bottom: border, left: border };
            break;
          case 'outside':
            borders = {
              top: row === minRow ? border : noBorder,
              bottom: row === maxRow ? border : noBorder,
              left: col === minCol ? border : noBorder,
              right: col === maxCol ? border : noBorder,
            };
            break;
          case 'inside':
            borders = {
              top: row > minRow ? border : noBorder,
              bottom: row < maxRow ? border : noBorder,
              left: col > minCol ? border : noBorder,
              right: col < maxCol ? border : noBorder,
            };
            break;
          case 'none':
            borders = { top: noBorder, right: noBorder, bottom: noBorder, left: noBorder };
            break;
          case 'top':
            borders = { top: border };
            break;
          case 'bottom':
            borders = { bottom: border };
            break;
          case 'left':
            borders = { left: border };
            break;
          case 'right':
            borders = { right: border };
            break;
        }

        updateCellStyle(row, col, { borders });
      });
    },
    [getSelectedCells, updateCellStyle]
  );

  /**
   * Toggle text wrap on selected cells
   */
  const toggleWrapText = useCallback(() => {
    const isWrapped = currentStyle.wrapText ?? false;
    applyStyleToSelection({ wrapText: !isWrapped });
  }, [currentStyle, applyStyleToSelection]);

  /**
   * Clear all formatting from selected cells
   */
  const clearFormatting = useCallback(() => {
    const cells = getSelectedCells();
    cells.forEach(({ row, col }) => {
      setCellStyle(row, col, {});
    });
  }, [getSelectedCells, setCellStyle]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have a selection and not editing
      if (!selectedCell) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            toggleBold();
            break;
          case 'i':
            e.preventDefault();
            toggleItalic();
            break;
          case 'u':
            e.preventDefault();
            toggleUnderline();
            break;
          case '5':
            e.preventDefault();
            toggleStrikethrough();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, toggleBold, toggleItalic, toggleUnderline, toggleStrikethrough]);

  return {
    // State
    currentStyle,
    recentTextColors,
    recentFillColors,
    cellStyles,

    // Font actions
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrikethrough,
    setFontFamily,
    setFontSize,
    setTextColor,

    // Fill actions
    setFillColor,

    // Alignment actions
    setHorizontalAlign,
    setVerticalAlign,

    // Border actions
    setBorders,
    applyBorderPreset,

    // Number format actions
    setNumberFormat,

    // Other actions
    toggleWrapText,
    clearFormatting,

    // Utility
    getCellStyle,
    getSelectedCells,
    applyStyleToSelection,
  };
}

/**
 * Common fonts list
 */
export const COMMON_FONTS = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Calibri Light',
  'Cambria',
  'Century Gothic',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Impact',
  'Lucida Console',
  'Lucida Sans',
  'Palatino Linotype',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

/**
 * Common font sizes
 */
export const COMMON_FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

/**
 * Number format presets
 */
export const NUMBER_FORMAT_PRESETS: { category: NumberFormatCategory; label: string; formats: { label: string; format: NumberFormat }[] }[] = [
  {
    category: 'general',
    label: 'General',
    formats: [
      { label: 'General', format: { category: 'general', formatString: 'General' } },
    ],
  },
  {
    category: 'number',
    label: 'Number',
    formats: [
      { label: '1234', format: { category: 'number', formatString: '#,##0', decimalPlaces: 0, useThousandsSeparator: true } },
      { label: '1234.10', format: { category: 'number', formatString: '#,##0.00', decimalPlaces: 2, useThousandsSeparator: true } },
      { label: '-1234', format: { category: 'number', formatString: '#,##0;-#,##0', decimalPlaces: 0, negativeFormat: 'minus' } },
      { label: '(1234)', format: { category: 'number', formatString: '#,##0;(#,##0)', decimalPlaces: 0, negativeFormat: 'parentheses' } },
    ],
  },
  {
    category: 'currency',
    label: 'Currency',
    formats: [
      { label: '$1,234', format: { category: 'currency', formatString: '$#,##0', currencySymbol: '$', decimalPlaces: 0 } },
      { label: '$1,234.10', format: { category: 'currency', formatString: '$#,##0.00', currencySymbol: '$', decimalPlaces: 2 } },
      { label: '-$1,234', format: { category: 'currency', formatString: '$#,##0;-$#,##0', currencySymbol: '$', negativeFormat: 'minus' } },
      { label: '($1,234)', format: { category: 'currency', formatString: '$#,##0;($#,##0)', currencySymbol: '$', negativeFormat: 'parentheses' } },
    ],
  },
  {
    category: 'accounting',
    label: 'Accounting',
    formats: [
      { label: '$ 1,234.00', format: { category: 'accounting', formatString: '_($* #,##0.00_)', currencySymbol: '$', decimalPlaces: 2 } },
      { label: '$ 1,234', format: { category: 'accounting', formatString: '_($* #,##0_)', currencySymbol: '$', decimalPlaces: 0 } },
    ],
  },
  {
    category: 'percentage',
    label: 'Percentage',
    formats: [
      { label: '10%', format: { category: 'percentage', formatString: '0%', decimalPlaces: 0 } },
      { label: '10.00%', format: { category: 'percentage', formatString: '0.00%', decimalPlaces: 2 } },
    ],
  },
  {
    category: 'date',
    label: 'Date',
    formats: [
      { label: '3/14/2024', format: { category: 'date', formatString: 'm/d/yyyy' } },
      { label: '14-Mar-24', format: { category: 'date', formatString: 'd-mmm-yy' } },
      { label: 'March 14, 2024', format: { category: 'date', formatString: 'mmmm d, yyyy' } },
      { label: 'Thu, Mar 14', format: { category: 'date', formatString: 'ddd, mmm d' } },
    ],
  },
  {
    category: 'time',
    label: 'Time',
    formats: [
      { label: '1:30 PM', format: { category: 'time', formatString: 'h:mm AM/PM' } },
      { label: '1:30:55 PM', format: { category: 'time', formatString: 'h:mm:ss AM/PM' } },
      { label: '13:30', format: { category: 'time', formatString: 'h:mm' } },
      { label: '13:30:55', format: { category: 'time', formatString: 'h:mm:ss' } },
    ],
  },
  {
    category: 'fraction',
    label: 'Fraction',
    formats: [
      { label: '1/4', format: { category: 'fraction', formatString: '# ?/?' } },
      { label: '21/25', format: { category: 'fraction', formatString: '# ??/??' } },
    ],
  },
  {
    category: 'scientific',
    label: 'Scientific',
    formats: [
      { label: '1.23E+03', format: { category: 'scientific', formatString: '0.00E+00' } },
    ],
  },
  {
    category: 'text',
    label: 'Text',
    formats: [
      { label: 'Text', format: { category: 'text', formatString: '@' } },
    ],
  },
];

export type { CellPosition, SelectionRange };
