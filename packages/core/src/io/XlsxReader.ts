/**
 * XLSX Import Implementation
 *
 * Reads Excel XLSX files and converts them to our internal Workbook model.
 * Uses ExcelJS for parsing XLSX files.
 */

import ExcelJS from 'exceljs';
import type { Workbook, WorkbookProperties, ThemeColors } from '../models/Workbook';
import type { Sheet, MergedRegion, FrozenPanes } from '../models/Sheet';
import type { Cell, CellContent } from '../models/Cell';
import type { CellAddress } from '../models/CellAddress';
import type {
  CellStyle,
  FontStyle,
  CellBorders,
  Border,
  BorderStyle,
  HorizontalAlign,
  VerticalAlign,
  NumberFormat,
  NumberFormatCategory,
  CellFill,
  FillPattern,
  UnderlineStyle,
} from '../models/CellStyle';
import type { CellValue } from '../models/CellValue';
import {
  stringValue,
  numberValue,
  booleanValue,
  errorValue,
  emptyValue,
  CellErrorCode,
} from '../models/CellValue';
import { cellAddressKey } from '../models/CellAddress';
import { DEFAULT_THEME_COLORS } from '../models/Workbook';
import { generateId } from '@excel/shared';

// Extended types for ExcelJS properties not fully typed in the library
interface ExtendedColor extends Partial<ExcelJS.Color> {
  tint?: number;
  indexed?: number;
}

interface ExtendedRow extends ExcelJS.Row {
  style?: Partial<ExcelJS.Style>;
}

interface ExtendedCell extends ExcelJS.Cell {
  sharedFormula?: string;
}

interface ExtendedDefinedName {
  name: string;
  ranges?: string[];
  localSheetId?: number;
}

/**
 * Error thrown when XLSX import fails
 */
export class XlsxImportError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'XlsxImportError';
  }
}

/**
 * Options for XLSX import
 */
export interface XlsxImportOptions {
  /** Whether to parse formulas or just use cached values */
  parseFormulas?: boolean;
  /** Whether to parse styles */
  parseStyles?: boolean;
  /** Whether to parse merged cells */
  parseMergedCells?: boolean;
  /** Specific sheet names to import (imports all if not specified) */
  sheetNames?: string[];
  /** Maximum number of rows to import per sheet (for large files) */
  maxRows?: number;
  /** Maximum number of columns to import per sheet */
  maxColumns?: number;
}

const DEFAULT_OPTIONS: Required<XlsxImportOptions> = {
  parseFormulas: true,
  parseStyles: true,
  parseMergedCells: true,
  sheetNames: [],
  maxRows: Infinity,
  maxColumns: Infinity,
};

/**
 * Reads an XLSX file from a buffer and returns a Workbook
 *
 * @param buffer - The file content as ArrayBuffer or Buffer
 * @param options - Import options
 * @returns The parsed Workbook
 * @throws XlsxImportError if the file cannot be parsed
 */
export async function readXlsx(
  buffer: ArrayBuffer | Buffer,
  options: XlsxImportOptions = {}
): Promise<Workbook> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const excelWorkbook = new ExcelJS.Workbook();

    // Convert ArrayBuffer to Buffer if needed
    const nodeBuffer = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;

    await excelWorkbook.xlsx.load(nodeBuffer);

    return convertWorkbook(excelWorkbook, opts);
  } catch (error) {
    if (error instanceof XlsxImportError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error reading XLSX file';
    throw new XlsxImportError(`Failed to read XLSX file: ${message}`, error as Error);
  }
}

/**
 * Reads an XLSX file from a file path and returns a Workbook
 *
 * @param filePath - Path to the XLSX file
 * @param options - Import options
 * @returns The parsed Workbook
 * @throws XlsxImportError if the file cannot be read or parsed
 */
export async function readXlsxFromFile(
  filePath: string,
  options: XlsxImportOptions = {}
): Promise<Workbook> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const excelWorkbook = new ExcelJS.Workbook();
    await excelWorkbook.xlsx.readFile(filePath);

    return convertWorkbook(excelWorkbook, opts);
  } catch (error) {
    if (error instanceof XlsxImportError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error reading XLSX file';
    throw new XlsxImportError(`Failed to read XLSX file from path: ${message}`, error as Error, {
      filePath,
    });
  }
}

/**
 * Converts an ExcelJS workbook to our internal Workbook model
 */
