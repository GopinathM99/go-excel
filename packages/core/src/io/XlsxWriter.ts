/**
 * XLSX Export implementation using ExcelJS
 */
import * as ExcelJS from 'exceljs';
import type { Workbook } from '../models/Workbook';
import type { Sheet } from '../models/Sheet';
import type { Cell } from '../models/Cell';
import type {
  CellStyle,
  FontStyle,
  CellBorders,
  Border,
  BorderStyle,
  CellFill,
  HorizontalAlign,
  VerticalAlign,
} from '../models/CellStyle';
import { columnIndexToLabel } from '../models/CellAddress';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT } from '@excel/shared';

/**
 * Writes a workbook to an XLSX buffer
 * @param workbook - The workbook to export
 * @returns A Buffer containing the XLSX file data
 */
export async function writeXlsx(workbook: Workbook): Promise<Buffer> {
  const excelWorkbook = createExcelWorkbook(workbook);
  const buffer = await excelWorkbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Writes a workbook to an XLSX file
 * @param workbook - The workbook to export
 * @param filePath - The path to write the file to
 */
export async function writeXlsxToFile(workbook: Workbook, filePath: string): Promise<void> {
  const excelWorkbook = createExcelWorkbook(workbook);
  await excelWorkbook.xlsx.writeFile(filePath);
}

/**
 * Creates an ExcelJS workbook from our Workbook model
 */
function createExcelWorkbook(workbook: Workbook): ExcelJS.Workbook {
  const excelWorkbook = new ExcelJS.Workbook();

  // Set workbook properties
  excelWorkbook.creator = workbook.properties.author ?? 'Go Excel';
  excelWorkbook.lastModifiedBy =
    workbook.properties.lastAuthor ?? workbook.properties.author ?? 'Go Excel';
  excelWorkbook.created = workbook.properties.createdAt
    ? new Date(workbook.properties.createdAt)
    : new Date();
  excelWorkbook.modified = workbook.properties.modifiedAt
    ? new Date(workbook.properties.modifiedAt)
    : new Date();

  if (workbook.properties.title) {
    excelWorkbook.title = workbook.properties.title;
  }
  if (workbook.properties.subject) {
    excelWorkbook.subject = workbook.properties.subject;
  }
  if (workbook.properties.company) {
    excelWorkbook.company = workbook.properties.company;
  }
  if (workbook.properties.description) {
    excelWorkbook.description = workbook.properties.description;
  }
  if (workbook.properties.keywords) {
    excelWorkbook.keywords = workbook.properties.keywords.join(', ');
  }
  if (workbook.properties.category) {
    excelWorkbook.category = workbook.properties.category;
  }

  // Set calculation mode
  excelWorkbook.calcProperties = {
    fullCalcOnLoad: workbook.calcMode === 'auto',
  };

  // Add sheets in order
  for (const sheet of workbook.sheets) {
    writeSheet(excelWorkbook, sheet);
  }

  return excelWorkbook;
}

/**
 * Writes a sheet to the ExcelJS workbook
 */
function writeSheet(excelWorkbook: ExcelJS.Workbook, sheet: Sheet): void {
  const worksheet = excelWorkbook.addWorksheet(sheet.name, {
    properties: {
      tabColor: sheet.tabColor ? { argb: colorToArgb(sheet.tabColor) } : undefined,
      defaultColWidth: pixelsToWidth(DEFAULT_COLUMN_WIDTH as number),
      defaultRowHeight: pixelsToPoints(DEFAULT_ROW_HEIGHT as number),
    },
    views: [
      {
        showGridLines: sheet.showGridlines,
        showRowColHeaders: sheet.showHeaders,
        zoomScale: sheet.zoom,
        state: sheet.frozenPanes ? 'frozen' : 'normal',
        xSplit: sheet.frozenPanes?.columns ?? 0,
        ySplit: sheet.frozenPanes?.rows ?? 0,
      },
    ],
    state: sheet.hidden ? 'hidden' : 'visible',
  });

  // Set column widths
  setColumnWidths(worksheet, sheet);

  // Set row heights
  setRowHeights(worksheet, sheet);

  // Write cells
  writeCells(worksheet, sheet);

  // Write merged regions
  writeMergedRegions(worksheet, sheet);
}

/**
 * Sets column widths on the worksheet
 */
function setColumnWidths(worksheet: ExcelJS.Worksheet, sheet: Sheet): void {
  // Find the maximum column index used
  let maxCol = 0;
  for (const cell of sheet.cells.values()) {
    maxCol = Math.max(maxCol, cell.address.col);
  }
  for (const col of sheet.columnWidths.keys()) {
    maxCol = Math.max(maxCol, col);
  }
  for (const col of sheet.hiddenColumns) {
    maxCol = Math.max(maxCol, col);
  }

  // Set widths for all columns up to max
  for (let col = 0; col <= maxCol; col++) {
    const column = worksheet.getColumn(col + 1); // ExcelJS is 1-indexed
    const width = sheet.columnWidths.get(col);

    if (width !== undefined) {
      column.width = pixelsToWidth(width);
    }

    if (sheet.hiddenColumns.has(col)) {
      column.hidden = true;
    }

    // Apply column style if exists
    const colStyle = sheet.columnStyles.get(col);
    if (colStyle) {
      column.style = mapCellStyleToExcelStyle(colStyle);
    }
  }
}

/**
 * Sets row heights on the worksheet
 */
function setRowHeights(worksheet: ExcelJS.Worksheet, sheet: Sheet): void {
  // Find the maximum row index used
  let maxRow = 0;
  for (const cell of sheet.cells.values()) {
    maxRow = Math.max(maxRow, cell.address.row);
  }
  for (const row of sheet.rowHeights.keys()) {
    maxRow = Math.max(maxRow, row);
  }
  for (const row of sheet.hiddenRows) {
    maxRow = Math.max(maxRow, row);
  }

  // Set heights for all rows up to max
  for (let rowIdx = 0; rowIdx <= maxRow; rowIdx++) {
    const row = worksheet.getRow(rowIdx + 1); // ExcelJS is 1-indexed
    const height = sheet.rowHeights.get(rowIdx);

    if (height !== undefined) {
      row.height = pixelsToPoints(height);
    }

    if (sheet.hiddenRows.has(rowIdx)) {
      row.hidden = true;
    }

    // Apply row style if exists
    const rowStyle = sheet.rowStyles.get(rowIdx);
    if (rowStyle) {
      row.style = mapCellStyleToExcelStyle(rowStyle);
    }
  }
}

/**
 * Writes all cells to the worksheet
 */
function writeCells(worksheet: ExcelJS.Worksheet, sheet: Sheet): void {
  for (const cell of sheet.cells.values()) {
    writeCell(worksheet, cell);
  }
}

/**
 * Writes a single cell to the worksheet
 */
function writeCell(worksheet: ExcelJS.Worksheet, cell: Cell): void {
  // ExcelJS uses 1-based row and column indices
  const excelCell = worksheet.getCell(cell.address.row + 1, cell.address.col + 1);

  // Handle formulas
  if (cell.content.isFormula) {
    // Remove leading '=' for ExcelJS
    const formula = cell.content.raw.slice(1);
    excelCell.value = { formula };

    // If we have a computed result, set it as the cached value
    if (cell.value.type !== 'empty') {
      const result = getCellResultValue(cell);
      if (result !== null) {
        excelCell.value = { formula, result };
      }
    }
  } else {
    // Handle regular values
    setCellValue(excelCell, cell);
  }

  // Apply cell style
  if (cell.style) {
    applyCellStyle(excelCell, cell.style);
  }

  // Handle hyperlinks
  if (cell.hyperlink) {
    excelCell.value = {
      text:
        cell.hyperlink.displayText ??
        (typeof excelCell.value === 'string' || typeof excelCell.value === 'number'
          ? String(excelCell.value)
          : cell.hyperlink.url),
      hyperlink: cell.hyperlink.url,
    };
    if (cell.hyperlink.tooltip) {
      excelCell.note = cell.hyperlink.tooltip;
    }
  }

  // Handle comments
  if (cell.comment) {
    excelCell.note = {
      texts: [
        {
          text: cell.comment.text,
          font: { name: 'Arial', size: 10 },
        },
      ],
    };
  }
}

/**
 * Gets the result value from a cell for formula caching
 */
function getCellResultValue(cell: Cell): string | number | boolean | Date | null {
  switch (cell.value.type) {
    case 'empty':
      return null;
    case 'string':
      return cell.value.value;
    case 'number':
      return cell.value.value;
    case 'boolean':
      return cell.value.value;
    case 'error':
      // Return error code as string
      return cell.value.error.code;
  }
}

/**
 * Sets the value of an Excel cell based on our CellValue type
 */
function setCellValue(excelCell: ExcelJS.Cell, cell: Cell): void {
  const value = cell.value;

  switch (value.type) {
    case 'empty':
      excelCell.value = null;
      break;
    case 'string':
      excelCell.value = value.value;
      break;
    case 'number':
      // Check if this is a date value (number format indicates date)
      if (
        cell.style?.numberFormat?.category === 'date' ||
        cell.style?.numberFormat?.category === 'time'
      ) {
        // Excel dates are stored as serial numbers (days since 1899-12-30)
        // If the value looks like an Excel date serial, convert it
        if (value.value > 0 && value.value < 2958466) {
          // Max Excel date
          excelCell.value = excelSerialToDate(value.value);
        } else {
          excelCell.value = value.value;
        }
      } else {
        excelCell.value = value.value;
      }
      break;
    case 'boolean':
      excelCell.value = value.value;
      break;
    case 'error':
      // ExcelJS represents errors as objects with error property
      excelCell.value = { error: mapErrorCode(value.error.code) };
      break;
  }
}

/**
 * Maps our error codes to ExcelJS error types
 */
function mapErrorCode(code: string): ExcelJS.CellErrorValue['error'] {
  const errorMap: Record<string, ExcelJS.CellErrorValue['error']> = {
    '#DIV/0!': '#DIV/0!',
    '#NAME?': '#NAME?',
    '#N/A': '#N/A',
    '#NULL!': '#NULL!',
    '#NUM!': '#NUM!',
    '#REF!': '#REF!',
    '#VALUE!': '#VALUE!',
  };
  return errorMap[code] ?? '#VALUE!';
}

/**
 * Converts an Excel serial date to a JavaScript Date
 */
function excelSerialToDate(serial: number): Date {
  // Excel's epoch is December 30, 1899
  // Also account for the Excel 1900 leap year bug (Excel thinks 1900 is a leap year)
  const excelEpoch = new Date(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(excelEpoch.getTime() + serial * msPerDay);
}

/**
 * Applies cell style to an ExcelJS cell
 */
function applyCellStyle(excelCell: ExcelJS.Cell, style: CellStyle): void {
  const excelStyle = mapCellStyleToExcelStyle(style);

  if (excelStyle.font) {
    excelCell.font = excelStyle.font;
  }
  if (excelStyle.fill) {
    excelCell.fill = excelStyle.fill;
  }
  if (excelStyle.border) {
    excelCell.border = excelStyle.border;
  }
  if (excelStyle.alignment) {
    excelCell.alignment = excelStyle.alignment;
  }
  if (excelStyle.numFmt) {
    excelCell.numFmt = excelStyle.numFmt;
  }
  if (excelStyle.protection) {
    excelCell.protection = excelStyle.protection;
  }
}

/**
 * Maps our CellStyle to ExcelJS style format
 */
function mapCellStyleToExcelStyle(style: CellStyle): Partial<ExcelJS.Style> {
  const excelStyle: Partial<ExcelJS.Style> = {};

  // Map font
  if (style.font) {
    excelStyle.font = mapFontStyle(style.font);
  }

  // Map fill
  if (style.fill !== undefined) {
    excelStyle.fill = mapFill(style.fill);
  }

  // Map borders
  if (style.borders) {
    excelStyle.border = mapBorders(style.borders);
  }

  // Map alignment
  const alignment = mapAlignment(style);
  if (Object.keys(alignment).length > 0) {
    excelStyle.alignment = alignment;
  }

  // Map number format
  if (style.numberFormat) {
    excelStyle.numFmt = style.numberFormat.formatString;
  }

  // Map protection
  if (style.protection) {
    excelStyle.protection = {
      locked: style.protection.locked ?? true,
      hidden: style.protection.hidden ?? false,
    };
  }

  return excelStyle;
}

/**
 * Maps FontStyle to ExcelJS font
 */
function mapFontStyle(font: FontStyle): Partial<ExcelJS.Font> {
  const excelFont: Partial<ExcelJS.Font> = {};

  if (font.family) {
    excelFont.name = font.family;
  }
  if (font.size !== undefined) {
    excelFont.size = font.size;
  }
  if (font.color) {
    excelFont.color = { argb: colorToArgb(font.color) };
  }
  if (font.bold !== undefined) {
    excelFont.bold = font.bold;
  }
  if (font.italic !== undefined) {
    excelFont.italic = font.italic;
  }
  if (font.underline !== undefined) {
    if (typeof font.underline === 'boolean') {
      excelFont.underline = font.underline;
    } else {
      // Map underline style
      const underlineMap: Record<
        string,
        boolean | 'single' | 'double' | 'singleAccounting' | 'doubleAccounting'
      > = {
        none: false,
        single: 'single',
        double: 'double',
        singleAccounting: 'singleAccounting',
        doubleAccounting: 'doubleAccounting',
      };
      excelFont.underline = underlineMap[font.underline] ?? false;
    }
  }
  if (font.strikethrough !== undefined) {
    excelFont.strike = font.strikethrough;
  }
  if (font.superscript) {
    excelFont.vertAlign = 'superscript';
  } else if (font.subscript) {
    excelFont.vertAlign = 'subscript';
  }
  if (font.outline !== undefined) {
    excelFont.outline = font.outline;
  }

  return excelFont;
}

/**
 * Maps fill to ExcelJS fill
 */
function mapFill(fill: string | CellFill): ExcelJS.Fill {
  if (typeof fill === 'string') {
    // Simple color string - treat as solid fill
    if (fill === 'transparent' || fill === 'none') {
      return {
        type: 'pattern',
        pattern: 'none',
      };
    }
    return {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colorToArgb(fill) },
    };
  }

  // CellFill object
  if (fill.pattern === 'none') {
    return {
      type: 'pattern',
      pattern: 'none',
    };
  }

  const patternFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: mapFillPattern(fill.pattern),
  };

  if (fill.foregroundColor) {
    patternFill.fgColor = { argb: colorToArgb(fill.foregroundColor) };
  }
  if (fill.backgroundColor) {
    patternFill.bgColor = { argb: colorToArgb(fill.backgroundColor) };
  }

  return patternFill;
}

