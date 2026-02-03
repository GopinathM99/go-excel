import { describe, it, expect, beforeEach } from 'vitest';
import { ChartDataProvider, createChartDataProvider } from '../ChartDataProvider';
import { createChart } from '../ChartModel';
import type { ChartModel } from '../ChartModel';
import { createSheet, setCell } from '../../models/Sheet';
import { createCell } from '../../models/Cell';
import { numberValue, stringValue, emptyValue, booleanValue } from '../../models/CellValue';
import type { Sheet } from '../../models/Sheet';

describe('ChartDataProvider', () => {
  let sheet: Sheet;
  let chart: ChartModel;
  let provider: ChartDataProvider;

  beforeEach(() => {
    // Create a sheet with sample data:
    // |   | A      | B      | C      | D      |
    // | 1 | (empty)| Q1     | Q2     | Q3     |
    // | 2 | North  | 100    | 150    | 200    |
    // | 3 | South  | 80     | 120    | 180    |
    // | 4 | East   | 90     | 110    | 160    |

    sheet = createSheet('Test Sheet');

    // Row 0 (header row)
    sheet = setCell(sheet, createCell({ row: 0, col: 1 }, 'Q1', stringValue('Q1')));
    sheet = setCell(sheet, createCell({ row: 0, col: 2 }, 'Q2', stringValue('Q2')));
    sheet = setCell(sheet, createCell({ row: 0, col: 3 }, 'Q3', stringValue('Q3')));

    // Row 1 (North)
    sheet = setCell(sheet, createCell({ row: 1, col: 0 }, 'North', stringValue('North')));
    sheet = setCell(sheet, createCell({ row: 1, col: 1 }, '100', numberValue(100)));
    sheet = setCell(sheet, createCell({ row: 1, col: 2 }, '150', numberValue(150)));
    sheet = setCell(sheet, createCell({ row: 1, col: 3 }, '200', numberValue(200)));

    // Row 2 (South)
    sheet = setCell(sheet, createCell({ row: 2, col: 0 }, 'South', stringValue('South')));
    sheet = setCell(sheet, createCell({ row: 2, col: 1 }, '80', numberValue(80)));
    sheet = setCell(sheet, createCell({ row: 2, col: 2 }, '120', numberValue(120)));
    sheet = setCell(sheet, createCell({ row: 2, col: 3 }, '180', numberValue(180)));

    // Row 3 (East)
    sheet = setCell(sheet, createCell({ row: 3, col: 0 }, 'East', stringValue('East')));
    sheet = setCell(sheet, createCell({ row: 3, col: 1 }, '90', numberValue(90)));
    sheet = setCell(sheet, createCell({ row: 3, col: 2 }, '110', numberValue(110)));
    sheet = setCell(sheet, createCell({ row: 3, col: 3 }, '160', numberValue(160)));

    chart = createChart({
      type: 'bar',
      title: 'Sales by Region',
      dataRange: {
        start: { row: 0, col: 0 },
        end: { row: 3, col: 3 },
      },
      firstRowIsLabels: true,
      firstColIsLabels: true,
      seriesInRows: false, // Columns are series
      position: {
        sheetId: sheet.id,
        anchorCell: { row: 0, col: 5 },
        width: 400,
        height: 300,
      },
    });

    provider = new ChartDataProvider(chart, sheet);
  });

  describe('getRawData', () => {
    it('should extract raw cell values from the data range', () => {
      const rawData = provider.getRawData();

      expect(rawData.length).toBe(4); // 4 rows
      expect(rawData[0].length).toBe(4); // 4 columns

      // Check first row (headers)
      expect(rawData[0][0].type).toBe('empty');
      expect(rawData[0][1]).toEqual(stringValue('Q1'));
      expect(rawData[0][2]).toEqual(stringValue('Q2'));
      expect(rawData[0][3]).toEqual(stringValue('Q3'));

      // Check data row
      expect(rawData[1][0]).toEqual(stringValue('North'));
      expect(rawData[1][1]).toEqual(numberValue(100));
    });
  });

  describe('getData with columns as series', () => {
    it('should extract labels from first column (excluding header)', () => {
      const data = provider.getData();

      expect(data.labels).toEqual(['North', 'South', 'East']);
    });

    it('should extract series from columns with names from first row', () => {
      const data = provider.getData();

      expect(data.series.length).toBe(3);
      expect(data.series[0].name).toBe('Q1');
      expect(data.series[1].name).toBe('Q2');
      expect(data.series[2].name).toBe('Q3');
    });

    it('should extract numeric data for each series', () => {
      const data = provider.getData();

      expect(data.series[0].data).toEqual([100, 80, 90]);
      expect(data.series[1].data).toEqual([150, 120, 110]);
      expect(data.series[2].data).toEqual([200, 180, 160]);
    });

    it('should assign colors to series', () => {
      const data = provider.getData();

      expect(data.series[0].color).toBeDefined();
      expect(data.series[1].color).toBeDefined();
      expect(data.series[2].color).toBeDefined();
    });
  });

  describe('getData with rows as series', () => {
    beforeEach(() => {
      chart = createChart({
        ...chart,
        seriesInRows: true,
        firstRowIsLabels: true,
        firstColIsLabels: true,
      });
      provider = new ChartDataProvider(chart, sheet);
    });

    it('should extract labels from first row (excluding header)', () => {
      const data = provider.getData();

      expect(data.labels).toEqual(['Q1', 'Q2', 'Q3']);
    });

    it('should extract series from rows with names from first column', () => {
      const data = provider.getData();

      expect(data.series.length).toBe(3);
      expect(data.series[0].name).toBe('North');
      expect(data.series[1].name).toBe('South');
      expect(data.series[2].name).toBe('East');
    });

    it('should extract numeric data for each series', () => {
      const data = provider.getData();

      expect(data.series[0].data).toEqual([100, 150, 200]);
      expect(data.series[1].data).toEqual([80, 120, 180]);
      expect(data.series[2].data).toEqual([90, 110, 160]);
    });
  });

  describe('getData without labels', () => {
    beforeEach(() => {
      chart = createChart({
        type: 'bar',
        dataRange: {
          start: { row: 1, col: 1 },
          end: { row: 3, col: 3 },
        },
        firstRowIsLabels: false,
        firstColIsLabels: false,
        seriesInRows: false,
        position: {
          sheetId: sheet.id,
          anchorCell: { row: 0, col: 5 },
          width: 400,
          height: 300,
        },
      });
      provider = new ChartDataProvider(chart, sheet);
    });

    it('should generate numeric labels', () => {
      const data = provider.getData();

      expect(data.labels).toEqual(['1', '2', '3']);
    });

    it('should generate default series names', () => {
      const data = provider.getData();

      expect(data.series[0].name).toBe('Series 1');
      expect(data.series[1].name).toBe('Series 2');
      expect(data.series[2].name).toBe('Series 3');
    });
  });

  describe('series overrides', () => {
    beforeEach(() => {
      chart = createChart({
        ...chart,
        series: [
          { name: 'Custom Q1', color: '#FF0000' },
          { name: 'Custom Q2' },
          // Third series has no override
        ],
      });
      provider = new ChartDataProvider(chart, sheet);
    });

    it('should use custom series names when provided', () => {
      const data = provider.getData();

      expect(data.series[0].name).toBe('Custom Q1');
      expect(data.series[1].name).toBe('Custom Q2');
      expect(data.series[2].name).toBe('Q3'); // Falls back to cell value
    });

    it('should use custom series colors when provided', () => {
      const data = provider.getData();

      expect(data.series[0].color).toBe('#FF0000');
      // Other series should have default colors
      expect(data.series[1].color).toBeDefined();
      expect(data.series[1].color).not.toBe('#FF0000');
    });
  });

  describe('getDependencies', () => {
    it('should return all cell addresses in the data range', () => {
      const deps = provider.getDependencies();

      // 4 rows x 4 cols = 16 cells
      expect(deps.length).toBe(16);
      expect(deps).toContainEqual({ row: 0, col: 0 });
      expect(deps).toContainEqual({ row: 3, col: 3 });
    });
  });

  describe('needsRefresh', () => {
    it('should return true if changed cell is in data range', () => {
      const result = provider.needsRefresh([{ row: 1, col: 1 }]);
      expect(result).toBe(true);
    });

    it('should return false if changed cell is outside data range', () => {
      const result = provider.needsRefresh([{ row: 10, col: 10 }]);
      expect(result).toBe(false);
    });

    it('should return true if any changed cell is in data range', () => {
      const result = provider.needsRefresh([
        { row: 10, col: 10 },
        { row: 2, col: 2 },
      ]);
      expect(result).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache data and return same object on repeated calls', () => {
      const data1 = provider.getData();
      const data2 = provider.getData();

      expect(data1).toBe(data2); // Same object reference
    });

    it('should invalidate cache when chart is updated', () => {
      const data1 = provider.getData();

      provider.updateChart({
        ...chart,
        title: 'New Title',
      });

      const data2 = provider.getData();
      expect(data1).not.toBe(data2);
    });

    it('should invalidate cache when sheet is updated', () => {
      const data1 = provider.getData();

      const newSheet = setCell(
        sheet,
        createCell({ row: 1, col: 1 }, '999', numberValue(999))
      );
      provider.updateSheet(newSheet);

      const data2 = provider.getData();
      expect(data1).not.toBe(data2);
      expect(data2.series[0].data[0]).toBe(999);
    });

    it('should invalidate cache when invalidateCache is called', () => {
      const data1 = provider.getData();
      provider.invalidateCache();
      const data2 = provider.getData();

      expect(data1).not.toBe(data2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data range', () => {
      const emptyChart = createChart({
        type: 'bar',
        dataRange: {
          start: { row: 100, col: 100 },
          end: { row: 100, col: 100 },
        },
        position: {
          sheetId: sheet.id,
          anchorCell: { row: 0, col: 5 },
          width: 400,
          height: 300,
        },
      });
      const emptyProvider = new ChartDataProvider(emptyChart, sheet);
      const data = emptyProvider.getData();

      expect(data.labels).toEqual([]);
      expect(data.series).toEqual([]);
    });

    it('should handle non-numeric values gracefully', () => {
      // Add a string where we expect a number
      sheet = setCell(
        sheet,
        createCell({ row: 1, col: 1 }, 'text', stringValue('text'))
      );
      provider.updateSheet(sheet);

      const data = provider.getData();
      expect(data.series[0].data[0]).toBe(0); // Non-numeric string converts to 0
    });

    it('should handle boolean values', () => {
      sheet = setCell(
        sheet,
        createCell({ row: 1, col: 1 }, 'TRUE', booleanValue(true))
      );
      provider.updateSheet(sheet);

      const data = provider.getData();
      expect(data.series[0].data[0]).toBe(1); // true converts to 1
    });

    it('should handle numeric strings', () => {
      sheet = setCell(
        sheet,
        createCell({ row: 1, col: 1 }, '42.5', stringValue('42.5'))
      );
      provider.updateSheet(sheet);

      const data = provider.getData();
      expect(data.series[0].data[0]).toBe(42.5);
    });
  });

  describe('createChartDataProvider factory', () => {
    it('should create a ChartDataProvider instance', () => {
      const newProvider = createChartDataProvider(chart, sheet);
      expect(newProvider).toBeInstanceOf(ChartDataProvider);
    });
  });
});