function convertWorkbook(
  excelWorkbook: ExcelJS.Workbook,
  options: Required<XlsxImportOptions>
): Workbook {
  const sheets: Sheet[] = [];
  let activeSheetIndex = 0;

  // Get the active view to determine active sheet
  const views = excelWorkbook.views;
  if (views && views.length > 0) {
    activeSheetIndex = views[0]?.activeTab ?? 0;
  }

  // Filter sheets if specific names are provided
  const sheetsToImport =
    options.sheetNames.length > 0
      ? excelWorkbook.worksheets.filter((ws) => options.sheetNames.includes(ws.name))
      : excelWorkbook.worksheets;

  for (const excelSheet of sheetsToImport) {
    try {
      const sheet = convertSheet(excelSheet, options);
      sheets.push(sheet);
    } catch (error) {
      // Log warning but continue with other sheets
      console.warn(`Warning: Failed to import sheet "${excelSheet.name}":`, error);
    }
  }

  if (sheets.length === 0) {
    throw new XlsxImportError('No valid sheets found in workbook');
  }

  // Ensure activeSheetIndex is valid
  activeSheetIndex = Math.min(activeSheetIndex, sheets.length - 1);

  // Extract workbook properties
  const properties = convertWorkbookProperties(excelWorkbook);

  // Extract theme colors (use defaults if not available)
  const themeColors = extractThemeColors(excelWorkbook);

  const workbook: Workbook = {
    id: generateId(),
    name: extractWorkbookName(excelWorkbook),
    sheets,
    activeSheetIndex,
    namedRanges: convertNamedRanges(excelWorkbook),
    properties,
    themeColors,
    styles: [], // Will be populated by style manager
    calcMode: 'auto',
    isDirty: false,
  };

  return workbook;
}

/**
 * Converts an ExcelJS worksheet to our internal Sheet model
 */
function convertSheet(
  excelSheet: ExcelJS.Worksheet,
  options: Required<XlsxImportOptions>
): Sheet {
  const cells = new Map<string, Cell>();
  const columnWidths = new Map<number, number>();
  const rowHeights = new Map<number, number>();
  const hiddenColumns = new Set<number>();
  const hiddenRows = new Set<number>();
  const mergedRegions: MergedRegion[] = [];
  const columnStyles = new Map<number, CellStyle>();
  const rowStyles = new Map<number, CellStyle>();

  // Process merged cells
  if (options.parseMergedCells) {
    for (const mergeRange of excelSheet.model.merges ?? []) {
      const merged = parseMergeRange(mergeRange);
      if (merged) {
        mergedRegions.push(merged);
      }
    }
  }

  // Process columns (columns can be null for empty sheets)
  if (excelSheet.columns) {
    excelSheet.columns.forEach((column, index) => {
      if (column.width !== undefined && column.width !== 8.43) {
        // 8.43 is default width
        // ExcelJS width is in characters, convert to pixels (approx 7.5 pixels per character)
        columnWidths.set(index, Math.round(column.width * 7.5));
      }
      if (column.hidden) {
        hiddenColumns.add(index);
      }
      if (options.parseStyles && column.style) {
        const style = convertCellStyle(column.style as ExcelJS.Style);
        if (Object.keys(style).length > 0) {
          columnStyles.set(index, style);
        }
      }
    });
  }

  // Process rows and cells
  excelSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowIndex = rowNumber - 1; // Convert to 0-based
    const extendedRow = row as ExtendedRow;

    if (rowIndex >= options.maxRows) {
      return;
    }

    // Row height
    if (row.height !== undefined && row.height !== 15) {
      // 15 is default height
      rowHeights.set(rowIndex, row.height);
    }

    // Row hidden
    if (row.hidden) {
      hiddenRows.add(rowIndex);
    }

    // Row style
    if (options.parseStyles && extendedRow.style) {
      const style = convertCellStyle(extendedRow.style as ExcelJS.Style);
      if (Object.keys(style).length > 0) {
        rowStyles.set(rowIndex, style);
      }
    }

    // Process cells in the row
    row.eachCell({ includeEmpty: false }, (excelCell, colNumber) => {
      const colIndex = colNumber - 1; // Convert to 0-based

      if (colIndex >= options.maxColumns) {
        return;
      }

      const address: CellAddress = { row: rowIndex, col: colIndex };
      const cell = convertCell(excelCell as ExtendedCell, address, options, mergedRegions);
      cells.set(cellAddressKey(address), cell);
    });
  });

  // Process frozen panes
  let frozenPanes: FrozenPanes | undefined;
  const sheetViews = excelSheet.views;
  if (sheetViews && sheetViews.length > 0) {
    const view = sheetViews[0];
    if (view?.state === 'frozen' && (view.xSplit || view.ySplit)) {
      frozenPanes = {
        rows: view.ySplit ?? 0,
        columns: view.xSplit ?? 0,
      };
    }
  }

  // Get zoom level
  let zoom = 100;
  if (sheetViews && sheetViews.length > 0 && sheetViews[0]?.zoomScale) {
    zoom = sheetViews[0].zoomScale;
  }

  // Check gridlines visibility
  let showGridlines = true;
  if (sheetViews && sheetViews.length > 0 && sheetViews[0]?.showGridLines !== undefined) {
    showGridlines = sheetViews[0].showGridLines;
  }

  // Check row/column headers visibility
  let showHeaders = true;
  if (sheetViews && sheetViews.length > 0 && sheetViews[0]?.showRowColHeaders !== undefined) {
    showHeaders = sheetViews[0].showRowColHeaders;
  }

  const sheet: Sheet = {
    id: generateId(),
    name: excelSheet.name,
    cells,
    columnWidths,
    rowHeights,
    hiddenColumns,
    hiddenRows,
    mergedRegions,
    frozenPanes,
    conditionalFormats: [],
    charts: [],
    columnStyles,
    rowStyles,
    hidden: excelSheet.state === 'hidden' || excelSheet.state === 'veryHidden',
    tabColor: excelSheet.properties?.tabColor
      ? convertColor(excelSheet.properties.tabColor)
      : undefined,
    zoom,
    showGridlines,
    showHeaders,
  };

  return sheet;
}