/**
 * Maps our fill pattern to ExcelJS pattern
 */
function mapFillPattern(pattern: CellFill['pattern']): ExcelJS.FillPatterns {
  const patternMap: Record<CellFill['pattern'], ExcelJS.FillPatterns> = {
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
  return patternMap[pattern];
}

/**
 * Maps borders to ExcelJS border format
 */
function mapBorders(borders: CellBorders): Partial<ExcelJS.Borders> {
  const excelBorders: Partial<ExcelJS.Borders> = {};

  if (borders.top) {
    excelBorders.top = mapBorder(borders.top);
  }
  if (borders.right) {
    excelBorders.right = mapBorder(borders.right);
  }
  if (borders.bottom) {
    excelBorders.bottom = mapBorder(borders.bottom);
  }
  if (borders.left) {
    excelBorders.left = mapBorder(borders.left);
  }

  return excelBorders;
}

/**
 * Maps a single border to ExcelJS format
 */
function mapBorder(border: Border): Partial<ExcelJS.Border> {
  return {
    style: mapBorderStyle(border.style),
    color: { argb: colorToArgb(border.color) },
  };
}

/**
 * Maps border style to ExcelJS style
 */
function mapBorderStyle(style: BorderStyle): ExcelJS.BorderStyle {
  const styleMap: Record<BorderStyle, ExcelJS.BorderStyle> = {
    none: 'thin', // ExcelJS doesn't have 'none', use thin with no color
    thin: 'thin',
    medium: 'medium',
    thick: 'thick',
    dotted: 'dotted',
    dashed: 'dashed',
    double: 'double',
  };
  return styleMap[style];
}

/**
 * Maps alignment properties to ExcelJS alignment
 */
function mapAlignment(style: CellStyle): Partial<ExcelJS.Alignment> {
  const alignment: Partial<ExcelJS.Alignment> = {};

  if (style.horizontalAlign) {
    alignment.horizontal = mapHorizontalAlign(style.horizontalAlign);
  }
  if (style.verticalAlign) {
    alignment.vertical = mapVerticalAlign(style.verticalAlign);
  }
  if (style.wrapText !== undefined) {
    alignment.wrapText = style.wrapText;
  }
  if (style.textRotation !== undefined) {
    alignment.textRotation = style.textRotation;
  }
  if (style.indent !== undefined && style.indent > 0) {
    alignment.indent = style.indent;
  }
  if (style.shrinkToFit !== undefined) {
    alignment.shrinkToFit = style.shrinkToFit;
  }
  if (style.readingOrder !== undefined && style.readingOrder !== 0) {
    alignment.readingOrder = style.readingOrder === 1 ? 'ltr' : 'rtl';
  }

  return alignment;
}

/**
 * Maps horizontal alignment to ExcelJS
 */
function mapHorizontalAlign(align: HorizontalAlign): ExcelJS.Alignment['horizontal'] {
  const alignMap: Record<HorizontalAlign, ExcelJS.Alignment['horizontal']> = {
    left: 'left',
    center: 'center',
    right: 'right',
    justify: 'justify',
    fill: 'fill',
    centerContinuous: 'centerContinuous',
    distributed: 'distributed',
  };
  return alignMap[align];
}

/**
 * Maps vertical alignment to ExcelJS
 */
function mapVerticalAlign(align: VerticalAlign): ExcelJS.Alignment['vertical'] {
  const alignMap: Record<VerticalAlign, ExcelJS.Alignment['vertical']> = {
    top: 'top',
    middle: 'middle',
    bottom: 'bottom',
    justify: 'justify',
    distributed: 'distributed',
  };
  return alignMap[align];
}

/**
 * Writes merged regions to the worksheet
 */
function writeMergedRegions(worksheet: ExcelJS.Worksheet, sheet: Sheet): void {
  for (const region of sheet.mergedRegions) {
    const startCol = columnIndexToLabel(region.range.start.col);
    const endCol = columnIndexToLabel(region.range.end.col);
    const startRow = region.range.start.row + 1; // 1-indexed
    const endRow = region.range.end.row + 1;

    worksheet.mergeCells(`${startCol}${String(startRow)}:${endCol}${String(endRow)}`);
  }
}

/**
 * Converts a hex color to ARGB format for ExcelJS
 */
function colorToArgb(color: string): string {
  // Remove # if present
  let hex = color.replace(/^#/, '');

  // Handle shorthand (e.g., #FFF -> #FFFFFF)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // Handle RGB (add full opacity)
  if (hex.length === 6) {
    return `FF${hex.toUpperCase()}`;
  }

  // Already ARGB
  if (hex.length === 8) {
    return hex.toUpperCase();
  }

  // Default to black
  return 'FF000000';
}

/**
 * Converts pixels to Excel column width units
 * Excel column width is measured in character widths
 * Approximately: width = (pixels - 5) / 7
 */
function pixelsToWidth(pixels: number): number {
  return Math.max(0, (pixels - 5) / 7);
}

/**
 * Converts pixels to points for row height
 * 1 point = 1.333 pixels (approximately)
 */
function pixelsToPoints(pixels: number): number {
  return pixels / 1.333;
}
