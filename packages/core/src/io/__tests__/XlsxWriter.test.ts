import { describe, it, expect, beforeEach } from 'vitest';
import * as ExcelJS from 'exceljs';
import { writeXlsx, writeXlsxToFile } from '../XlsxWriter';
import { createWorkbook, addSheet, updateSheet } from '../../models/Workbook';
import { createSheet, setCell, setColumnWidth, setRowHeight, addMergedRegion } from '../../models/Sheet';
import { createCell } from '../../models/Cell';
import { stringValue, numberValue, booleanValue, errorValue, CellErrorCode } from '../../models/CellValue';
import type { CellStyle } from '../../models/CellStyle';
import type { Workbook } from '../../models/Workbook';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('XlsxWriter', () => {
  let workbook: Workbook;

  beforeEach(() => {
    workbook = createWorkbook('TestWorkbook');
  });

  describe('writeXlsx', () => {
    it('should export an empty workbook', async () => {
      const buffer = await writeXlsx(workbook);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's a valid XLSX by reading it back
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets.length).toBe(1);
      expect(readWorkbook.worksheets[0]?.name).toBe('Sheet1');
    });

    it('should export multiple sheets in order', async () => {
      workbook = addSheet(workbook, 'Sheet2');
      workbook = addSheet(workbook, 'Sheet3');

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets.length).toBe(3);
      expect(readWorkbook.worksheets[0]?.name).toBe('Sheet1');
      expect(readWorkbook.worksheets[1]?.name).toBe('Sheet2');
      expect(readWorkbook.worksheets[2]?.name).toBe('Sheet3');
    });

    it('should preserve sheet names with special characters', async () => {
      let sheet = createSheet('Data & Analysis');
      workbook = { ...workbook, sheets: [sheet] };

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets[0]?.name).toBe('Data & Analysis');
    });
  });

  describe('Cell Values', () => {
    it('should export string values', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        'Hello World',
        stringValue('Hello World')
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const cellValue = readWorkbook.worksheets[0]?.getCell('A1').value;
      expect(cellValue).toBe('Hello World');
    });

    it('should export number values', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        '42.5',
        numberValue(42.5)
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const cellValue = readWorkbook.worksheets[0]?.getCell('A1').value;
      expect(cellValue).toBe(42.5);
    });

    it('should export boolean values', async () => {
      let sheet = workbook.sheets[0]!;
      const trueCell = createCell(
        { row: 0, col: 0 },
        'TRUE',
        booleanValue(true)
      );
      const falseCell = createCell(
        { row: 0, col: 1 },
        'FALSE',
        booleanValue(false)
      );
      sheet = setCell(sheet, trueCell);
      sheet = setCell(sheet, falseCell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets[0]?.getCell('A1').value).toBe(true);
      expect(readWorkbook.worksheets[0]?.getCell('B1').value).toBe(false);
    });

    it('should export error values', async () => {
      let sheet = workbook.sheets[0]!;
      // Create a non-formula cell with error value
      const cell = {
        address: { row: 0, col: 0 },
        content: { raw: '#DIV/0!', isFormula: false },
        value: errorValue(CellErrorCode.DIV_ZERO),
      };
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const cellValue = readWorkbook.worksheets[0]?.getCell('A1').value as { error: string };
      expect(cellValue.error).toBe('#DIV/0!');
    });

    it('should export date values with date format', async () => {
      let sheet = workbook.sheets[0]!;
      // Excel date serial for 2024-01-15 (approximately 45306)
      const dateSerial = 45306;
      const style: CellStyle = {
        numberFormat: { category: 'date', formatString: 'm/d/yyyy' },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        '1/15/2024',
        numberValue(dateSerial),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const cellValue = readWorkbook.worksheets[0]?.getCell('A1').value;
      expect(cellValue).toBeInstanceOf(Date);
    });
  });

  describe('Formulas', () => {
    it('should export formulas', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        '=SUM(A2:A10)',
        numberValue(100)
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      // ExcelJS stores formula value as an object with formula property
      const cellValue = excelCell?.value as { formula: string; result?: number };
      expect(cellValue.formula).toBe('SUM(A2:A10)');
    });

    it('should preserve formula results', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        '=1+1',
        numberValue(2)
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      const cellValue = excelCell?.value as { formula: string; result?: number };
      expect(cellValue.formula).toBe('1+1');
      expect(cellValue.result).toBe(2);
    });
  });

  describe('Cell Styles', () => {
    it('should export font styles', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        font: {
          family: 'Times New Roman',
          size: 14,
          bold: true,
          italic: true,
          color: '#FF0000',
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Styled',
        stringValue('Styled'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.font?.name).toBe('Times New Roman');
      expect(excelCell?.font?.size).toBe(14);
      expect(excelCell?.font?.bold).toBe(true);
      expect(excelCell?.font?.italic).toBe(true);
      expect(excelCell?.font?.color?.argb).toBe('FFFF0000');
    });

    it('should export underline styles', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        font: {
          underline: 'double',
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Underlined',
        stringValue('Underlined'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.font?.underline).toBe('double');
    });

    it('should export strikethrough', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        font: {
          strikethrough: true,
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Strike',
        stringValue('Strike'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.font?.strike).toBe(true);
    });

    it('should export solid fill', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        fill: '#FFFF00',
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Yellow',
        stringValue('Yellow'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      const fill = excelCell?.fill as ExcelJS.FillPattern;
      expect(fill?.type).toBe('pattern');
      expect(fill?.pattern).toBe('solid');
      expect(fill?.fgColor?.argb).toBe('FFFFFF00');
    });

    it('should export pattern fill', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        fill: {
          pattern: 'lightGray',
          foregroundColor: '#000000',
          backgroundColor: '#FFFFFF',
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Pattern',
        stringValue('Pattern'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      const fill = excelCell?.fill as ExcelJS.FillPattern;
      expect(fill?.pattern).toBe('lightGray');
    });

    it('should export borders', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        borders: {
          top: { style: 'thin', color: '#000000' },
          right: { style: 'medium', color: '#FF0000' },
          bottom: { style: 'thick', color: '#00FF00' },
          left: { style: 'dashed', color: '#0000FF' },
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Bordered',
        stringValue('Bordered'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.border?.top?.style).toBe('thin');
      expect(excelCell?.border?.right?.style).toBe('medium');
      expect(excelCell?.border?.bottom?.style).toBe('thick');
      expect(excelCell?.border?.left?.style).toBe('dashed');
    });

    it('should export horizontal alignment', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        horizontalAlign: 'center',
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Centered',
        stringValue('Centered'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.alignment?.horizontal).toBe('center');
    });

    it('should export vertical alignment', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        verticalAlign: 'middle',
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Middle',
        stringValue('Middle'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.alignment?.vertical).toBe('middle');
    });

    it('should export text wrap', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        wrapText: true,
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Wrapped text',
        stringValue('Wrapped text'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.alignment?.wrapText).toBe(true);
    });

    it('should export text rotation', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        textRotation: 45,
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Rotated',
        stringValue('Rotated'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.alignment?.textRotation).toBe(45);
    });

    it('should export number format', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        numberFormat: {
          category: 'currency',
          formatString: '$#,##0.00',
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        '1234.56',
        numberValue(1234.56),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.numFmt).toBe('$#,##0.00');
    });

    it('should export cell protection', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        protection: {
          locked: false,
          hidden: true,
        },
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Protected',
        stringValue('Protected'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      expect(excelCell?.protection?.locked).toBe(false);
      expect(excelCell?.protection?.hidden).toBe(true);
    });
  });

  describe('Merged Cells', () => {
    it('should export merged cells', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        'Merged',
        stringValue('Merged')
      );
      sheet = setCell(sheet, cell);
      sheet = addMergedRegion(sheet, {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 2 },
      });
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;
      // Check if A1 is the master of a merge
      const cellA1 = worksheet.getCell('A1');
      expect(cellA1.isMerged).toBe(true);
      expect(cellA1.master.address).toBe('A1');

      // Check if C3 is part of the same merge
      const cellC3 = worksheet.getCell('C3');
      expect(cellC3.isMerged).toBe(true);
      expect(cellC3.master.address).toBe('A1');
    });

    it('should export multiple merged regions', async () => {
      let sheet = workbook.sheets[0]!;
      sheet = addMergedRegion(sheet, {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 1 },
      });
      sheet = addMergedRegion(sheet, {
        start: { row: 2, col: 2 },
        end: { row: 3, col: 4 },
      });
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;

      // First merge
      expect(worksheet.getCell('A1').isMerged).toBe(true);
      expect(worksheet.getCell('B1').master.address).toBe('A1');

      // Second merge
      expect(worksheet.getCell('C3').isMerged).toBe(true);
      expect(worksheet.getCell('E4').master.address).toBe('C3');
    });
  });

  describe('Column Widths and Row Heights', () => {
    it('should export column widths', async () => {
      let sheet = workbook.sheets[0]!;
      sheet = setColumnWidth(sheet, 0, 200);
      sheet = setColumnWidth(sheet, 2, 50);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;
      // Column A (index 1 in ExcelJS) should be wider
      const colA = worksheet.getColumn(1);
      expect(colA.width).toBeGreaterThan(10);

      // Column C (index 3 in ExcelJS) should be narrower
      const colC = worksheet.getColumn(3);
      expect(colC.width).toBeLessThan(20);
    });

    it('should export row heights', async () => {
      let sheet = workbook.sheets[0]!;
      sheet = setRowHeight(sheet, 0, 48);
      sheet = setRowHeight(sheet, 2, 12);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;
      // Row 1 should be taller
      const row1 = worksheet.getRow(1);
      expect(row1.height).toBeGreaterThan(20);

      // Row 3 should be shorter
      const row3 = worksheet.getRow(3);
      expect(row3.height).toBeLessThan(20);
    });

    it('should export hidden columns', async () => {
      let sheet = workbook.sheets[0]!;
      // Add a cell so the column exists
      const cell = createCell({ row: 0, col: 1 }, 'Hidden', stringValue('Hidden'));
      sheet = setCell(sheet, cell);
      sheet = { ...sheet, hiddenColumns: new Set([1]) };
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;
      const colB = worksheet.getColumn(2);
      expect(colB.hidden).toBe(true);
    });

    it('should export hidden rows', async () => {
      let sheet = workbook.sheets[0]!;
      // Add a cell so the row exists
      const cell = createCell({ row: 1, col: 0 }, 'Hidden', stringValue('Hidden'));
      sheet = setCell(sheet, cell);
      sheet = { ...sheet, hiddenRows: new Set([1]) };
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;
      const row2 = worksheet.getRow(2);
      expect(row2.hidden).toBe(true);
    });
  });

  describe('Workbook Properties', () => {
    it('should export workbook metadata', async () => {
      workbook = {
        ...workbook,
        properties: {
          ...workbook.properties,
          title: 'Test Title',
          subject: 'Test Subject',
          author: 'Test Author',
          company: 'Test Company',
          description: 'Test Description',
          keywords: ['test', 'excel'],
          category: 'Test Category',
        },
      };

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.title).toBe('Test Title');
      expect(readWorkbook.subject).toBe('Test Subject');
      expect(readWorkbook.creator).toBe('Test Author');
      expect(readWorkbook.company).toBe('Test Company');
      expect(readWorkbook.description).toBe('Test Description');
      expect(readWorkbook.keywords).toBe('test, excel');
      expect(readWorkbook.category).toBe('Test Category');
    });
  });

  describe('writeXlsxToFile', () => {
    it('should write to a file', async () => {
      const tempDir = os.tmpdir();
      const filePath = path.join(tempDir, `test-${Date.now()}.xlsx`);

      try {
        let sheet = workbook.sheets[0]!;
        const cell = createCell(
          { row: 0, col: 0 },
          'File Test',
          stringValue('File Test')
        );
        sheet = setCell(sheet, cell);
        workbook = updateSheet(workbook, sheet);

        await writeXlsxToFile(workbook, filePath);

        // Verify file exists
        expect(fs.existsSync(filePath)).toBe(true);

        // Verify it's a valid XLSX
        const readWorkbook = new ExcelJS.Workbook();
        await readWorkbook.xlsx.readFile(filePath);

        expect(readWorkbook.worksheets[0]?.getCell('A1').value).toBe('File Test');
      } finally {
        // Cleanup
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cells', async () => {
      // Just export empty workbook - should not throw
      const buffer = await writeXlsx(workbook);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle special characters in cell values', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        '<script>alert("xss")</script>',
        stringValue('<script>alert("xss")</script>')
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets[0]?.getCell('A1').value).toBe(
        '<script>alert("xss")</script>'
      );
    });

    it('should handle unicode characters', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 0, col: 0 },
        'Hello World',
        stringValue('Hello World')
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets[0]?.getCell('A1').value).toBe('Hello World');
    });

    it('should handle very long strings', async () => {
      let sheet = workbook.sheets[0]!;
      const longString = 'A'.repeat(32767); // Max cell content length
      const cell = createCell(
        { row: 0, col: 0 },
        longString,
        stringValue(longString)
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets[0]?.getCell('A1').value).toBe(longString);
    });

    it('should handle large numbers', async () => {
      let sheet = workbook.sheets[0]!;
      const largeNum = 9999999999999999;
      const cell = createCell(
        { row: 0, col: 0 },
        largeNum.toString(),
        numberValue(largeNum)
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      // Note: Very large numbers may lose precision in Excel
      const value = readWorkbook.worksheets[0]?.getCell('A1').value as number;
      expect(typeof value).toBe('number');
    });

    it('should handle cells at high row/column indices', async () => {
      let sheet = workbook.sheets[0]!;
      const cell = createCell(
        { row: 999, col: 255 },
        'Far cell',
        stringValue('Far cell')
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      expect(readWorkbook.worksheets[0]?.getCell('IV1000').value).toBe('Far cell');
    });

    it('should handle shorthand hex colors', async () => {
      let sheet = workbook.sheets[0]!;
      const style: CellStyle = {
        fill: '#F00', // Shorthand for #FF0000
      };
      const cell = createCell(
        { row: 0, col: 0 },
        'Red',
        stringValue('Red'),
        style
      );
      sheet = setCell(sheet, cell);
      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const excelCell = readWorkbook.worksheets[0]?.getCell('A1');
      const fill = excelCell?.fill as ExcelJS.FillPattern;
      expect(fill?.fgColor?.argb).toBe('FFFF0000');
    });
  });

  describe('Complex Scenarios', () => {
    it('should export a workbook with multiple styled cells', async () => {
      let sheet = workbook.sheets[0]!;

      // Header row
      const headerStyle: CellStyle = {
        font: { bold: true, size: 12 },
        fill: '#4472C4',
        horizontalAlign: 'center',
      };

      const headers = ['Name', 'Age', 'City'];
      for (let i = 0; i < headers.length; i++) {
        const cell = createCell(
          { row: 0, col: i },
          headers[i]!,
          stringValue(headers[i]!),
          headerStyle
        );
        sheet = setCell(sheet, cell);
      }

      // Data rows
      const data = [
        ['Alice', 30, 'New York'],
        ['Bob', 25, 'Los Angeles'],
      ];

      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < data[row]!.length; col++) {
          const value = data[row]![col]!;
          const cellValue =
            typeof value === 'number' ? numberValue(value) : stringValue(String(value));
          const cell = createCell(
            { row: row + 1, col },
            String(value),
            cellValue
          );
          sheet = setCell(sheet, cell);
        }
      }

      workbook = updateSheet(workbook, sheet);

      const buffer = await writeXlsx(workbook);
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.load(buffer);

      const worksheet = readWorkbook.worksheets[0]!;

      // Verify headers
      expect(worksheet.getCell('A1').value).toBe('Name');
      expect(worksheet.getCell('A1').font?.bold).toBe(true);

      // Verify data
      expect(worksheet.getCell('A2').value).toBe('Alice');
      expect(worksheet.getCell('B2').value).toBe(30);
      expect(worksheet.getCell('C3').value).toBe('Los Angeles');
    });
  });
});