/**
 * Converts an ExcelJS cell to our internal Cell model
 */
function convertCell(
  excelCell: ExtendedCell,
  address: CellAddress,
  options: Required<XlsxImportOptions>,
  mergedRegions: MergedRegion[]
): Cell {
  // Determine raw content
  let raw = '';
  let isFormula = false;

  if (
    options.parseFormulas &&
    excelCell.formula &&
    typeof excelCell.formula === 'string'
  ) {
    raw = '=' + excelCell.formula;
    isFormula = true;
  } else if (excelCell.sharedFormula && options.parseFormulas) {
    // Handle shared formulas
    raw = '=' + excelCell.sharedFormula;
    isFormula = true;
  } else {
    raw = getCellRawValue(excelCell);
  }

  const content: CellContent = { raw, isFormula };

  // Convert cell value
  const value = convertCellValue(excelCell);

  // Convert cell style
  const style = options.parseStyles ? convertCellStyle(excelCell.style as ExcelJS.Style) : undefined;

  // Check if cell is part of a merged region
  let mergedWith: CellAddress | undefined;
  for (const region of mergedRegions) {
    if (
      address.row >= region.range.start.row &&
      address.row <= region.range.end.row &&
      address.col >= region.range.start.col &&
      address.col <= region.range.end.col
    ) {
      // If not the top-left cell, mark as merged
      if (address.row !== region.range.start.row || address.col !== region.range.start.col) {
        mergedWith = region.range.start;
      }
      break;
    }
  }

  const cell: Cell = {
    address,
    content,
    value,
    style,
    mergedWith,
  };

  return cell;
}

/**
 * Gets the raw string value from a cell for content.raw
 */
function getCellRawValue(excelCell: ExcelJS.Cell): string {
  const cellValue = excelCell.value;

  if (cellValue === null || cellValue === undefined) {
    return '';
  }

  if (typeof cellValue === 'string') {
    return cellValue;
  }

  if (typeof cellValue === 'number') {
    return cellValue.toString();
  }

  if (typeof cellValue === 'boolean') {
    return cellValue ? 'TRUE' : 'FALSE';
  }

  if (cellValue instanceof Date) {
    return cellValue.toISOString();
  }

  // Handle rich text
  if (typeof cellValue === 'object' && 'richText' in cellValue) {
    const richText = cellValue as ExcelJS.CellRichTextValue;
    return richText.richText.map((rt) => rt.text).join('');
  }

  // Handle hyperlink
  if (typeof cellValue === 'object' && 'hyperlink' in cellValue) {
    const hyperlink = cellValue as ExcelJS.CellHyperlinkValue;
    return hyperlink.text ?? hyperlink.hyperlink ?? '';
  }

  // Handle formula result
  if (typeof cellValue === 'object' && 'formula' in cellValue) {
    const formulaValue = cellValue as ExcelJS.CellFormulaValue;
    if (formulaValue.result !== undefined) {
      if (typeof formulaValue.result === 'object' && 'error' in formulaValue.result) {
        return (formulaValue.result as { error: string }).error;
      }
      return String(formulaValue.result);
    }
    return '=' + formulaValue.formula;
  }

  // Handle shared formula
  if (typeof cellValue === 'object' && 'sharedFormula' in cellValue) {
    const sharedFormula = cellValue as ExcelJS.CellSharedFormulaValue;
    if (sharedFormula.result !== undefined) {
      return String(sharedFormula.result);
    }
    return '';
  }

  // Handle error
  if (typeof cellValue === 'object' && 'error' in cellValue) {
    return (cellValue as { error: string }).error;
  }

  return String(cellValue);
}

