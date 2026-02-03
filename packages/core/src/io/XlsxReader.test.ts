/**
 * Unit tests for XLSX Import functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import ExcelJS from 'exceljs';
import { readXlsx, readXlsxFromFile, XlsxImportError } from './XlsxReader';
import type { Workbook } from '../models/Workbook';
import type { CellStyle } from '../models/CellStyle';
import { cellAddressKey } from '../models/CellAddress';

/**
 * Creates a simple XLSX buffer for testing
 */
async function createTestWorkbook(
  setup: (workbook: ExcelJS.Workbook) => void
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  setup(workbook);
  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

describe('XlsxReader', () => {
  describe('readXlsx', () => {
    describe('basic functionality', () => {
      it('should read a simple workbook with one sheet', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Hello';
          sheet.getCell('B1').value = 'World';
        });

        const workbook = await readXlsx(buffer);

        expect(workbook.sheets).toHaveLength(1);
        expect(workbook.sheets[0]!.name).toBe('Sheet1');
      });

      it('should read multiple sheets', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet('Sheet1');
          wb.addWorksheet('Sheet2');
          wb.addWorksheet('Sheet3');
        });

        const workbook = await readXlsx(buffer);

        expect(workbook.sheets).toHaveLength(3);
        expect(workbook.sheets[0]!.name).toBe('Sheet1');
        expect(workbook.sheets[1]!.name).toBe('Sheet2');
        expect(workbook.sheets[2]!.name).toBe('Sheet3');
      });

      it('should set correct active sheet index', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet('Sheet1');
          wb.addWorksheet('Sheet2');
          wb.views = [{ activeTab: 1 }];
        });

        const workbook = await readXlsx(buffer);

        expect(workbook.activeSheetIndex).toBe(1);
      });

      it('should handle ArrayBuffer input', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Test';
        });

        // Convert to ArrayBuffer
        const arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );

        const workbook = await readXlsx(arrayBuffer);

        expect(workbook.sheets).toHaveLength(1);
      });
    });

    describe('cell values', () => {
      it('should read string values', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Hello World';
          sheet.getCell('A2').value = '';
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('string');
        if (cellA1?.value.type === 'string') {
          expect(cellA1.value.value).toBe('Hello World');
        }
      });

      it('should read number values', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 42;
          sheet.getCell('A2').value = 3.14159;
          sheet.getCell('A3').value = -100;
          sheet.getCell('A4').value = 0;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('number');
        if (cellA1?.value.type === 'number') {
          expect(cellA1.value.value).toBe(42);
        }

        const cellA2 = sheet.cells.get(cellAddressKey({ row: 1, col: 0 }));
        expect(cellA2?.value.type).toBe('number');
        if (cellA2?.value.type === 'number') {
          expect(cellA2.value.value).toBeCloseTo(3.14159);
        }

        const cellA3 = sheet.cells.get(cellAddressKey({ row: 2, col: 0 }));
        expect(cellA3?.value.type).toBe('number');
        if (cellA3?.value.type === 'number') {
          expect(cellA3.value.value).toBe(-100);
        }
      });

      it('should read boolean values', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = true;
          sheet.getCell('A2').value = false;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('boolean');
        if (cellA1?.value.type === 'boolean') {
          expect(cellA1.value.value).toBe(true);
        }

        const cellA2 = sheet.cells.get(cellAddressKey({ row: 1, col: 0 }));
        expect(cellA2?.value.type).toBe('boolean');
        if (cellA2?.value.type === 'boolean') {
          expect(cellA2.value.value).toBe(false);
        }
      });

      it('should read date values as numbers', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const date = new Date(2024, 0, 15); // January 15, 2024
          sheet.getCell('A1').value = date;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('number');
        // Excel serial date for Jan 15, 2024 is approximately 45306
        if (cellA1?.value.type === 'number') {
          expect(cellA1.value.value).toBeGreaterThan(45000);
        }
      });

      it('should preserve raw content for non-formula cells', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Hello';
          sheet.getCell('A2').value = 42;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.content.raw).toBe('Hello');
        expect(cellA1?.content.isFormula).toBe(false);

        const cellA2 = sheet.cells.get(cellAddressKey({ row: 1, col: 0 }));
        expect(cellA2?.content.raw).toBe('42');
        expect(cellA2?.content.isFormula).toBe(false);
      });
    });

    describe('formulas', () => {
      it('should read formulas with formula string preserved', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 10;
          sheet.getCell('A2').value = 20;
          sheet.getCell('A3').value = { formula: 'A1+A2', result: 30 };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA3 = sheet.cells.get(cellAddressKey({ row: 2, col: 0 }));
        expect(cellA3?.content.isFormula).toBe(true);
        expect(cellA3?.content.raw).toBe('=A1+A2');
        expect(cellA3?.value.type).toBe('number');
        if (cellA3?.value.type === 'number') {
          expect(cellA3.value.value).toBe(30);
        }
      });

      it('should handle complex formulas', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = { formula: 'SUM(B1:B10)', result: 55 };
          sheet.getCell('A2').value = { formula: 'IF(A1>50,"High","Low")', result: 'High' };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.content.raw).toBe('=SUM(B1:B10)');

        const cellA2 = sheet.cells.get(cellAddressKey({ row: 1, col: 0 }));
        expect(cellA2?.content.raw).toBe('=IF(A1>50,"High","Low")');
        if (cellA2?.value.type === 'string') {
          expect(cellA2.value.value).toBe('High');
        }
      });

      it('should skip formulas when parseFormulas is false', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = { formula: 'A2+A3', result: 100 };
        });

        const workbook = await readXlsx(buffer, { parseFormulas: false });
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.content.isFormula).toBe(false);
        expect(cellA1?.content.raw).toBe('100');
      });
    });

    describe('cell styles', () => {
      it('should read font styles', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const cell = sheet.getCell('A1');
          cell.value = 'Styled Text';
          cell.font = {
            name: 'Arial',
            size: 14,
            bold: true,
            italic: true,
            underline: true,
            strike: true,
            color: { argb: 'FFFF0000' },
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.style?.font?.family).toBe('Arial');
        expect(cellA1?.style?.font?.size).toBe(14);
        expect(cellA1?.style?.font?.bold).toBe(true);
        expect(cellA1?.style?.font?.italic).toBe(true);
        expect(cellA1?.style?.font?.underline).toBe(true);
        expect(cellA1?.style?.font?.strikethrough).toBe(true);
        expect(cellA1?.style?.font?.color).toBe('#FF0000');
      });

      it('should read fill styles', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const cell = sheet.getCell('A1');
          cell.value = 'Filled';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF00FF00' },
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.style?.fill).toBe('#00FF00');
      });

      it('should read border styles', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const cell = sheet.getCell('A1');
          cell.value = 'Bordered';
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FFFF0000' } },
            bottom: { style: 'thick', color: { argb: 'FF00FF00' } },
            left: { style: 'dashed', color: { argb: 'FF0000FF' } },
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.style?.borders?.top?.style).toBe('thin');
        expect(cellA1?.style?.borders?.top?.color).toBe('#000000');
        expect(cellA1?.style?.borders?.right?.style).toBe('medium');
        expect(cellA1?.style?.borders?.bottom?.style).toBe('thick');
        expect(cellA1?.style?.borders?.left?.style).toBe('dashed');
      });

      it('should read alignment styles', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const cell = sheet.getCell('A1');
          cell.value = 'Aligned';
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
            textRotation: 45,
            indent: 2,
            shrinkToFit: true,
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.style?.horizontalAlign).toBe('center');
        expect(cellA1?.style?.verticalAlign).toBe('middle');
        expect(cellA1?.style?.wrapText).toBe(true);
        expect(cellA1?.style?.textRotation).toBe(45);
        expect(cellA1?.style?.indent).toBe(2);
        expect(cellA1?.style?.shrinkToFit).toBe(true);
      });

      it('should read number formats', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 1234.56;
          sheet.getCell('A1').numFmt = '#,##0.00';

          sheet.getCell('A2').value = 0.5;
          sheet.getCell('A2').numFmt = '0.00%';

          sheet.getCell('A3').value = 100;
          sheet.getCell('A3').numFmt = '$#,##0.00';
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.style?.numberFormat?.category).toBe('number');
        expect(cellA1?.style?.numberFormat?.useThousandsSeparator).toBe(true);

        const cellA2 = sheet.cells.get(cellAddressKey({ row: 1, col: 0 }));
        expect(cellA2?.style?.numberFormat?.category).toBe('percentage');

        const cellA3 = sheet.cells.get(cellAddressKey({ row: 2, col: 0 }));
        expect(cellA3?.style?.numberFormat?.category).toBe('currency');
        expect(cellA3?.style?.numberFormat?.currencySymbol).toBe('$');
      });

      it('should skip styles when parseStyles is false', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const cell = sheet.getCell('A1');
          cell.value = 'Styled';
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        });

        const workbook = await readXlsx(buffer, { parseStyles: false });
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.style).toBeUndefined();
      });
    });

    describe('merged cells', () => {
      it('should read merged cell regions', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Merged';
          sheet.mergeCells('A1:C3');
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.mergedRegions).toHaveLength(1);
        expect(sheet.mergedRegions[0]!.range.start.row).toBe(0);
        expect(sheet.mergedRegions[0]!.range.start.col).toBe(0);
        expect(sheet.mergedRegions[0]!.range.end.row).toBe(2);
        expect(sheet.mergedRegions[0]!.range.end.col).toBe(2);
      });

      it('should mark cells as merged with parent', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Merged';
          sheet.mergeCells('A1:B2');
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        // Top-left cell should not have mergedWith
        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.mergedWith).toBeUndefined();

        // Other cells in range should have mergedWith pointing to A1
        const cellB1 = sheet.cells.get(cellAddressKey({ row: 0, col: 1 }));
        if (cellB1) {
          expect(cellB1.mergedWith?.row).toBe(0);
          expect(cellB1.mergedWith?.col).toBe(0);
        }
      });

      it('should handle multiple merged regions', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Merge1';
          sheet.mergeCells('A1:B1');
          sheet.getCell('C1').value = 'Merge2';
          sheet.mergeCells('C1:D1');
          sheet.getCell('A3').value = 'Merge3';
          sheet.mergeCells('A3:D5');
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.mergedRegions).toHaveLength(3);
      });

      it('should skip merged cells when parseMergedCells is false', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = 'Merged';
          sheet.mergeCells('A1:C3');
        });

        const workbook = await readXlsx(buffer, { parseMergedCells: false });
        const sheet = workbook.sheets[0]!;

        expect(sheet.mergedRegions).toHaveLength(0);
      });
    });

    describe('sheet properties', () => {
      it('should read column widths', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getColumn(1).width = 20;
          sheet.getColumn(3).width = 30;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        // Width is converted from characters to pixels (approx 7.5 px per char)
        expect(sheet.columnWidths.get(0)).toBeCloseTo(150, 0);
        expect(sheet.columnWidths.get(2)).toBeCloseTo(225, 0);
      });

      it('should read row heights', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getRow(1).height = 30;
          sheet.getRow(3).height = 50;
          sheet.getCell('A1').value = 'test'; // Need content for row to be included
          sheet.getCell('A3').value = 'test';
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.rowHeights.get(0)).toBe(30);
        expect(sheet.rowHeights.get(2)).toBe(50);
      });

      it('should read hidden columns', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getColumn(2).hidden = true;
          sheet.getColumn(4).hidden = true;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.hiddenColumns.has(1)).toBe(true);
        expect(sheet.hiddenColumns.has(3)).toBe(true);
        expect(sheet.hiddenColumns.has(0)).toBe(false);
      });

      it('should read hidden rows', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getRow(2).hidden = true;
          sheet.getCell('A2').value = 'hidden';
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.hiddenRows.has(1)).toBe(true);
      });

      it('should read frozen panes', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.views = [
            {
              state: 'frozen',
              xSplit: 2,
              ySplit: 3,
            },
          ];
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.frozenPanes?.columns).toBe(2);
        expect(sheet.frozenPanes?.rows).toBe(3);
      });

      it('should read sheet visibility', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet('Visible');
          const hidden = wb.addWorksheet('Hidden');
          hidden.state = 'hidden';
        });

        const workbook = await readXlsx(buffer);

        expect(workbook.sheets[0]!.hidden).toBeFalsy();
        expect(workbook.sheets[1]!.hidden).toBe(true);
      });

      it('should read zoom level', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.views = [{ zoomScale: 150 }];
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.zoom).toBe(150);
      });

      it('should read gridline visibility', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.views = [{ showGridLines: false }];
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.showGridlines).toBe(false);
      });
    });

    describe('workbook properties', () => {
      it('should read workbook metadata', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.creator = 'Test Author';
          wb.lastModifiedBy = 'Last Editor';
          wb.title = 'Test Workbook';
          wb.subject = 'Testing';
          wb.company = 'Test Company';
          wb.description = 'A test workbook';
          wb.category = 'Test';
          wb.created = new Date(2024, 0, 1);
          wb.modified = new Date(2024, 0, 15);
          wb.addWorksheet('Sheet1');
        });

        const workbook = await readXlsx(buffer);

        expect(workbook.properties.author).toBe('Test Author');
        expect(workbook.properties.lastAuthor).toBe('Last Editor');
        expect(workbook.properties.title).toBe('Test Workbook');
        expect(workbook.properties.subject).toBe('Testing');
        expect(workbook.properties.company).toBe('Test Company');
        expect(workbook.properties.description).toBe('A test workbook');
        expect(workbook.properties.category).toBe('Test');
        expect(workbook.properties.createdAt).toBeDefined();
        expect(workbook.properties.modifiedAt).toBeDefined();
      });
    });

    describe('import options', () => {
      it('should filter sheets by name', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet('Keep1');
          wb.addWorksheet('Skip');
          wb.addWorksheet('Keep2');
        });

        const workbook = await readXlsx(buffer, { sheetNames: ['Keep1', 'Keep2'] });

        expect(workbook.sheets).toHaveLength(2);
        expect(workbook.sheets[0]!.name).toBe('Keep1');
        expect(workbook.sheets[1]!.name).toBe('Keep2');
      });

      it('should limit rows with maxRows', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          for (let i = 1; i <= 100; i++) {
            sheet.getCell(`A${i}`).value = i;
          }
        });

        const workbook = await readXlsx(buffer, { maxRows: 10 });
        const sheet = workbook.sheets[0]!;

        // Should only have cells for rows 0-9
        const maxRow = Math.max(
          ...Array.from(sheet.cells.keys()).map((key) => {
            const parts = key.split(',');
            return parseInt(parts[0]!, 10);
          })
        );
        expect(maxRow).toBeLessThan(10);
      });

      it('should limit columns with maxColumns', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          for (let i = 1; i <= 50; i++) {
            sheet.getCell(1, i).value = i;
          }
        });

        const workbook = await readXlsx(buffer, { maxColumns: 5 });
        const sheet = workbook.sheets[0]!;

        // Should only have cells for columns 0-4
        const maxCol = Math.max(
          ...Array.from(sheet.cells.keys()).map((key) => {
            const parts = key.split(',');
            return parseInt(parts[1]!, 10);
          })
        );
        expect(maxCol).toBeLessThan(5);
      });
    });

    describe('error handling', () => {
      it('should throw XlsxImportError for invalid data', async () => {
        const invalidBuffer = Buffer.from('not a valid xlsx file');

        await expect(readXlsx(invalidBuffer)).rejects.toThrow(XlsxImportError);
      });

      it('should throw XlsxImportError for empty buffer', async () => {
        const emptyBuffer = Buffer.alloc(0);

        await expect(readXlsx(emptyBuffer)).rejects.toThrow(XlsxImportError);
      });

      it('should throw XlsxImportError when no sheets match filter', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet('Sheet1');
        });

        await expect(
          readXlsx(buffer, { sheetNames: ['NonExistent'] })
        ).rejects.toThrow(XlsxImportError);
      });
    });

    describe('edge cases', () => {
      it('should handle empty sheets', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet('Empty');
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.cells.size).toBe(0);
      });

      it('should handle very large numbers', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = Number.MAX_SAFE_INTEGER;
          sheet.getCell('A2').value = Number.MIN_SAFE_INTEGER;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        if (cellA1?.value.type === 'number') {
          expect(cellA1.value.value).toBe(Number.MAX_SAFE_INTEGER);
        }
      });

      it('should handle special characters in sheet names', async () => {
        const buffer = await createTestWorkbook((wb) => {
          wb.addWorksheet("Sheet's Name");
        });

        const workbook = await readXlsx(buffer);

        expect(workbook.sheets[0]!.name).toBe("Sheet's Name");
      });

      it('should handle rich text cells', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = {
            richText: [
              { text: 'Bold', font: { bold: true } },
              { text: ' and ' },
              { text: 'Italic', font: { italic: true } },
            ],
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('string');
        if (cellA1?.value.type === 'string') {
          expect(cellA1.value.value).toBe('Bold and Italic');
        }
      });

      it('should handle hyperlinks', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = {
            text: 'Click here',
            hyperlink: 'https://example.com',
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('string');
        if (cellA1?.value.type === 'string') {
          expect(cellA1.value.value).toBe('Click here');
        }
      });

      it('should handle error values in cells', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.getCell('A1').value = { error: '#DIV/0!' } as ExcelJS.CellErrorValue;
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        expect(cellA1?.value.type).toBe('error');
        if (cellA1?.value.type === 'error') {
          expect(cellA1.value.error.code).toBe('#DIV/0!');
        }
      });

      it('should handle tab colors', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          sheet.properties.tabColor = { argb: 'FFFF0000' };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        expect(sheet.tabColor).toBe('#FF0000');
      });

      it('should handle theme colors with tint', async () => {
        const buffer = await createTestWorkbook((wb) => {
          const sheet = wb.addWorksheet('Sheet1');
          const cell = sheet.getCell('A1');
          cell.value = 'Themed';
          cell.font = {
            color: { theme: 4, tint: 0.5 }, // Accent1 with 50% lightening
          };
        });

        const workbook = await readXlsx(buffer);
        const sheet = workbook.sheets[0]!;

        const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
        // Should be a lightened version of accent1 (#4472C4)
        expect(cellA1?.style?.font?.color).toBeDefined();
        expect(cellA1?.style?.font?.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('readXlsxFromFile', () => {
    // These tests would require actual file system access
    // In a real scenario, you'd create temp files or use fixtures

    it('should throw error for non-existent file', async () => {
      await expect(
        readXlsxFromFile('/non/existent/path/file.xlsx')
      ).rejects.toThrow(XlsxImportError);
    });
  });
});

describe('Number format detection', () => {
  it('should detect general format or no format for General numFmt', async () => {
    const buffer = await createTestWorkbook((wb) => {
      const sheet = wb.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 123;
      sheet.getCell('A1').numFmt = 'General';
    });

    const workbook = await readXlsx(buffer);
    const sheet = workbook.sheets[0]!;

    const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
    // General format may either be detected as 'general' or not set at all (default behavior)
    if (cellA1?.style?.numberFormat) {
      expect(cellA1.style.numberFormat.category).toBe('general');
    } else {
      // If no numberFormat is set, that's acceptable for General format (it's the default)
      expect(cellA1?.style?.numberFormat).toBeUndefined();
    }
  });

  it('should detect text format', async () => {
    const buffer = await createTestWorkbook((wb) => {
      const sheet = wb.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 'text';
      sheet.getCell('A1').numFmt = '@';
    });

    const workbook = await readXlsx(buffer);
    const sheet = workbook.sheets[0]!;

    const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
    expect(cellA1?.style?.numberFormat?.category).toBe('text');
  });

  it('should detect date format', async () => {
    const buffer = await createTestWorkbook((wb) => {
      const sheet = wb.addWorksheet('Sheet1');
      sheet.getCell('A1').value = new Date();
      sheet.getCell('A1').numFmt = 'yyyy-mm-dd';
    });

    const workbook = await readXlsx(buffer);
    const sheet = workbook.sheets[0]!;

    const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
    expect(cellA1?.style?.numberFormat?.category).toBe('date');
  });

  it('should detect time format', async () => {
    const buffer = await createTestWorkbook((wb) => {
      const sheet = wb.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 0.5; // 12:00 PM
      sheet.getCell('A1').numFmt = 'hh:mm:ss';
    });

    const workbook = await readXlsx(buffer);
    const sheet = workbook.sheets[0]!;

    const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
    expect(cellA1?.style?.numberFormat?.category).toBe('time');
  });

  it('should detect scientific format', async () => {
    const buffer = await createTestWorkbook((wb) => {
      const sheet = wb.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 1234567;
      sheet.getCell('A1').numFmt = '0.00E+00';
    });

    const workbook = await readXlsx(buffer);
    const sheet = workbook.sheets[0]!;

    const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
    expect(cellA1?.style?.numberFormat?.category).toBe('scientific');
  });

  it('should detect fraction format', async () => {
    const buffer = await createTestWorkbook((wb) => {
      const sheet = wb.addWorksheet('Sheet1');
      sheet.getCell('A1').value = 0.5;
      sheet.getCell('A1').numFmt = '# ?/?';
    });

    const workbook = await readXlsx(buffer);
    const sheet = workbook.sheets[0]!;

    const cellA1 = sheet.cells.get(cellAddressKey({ row: 0, col: 0 }));
    expect(cellA1?.style?.numberFormat?.category).toBe('fraction');
  });
});