/**
 * Converts an ExcelJS cell value to our internal CellValue type
 */
function convertCellValue(excelCell: ExcelJS.Cell): CellValue {
  const cellValue = excelCell.value;

  if (cellValue === null || cellValue === undefined) {
    return emptyValue();
  }

  if (typeof cellValue === 'string') {
    return cellValue === '' ? emptyValue() : stringValue(cellValue);
  }

  if (typeof cellValue === 'number') {
    return numberValue(cellValue);
  }

  if (typeof cellValue === 'boolean') {
    return booleanValue(cellValue);
  }

  if (cellValue instanceof Date) {
    // Store dates as numbers (Excel serial date) for now
    // The number format will handle display
    const excelDate = dateToExcelSerial(cellValue);
    return numberValue(excelDate);
  }

  // Handle rich text
  if (typeof cellValue === 'object' && 'richText' in cellValue) {
    const richText = cellValue as ExcelJS.CellRichTextValue;
    const text = richText.richText.map((rt) => rt.text).join('');
    return stringValue(text);
  }

  // Handle hyperlink
  if (typeof cellValue === 'object' && 'hyperlink' in cellValue) {
    const hyperlink = cellValue as ExcelJS.CellHyperlinkValue;
    return stringValue(hyperlink.text ?? hyperlink.hyperlink ?? '');
  }

  // Handle formula result
  if (typeof cellValue === 'object' && 'formula' in cellValue) {
    const formulaValue = cellValue as ExcelJS.CellFormulaValue;
    return convertFormulaResult(formulaValue.result);
  }

  // Handle shared formula
  if (typeof cellValue === 'object' && 'sharedFormula' in cellValue) {
    const sharedFormula = cellValue as ExcelJS.CellSharedFormulaValue;
    return convertFormulaResult(sharedFormula.result);
  }

  // Handle error
  if (typeof cellValue === 'object' && 'error' in cellValue) {
    const errorObj = cellValue as { error: string };
    return convertErrorValue(errorObj.error);
  }

  return stringValue(String(cellValue));
}

/**
 * Converts a formula result to CellValue
 */
function convertFormulaResult(
  result: ExcelJS.CellFormulaValue['result']
): CellValue {
  if (result === undefined || result === null) {
    return emptyValue();
  }

  if (typeof result === 'string') {
    return stringValue(result);
  }

  if (typeof result === 'number') {
    return numberValue(result);
  }

  if (typeof result === 'boolean') {
    return booleanValue(result);
  }

  if (result instanceof Date) {
    return numberValue(dateToExcelSerial(result));
  }

  // Handle error result
  if (typeof result === 'object' && 'error' in result) {
    return convertErrorValue((result as { error: string }).error);
  }

  return stringValue(String(result));
}

/**
 * Converts an Excel error string to CellValue
 */
function convertErrorValue(errorStr: string): CellValue {
  const errorMap: Record<string, CellErrorCode> = {
    '#DIV/0!': CellErrorCode.DIV_ZERO,
    '#NAME?': CellErrorCode.NAME,
    '#N/A': CellErrorCode.NA,
    '#NULL!': CellErrorCode.NULL,
    '#NUM!': CellErrorCode.NUM,
    '#REF!': CellErrorCode.REF,
    '#VALUE!': CellErrorCode.VALUE,
    '#SPILL!': CellErrorCode.SPILL,
    '#CALC!': CellErrorCode.CALC,
  };

  const code = errorMap[errorStr] ?? CellErrorCode.VALUE;
  return errorValue(code, errorStr);
}

/**
 * Converts an ExcelJS style to our internal CellStyle
 */
function convertCellStyle(excelStyle: ExcelJS.Style): CellStyle {
  const style: CellStyle = {};

  // Font
  if (excelStyle.font) {
    style.font = convertFont(excelStyle.font);
  }

  // Fill
  if (excelStyle.fill) {
    const fill = convertFill(excelStyle.fill);
    if (fill) {
      style.fill = fill;
    }
  }

  // Borders
  if (excelStyle.border) {
    const borders = convertBorders(excelStyle.border);
    if (Object.keys(borders).length > 0) {
      style.borders = borders;
    }
  }

  // Alignment
  if (excelStyle.alignment) {
    if (excelStyle.alignment.horizontal) {
      style.horizontalAlign = mapHorizontalAlign(excelStyle.alignment.horizontal);
    }
    if (excelStyle.alignment.vertical) {
      style.verticalAlign = mapVerticalAlign(excelStyle.alignment.vertical);
    }
    if (excelStyle.alignment.wrapText !== undefined) {
      style.wrapText = excelStyle.alignment.wrapText;
    }
    if (excelStyle.alignment.textRotation !== undefined) {
      // textRotation can be number or 'vertical' - convert 'vertical' to 255
      style.textRotation = typeof excelStyle.alignment.textRotation === 'number'
        ? excelStyle.alignment.textRotation
        : 255;
    }
    if (excelStyle.alignment.indent !== undefined) {
      style.indent = excelStyle.alignment.indent;
    }
    if (excelStyle.alignment.shrinkToFit !== undefined) {
      style.shrinkToFit = excelStyle.alignment.shrinkToFit;
    }
    if (excelStyle.alignment.readingOrder !== undefined) {
      const ro = excelStyle.alignment.readingOrder;
      if (ro === 0 || ro === 1 || ro === 2) {
        style.readingOrder = ro;
      }
    }
  }

  // Number format
  if (excelStyle.numFmt) {
    style.numberFormat = parseNumberFormat(excelStyle.numFmt);
  }

  // Protection
  if (excelStyle.protection) {
    style.protection = {
      locked: excelStyle.protection.locked,
      hidden: excelStyle.protection.hidden,
    };
  }

  return style;
}

/**
 * Converts an ExcelJS font to our FontStyle
 */
function convertFont(excelFont: Partial<ExcelJS.Font>): FontStyle {
  const font: FontStyle = {};

  if (excelFont.name) {
    font.family = excelFont.name;
  }

  if (excelFont.size) {
    font.size = excelFont.size;
  }

  if (excelFont.color) {
    const color = convertColor(excelFont.color);
    if (color) {
      font.color = color;
    }
  }

  if (excelFont.bold !== undefined) {
    font.bold = excelFont.bold;
  }

  if (excelFont.italic !== undefined) {
    font.italic = excelFont.italic;
  }

  if (excelFont.underline !== undefined) {
    if (typeof excelFont.underline === 'boolean') {
      font.underline = excelFont.underline;
    } else {
      font.underline = mapUnderlineStyle(excelFont.underline);
    }
  }

  if (excelFont.strike !== undefined) {
    font.strikethrough = excelFont.strike;
  }

  if (excelFont.vertAlign === 'superscript') {
    font.superscript = true;
  } else if (excelFont.vertAlign === 'subscript') {
    font.subscript = true;
  }

  if (excelFont.outline !== undefined) {
    font.outline = excelFont.outline;
  }

  return font;
}

/**
 * Converts an ExcelJS fill to our fill type
 */
function convertFill(
  excelFill: ExcelJS.Fill
): string | CellFill | undefined {
  if (excelFill.type === 'pattern') {
    const patternFill = excelFill as ExcelJS.FillPattern;

    // Map pattern type
    const pattern = mapFillPattern(patternFill.pattern);

    // For solid fill, just return the color string for simplicity
    if (pattern === 'solid' && patternFill.fgColor) {
      const color = convertColor(patternFill.fgColor);
      if (color) {
        return color;
      }
    }

    // For pattern fills, return the full CellFill object
    const cellFill: CellFill = {
      pattern,
      foregroundColor: patternFill.fgColor
        ? convertColor(patternFill.fgColor)
        : undefined,
      backgroundColor: patternFill.bgColor
        ? convertColor(patternFill.bgColor)
        : undefined,
    };

    return cellFill;
  }

  if (excelFill.type === 'gradient') {
    // Gradient fills - extract the first color for simplicity
    const gradientFill = excelFill as ExcelJS.FillGradientPath | ExcelJS.FillGradientAngle;
    if (gradientFill.stops && gradientFill.stops.length > 0) {
      return convertColor(gradientFill.stops[0]!.color);
    }
  }

  return undefined;
}

/**
 * Maps ExcelJS fill pattern to our FillPattern type
 */
function mapFillPattern(pattern: ExcelJS.FillPatterns): FillPattern {
  const patternMap: Record<string, FillPattern> = {
    none: 'none',
    solid: 'solid',
    darkGray: 'darkGray',
    mediumGray: 'mediumGray',
    lightGray: 'lightGray',
    gray125: 'gray125',
    gray0625: 'gray0625',
    darkHorizontal: 'darkHorizontal',
    darkVertical: 'darkVertical',
    darkDown: 'darkDown',
    darkUp: 'darkUp',
    darkGrid: 'darkGrid',
    darkTrellis: 'darkTrellis',
    lightHorizontal: 'lightHorizontal',
    lightVertical: 'lightVertical',
    lightDown: 'lightDown',
    lightUp: 'lightUp',
    lightGrid: 'lightGrid',
    lightTrellis: 'lightTrellis',
  };

  return patternMap[pattern] ?? 'solid';
}

/**
 * Maps ExcelJS underline style to our UnderlineStyle
 */
function mapUnderlineStyle(
  underline: string
): UnderlineStyle {
  const underlineMap: Record<string, UnderlineStyle> = {
    single: 'single',
    double: 'double',
    singleAccounting: 'singleAccounting',
    doubleAccounting: 'doubleAccounting',
  };
  return underlineMap[underline] ?? 'single';
}

/**
 * Converts an ExcelJS border set to our CellBorders
 */
function convertBorders(excelBorder: Partial<ExcelJS.Borders>): CellBorders {
  const borders: CellBorders = {};

  if (excelBorder.top) {
    borders.top = convertBorder(excelBorder.top);
  }
  if (excelBorder.right) {
    borders.right = convertBorder(excelBorder.right);
  }
  if (excelBorder.bottom) {
    borders.bottom = convertBorder(excelBorder.bottom);
  }
  if (excelBorder.left) {
    borders.left = convertBorder(excelBorder.left);
  }

  return borders;
}

/**
 * Converts a single ExcelJS border to our Border type
 */
function convertBorder(excelBorder: Partial<ExcelJS.Border>): Border | undefined {
  if (!excelBorder.style) {
    return undefined;
  }

  // Check for 'none' style
  const borderStyle = excelBorder.style as string;
  if (borderStyle === 'none') {
    return undefined;
  }

  const styleMap: Record<string, BorderStyle> = {
    thin: 'thin',
    medium: 'medium',
    thick: 'thick',
    dotted: 'dotted',
    dashed: 'dashed',
    double: 'double',
    hair: 'thin',
    mediumDashed: 'dashed',
    dashDot: 'dashed',
    mediumDashDot: 'dashed',
    dashDotDot: 'dashed',
    mediumDashDotDot: 'dashed',
    slantDashDot: 'dashed',
  };

  return {
    style: styleMap[excelBorder.style] ?? 'thin',
    color: excelBorder.color ? convertColor(excelBorder.color) ?? '#000000' : '#000000',
  };
}

/**
 * Converts an ExcelJS color to a hex color string
 */
function convertColor(color: Partial<ExcelJS.Color>): string | undefined {
  if (!color) {
    return undefined;
  }

  // Cast to extended color type for additional properties
  const extColor = color as ExtendedColor;

  // ARGB color
  if (extColor.argb) {
    // ARGB format: AARRGGBB
    const argb = extColor.argb;
    if (argb.length === 8) {
      // Skip alpha, take RGB
      return '#' + argb.substring(2);
    }
    return '#' + argb;
  }

  // Theme color (map to defaults)
  if (extColor.theme !== undefined) {
    const themeColors: string[] = [
      DEFAULT_THEME_COLORS.light1, // 0
      DEFAULT_THEME_COLORS.dark1, // 1
      DEFAULT_THEME_COLORS.light2, // 2
      DEFAULT_THEME_COLORS.dark2, // 3
      DEFAULT_THEME_COLORS.accent1, // 4
      DEFAULT_THEME_COLORS.accent2, // 5
      DEFAULT_THEME_COLORS.accent3, // 6
      DEFAULT_THEME_COLORS.accent4, // 7
      DEFAULT_THEME_COLORS.accent5, // 8
      DEFAULT_THEME_COLORS.accent6, // 9
    ];

    let baseColor = themeColors[extColor.theme] ?? '#000000';

    // Apply tint if present
    if (extColor.tint !== undefined && extColor.tint !== 0) {
      baseColor = applyTint(baseColor, extColor.tint);
    }

    return baseColor;
  }

  // Indexed color (simplified mapping)
  if (extColor.indexed !== undefined) {
    return getIndexedColor(extColor.indexed);
  }

  return undefined;
}

/**
 * Applies a tint value to a hex color
 */
function applyTint(hexColor: string, tint: number): string {
  // Parse hex color
  const hex = hexColor.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  if (tint > 0) {
    // Lighten
    r = Math.round(r + (255 - r) * tint);
    g = Math.round(g + (255 - g) * tint);
    b = Math.round(b + (255 - b) * tint);
  } else {
    // Darken
    r = Math.round(r * (1 + tint));
    g = Math.round(g * (1 + tint));
    b = Math.round(b * (1 + tint));
  }

  // Clamp values
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Gets a color from the standard indexed color palette
 */
function getIndexedColor(index: number): string {
  // Standard Excel indexed colors (partial list)
  const indexedColors: Record<number, string> = {
    0: '#000000', // Black
    1: '#FFFFFF', // White
    2: '#FF0000', // Red
    3: '#00FF00', // Green
    4: '#0000FF', // Blue
    5: '#FFFF00', // Yellow
    6: '#FF00FF', // Magenta
    7: '#00FFFF', // Cyan
    8: '#000000', // Black
    9: '#FFFFFF', // White
    10: '#FF0000', // Red
    11: '#00FF00', // Green
    12: '#0000FF', // Blue
    13: '#FFFF00', // Yellow
    14: '#FF00FF', // Magenta
    15: '#00FFFF', // Cyan
    16: '#800000', // Dark Red
    17: '#008000', // Dark Green
    18: '#000080', // Dark Blue
    19: '#808000', // Olive
    20: '#800080', // Purple
    21: '#008080', // Teal
    22: '#C0C0C0', // Silver
    23: '#808080', // Gray
    64: '#000000', // System foreground (black)
    65: '#FFFFFF', // System background (white)
  };

  return indexedColors[index] ?? '#000000';
}

/**
 * Maps ExcelJS horizontal alignment to our type
 */
function mapHorizontalAlign(align: ExcelJS.Alignment['horizontal']): HorizontalAlign {
  const alignMap: Record<string, HorizontalAlign> = {
    left: 'left',
    center: 'center',
    right: 'right',
    justify: 'justify',
    fill: 'fill',
    centerContinuous: 'centerContinuous',
    distributed: 'distributed',
  };
  return alignMap[align ?? ''] ?? 'left';
}

/**
 * Maps ExcelJS vertical alignment to our type
 */
function mapVerticalAlign(align: ExcelJS.Alignment['vertical']): VerticalAlign {
  const alignMap: Record<string, VerticalAlign> = {
    top: 'top',
    middle: 'middle',
    bottom: 'bottom',
    justify: 'justify',
    distributed: 'distributed',
  };
  return alignMap[align ?? ''] ?? 'bottom';
}

/**
 * Parses a number format string into a NumberFormat object
 */
function parseNumberFormat(formatString: string): NumberFormat {
  // Determine category from format string
  const category = detectNumberFormatCategory(formatString);

  const format: NumberFormat = {
    category,
    formatString,
  };

  // Extract additional properties based on category
  if (category === 'currency' || category === 'accounting') {
    // Try to extract currency symbol
    const currencyMatch = formatString.match(/[$\u00A3\u00A5\u20AC]/);
    if (currencyMatch) {
      format.currencySymbol = currencyMatch[0];
    }
  }

  if (category === 'number' || category === 'currency' || category === 'percentage') {
    // Count decimal places
    const decimalMatch = formatString.match(/\.([0#]+)/);
    if (decimalMatch) {
      format.decimalPlaces = decimalMatch[1]!.length;
    }

    // Check for thousands separator
    format.useThousandsSeparator = formatString.includes(',');
  }

  return format;
}

/**
 * Detects the category of a number format
 */
function detectNumberFormatCategory(formatString: string): NumberFormatCategory {
  const lower = formatString.toLowerCase();

  if (lower === 'general' || lower === '') {
    return 'general';
  }

  if (lower === '@') {
    return 'text';
  }

  if (lower.includes('%')) {
    return 'percentage';
  }

  if (lower.includes('e+') || lower.includes('e-')) {
    return 'scientific';
  }

  // Check for date/time patterns
  if (
    lower.includes('y') ||
    lower.includes('m') ||
    lower.includes('d') ||
    lower.includes('h') ||
    lower.includes('s')
  ) {
    // Distinguish date vs time
    if (lower.includes('y') || lower.includes('d')) {
      return 'date';
    }
    if (lower.includes('h') || lower.includes('s')) {
      return 'time';
    }
  }

  // Check for currency/accounting
  if (
    formatString.includes('$') ||
    formatString.includes('\u00A3') || // Pound
    formatString.includes('\u00A5') || // Yen
    formatString.includes('\u20AC') // Euro
  ) {
    if (formatString.includes('_') || formatString.includes('*')) {
      return 'accounting';
    }
    return 'currency';
  }

  // Check for fractions
  if (formatString.includes('/') && !formatString.includes(':')) {
    return 'fraction';
  }

  // Check for number patterns
  if (formatString.includes('#') || formatString.includes('0')) {
    return 'number';
  }

  return 'custom';
}

/**
 * Parses a merge range string into a MergedRegion
 */
function parseMergeRange(mergeRange: string): MergedRegion | null {
  // Format: "A1:B2"
  const match = mergeRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match || !match[1] || !match[2] || !match[3] || !match[4]) {
    return null;
  }

  const startCol = columnLabelToIndex(match[1]);
  const startRow = parseInt(match[2], 10) - 1;
  const endCol = columnLabelToIndex(match[3]);
  const endRow = parseInt(match[4], 10) - 1;

  return {
    range: {
      start: { row: startRow, col: startCol },
      end: { row: endRow, col: endCol },
    },
  };
}

/**
 * Converts column label to index (A=0, B=1, ..., Z=25, AA=26, ...)
 */
function columnLabelToIndex(label: string): number {
  let index = 0;
  const upper = label.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }

  return index - 1;
}

/**
 * Converts a JavaScript Date to Excel serial date number
 */
function dateToExcelSerial(date: Date): number {
  // Excel epoch is December 30, 1899
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const msPerDay = 24 * 60 * 60 * 1000;

  // Calculate days since epoch
  const days = (date.getTime() - excelEpoch.getTime()) / msPerDay;

  // Excel has a bug where it thinks 1900 is a leap year
  // So dates after Feb 28, 1900 need to be adjusted
  if (days > 59) {
    return days + 1;
  }

  return days;
}

/**
 * Extracts workbook properties from ExcelJS workbook
 */
function convertWorkbookProperties(excelWorkbook: ExcelJS.Workbook): WorkbookProperties {
  const props: WorkbookProperties = {};

  if (excelWorkbook.creator) {
    props.author = excelWorkbook.creator;
  }

  if (excelWorkbook.lastModifiedBy) {
    props.lastAuthor = excelWorkbook.lastModifiedBy;
  }

  if (excelWorkbook.created) {
    props.createdAt = excelWorkbook.created.getTime();
  }

  if (excelWorkbook.modified) {
    props.modifiedAt = excelWorkbook.modified.getTime();
  }

  if (excelWorkbook.title) {
    props.title = excelWorkbook.title;
  }

  if (excelWorkbook.subject) {
    props.subject = excelWorkbook.subject;
  }

  if (excelWorkbook.company) {
    props.company = excelWorkbook.company;
  }

  if (excelWorkbook.description) {
    props.description = excelWorkbook.description;
  }

  if (excelWorkbook.keywords) {
    props.keywords = excelWorkbook.keywords.split(',').map((k) => k.trim());
  }

  if (excelWorkbook.category) {
    props.category = excelWorkbook.category;
  }

  return props;
}

/**
 * Extracts theme colors from ExcelJS workbook
 */
function extractThemeColors(_excelWorkbook: ExcelJS.Workbook): ThemeColors {
  // ExcelJS doesn't expose theme colors directly, so we use defaults
  // In a more complete implementation, we could parse the theme XML
  return { ...DEFAULT_THEME_COLORS };
}

/**
 * Extracts the workbook name from ExcelJS workbook or generates one
 */
function extractWorkbookName(excelWorkbook: ExcelJS.Workbook): string {
  return excelWorkbook.title ?? 'Workbook';
}

/**
 * Converts named ranges from ExcelJS to our format
 */
function convertNamedRanges(
  excelWorkbook: ExcelJS.Workbook
): Workbook['namedRanges'] {
  const namedRanges: Workbook['namedRanges'] = [];

  // ExcelJS stores defined names in workbook.definedNames
  if (excelWorkbook.definedNames) {
    const model = excelWorkbook.definedNames.model as ExtendedDefinedName[] | undefined;
    for (const name of model ?? []) {
      if (name.name && name.ranges && name.ranges.length > 0) {
        namedRanges.push({
          name: name.name,
          reference: name.ranges[0]!,
          scope: name.localSheetId !== undefined ? String(name.localSheetId) : undefined,
        });
      }
    }
  }

  return namedRanges;
}
