import type { ChartModel } from './ChartModel';
import type { Sheet } from '../models/Sheet';
import type { CellAddress } from '../models/CellAddress';
import type { CellValue } from '../models/CellValue';
import type { CellRange } from '../models/CellRange';
import { getCell } from '../models/Sheet';
import { cellAddressKey, cellAddressesEqual } from '../models/CellAddress';
import { isAddressInRange, rangeRowCount, rangeColumnCount } from '../models/CellRange';
import { DEFAULT_CHART_COLORS } from './ChartTypes';

/**
 * Represents formatted chart data ready for rendering
 */
export interface ChartData {
  /** Labels for the X-axis (categories) */
  labels: string[];
  /** Data series for the chart */
  series: ChartSeriesData[];
}

/**
 * Represents a single data series
 */
export interface ChartSeriesData {
  /** Name of the series (shown in legend) */
  name: string;
  /** Numeric data values */
  data: number[];
  /** Color for this series */
  color?: string;
}

/**
 * Provides chart data by extracting values from sheet cells
 */
export class ChartDataProvider {
  private chart: ChartModel;
  private sheet: Sheet;
  private cachedData: ChartData | null = null;
  private cacheKey: string | null = null;

  constructor(chart: ChartModel, sheet: Sheet) {
    this.chart = chart;
    this.sheet = sheet;
  }

  /**
   * Updates the chart configuration
   */
  updateChart(chart: ChartModel): void {
    this.chart = chart;
    this.invalidateCache();
  }

  /**
   * Updates the sheet reference
   */
  updateSheet(sheet: Sheet): void {
    this.sheet = sheet;
    this.invalidateCache();
  }

  /**
   * Invalidates the cached data
   */
  invalidateCache(): void {
    this.cachedData = null;
    this.cacheKey = null;
  }

  /**
   * Gets formatted chart data for rendering
   */
  getData(): ChartData {
    const currentCacheKey = this.computeCacheKey();

    if (this.cachedData && this.cacheKey === currentCacheKey) {
      return this.cachedData;
    }

    const rawData = this.getRawData();
    const chartData = this.processRawData(rawData);

    this.cachedData = chartData;
    this.cacheKey = currentCacheKey;

    return chartData;
  }

  /**
   * Gets the raw cell values from the data range
   */
  getRawData(): CellValue[][] {
    const { dataRange } = this.chart;
    const rows = rangeRowCount(dataRange);
    const cols = rangeColumnCount(dataRange);
    const result: CellValue[][] = [];

    for (let row = 0; row < rows; row++) {
      const rowData: CellValue[] = [];
      for (let col = 0; col < cols; col++) {
        const address: CellAddress = {
          row: dataRange.start.row + row,
          col: dataRange.start.col + col,
        };
        const cell = getCell(this.sheet, address);
        rowData.push(cell.value);
      }
      result.push(rowData);
    }

    return result;
  }

  /**
   * Gets all cell addresses that this chart depends on
   */
  getDependencies(): CellAddress[] {
    const { dataRange } = this.chart;
    const dependencies: CellAddress[] = [];

    for (let row = dataRange.start.row; row <= dataRange.end.row; row++) {
      for (let col = dataRange.start.col; col <= dataRange.end.col; col++) {
        dependencies.push({ row, col });
      }
    }

    // Add dependencies from series-specific data ranges
    if (this.chart.series) {
      for (const series of this.chart.series) {
        if (series.dataRange) {
          for (let row = series.dataRange.start.row; row <= series.dataRange.end.row; row++) {
            for (let col = series.dataRange.start.col; col <= series.dataRange.end.col; col++) {
              // Check if not already in main range
              const addr: CellAddress = { row, col };
              if (!isAddressInRange(addr, dataRange)) {
                dependencies.push(addr);
              }
            }
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Checks if the chart needs to be refreshed based on changed cells
   */
  needsRefresh(changedCells: CellAddress[]): boolean {
    const { dataRange } = this.chart;

    for (const changed of changedCells) {
      // Check main data range
      if (isAddressInRange(changed, dataRange)) {
        return true;
      }

      // Check series-specific data ranges
      if (this.chart.series) {
        for (const series of this.chart.series) {
          if (series.dataRange && isAddressInRange(changed, series.dataRange)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Processes raw cell data into chart format
   */
  private processRawData(rawData: CellValue[][]): ChartData {
    const { seriesInRows, firstRowIsLabels, firstColIsLabels } = this.chart;

    if (rawData.length === 0) {
      return { labels: [], series: [] };
    }

    // Determine data boundaries based on label configuration
    const dataStartRow = firstRowIsLabels ? 1 : 0;
    const dataStartCol = firstColIsLabels ? 1 : 0;

    // Extract labels
    const labels = this.extractLabels(rawData, seriesInRows, firstRowIsLabels, firstColIsLabels);

    // Extract series
    const series = this.extractSeries(
      rawData,
      seriesInRows,
      dataStartRow,
      dataStartCol,
      firstRowIsLabels,
      firstColIsLabels
    );

    return { labels, series };
  }

  /**
   * Extracts category labels from raw data
   */
  private extractLabels(
    rawData: CellValue[][],
    seriesInRows: boolean,
    firstRowIsLabels: boolean,
    firstColIsLabels: boolean
  ): string[] {
    const labels: string[] = [];

    if (seriesInRows) {
      // Labels come from first row (excluding first cell if it's a header)
      if (firstRowIsLabels && rawData[0]) {
        const startCol = firstColIsLabels ? 1 : 0;
        for (let col = startCol; col < rawData[0].length; col++) {
          labels.push(this.cellValueToString(rawData[0][col]));
        }
      } else {
        // Generate numeric labels
        const numCols = rawData[0]?.length ?? 0;
        const startCol = firstColIsLabels ? 1 : 0;
        for (let col = startCol; col < numCols; col++) {
          labels.push(String(col - startCol + 1));
        }
      }
    } else {
      // Labels come from first column (excluding first cell if it's a header)
      const startRow = firstRowIsLabels ? 1 : 0;
      if (firstColIsLabels) {
        for (let row = startRow; row < rawData.length; row++) {
          if (rawData[row] && rawData[row][0]) {
            labels.push(this.cellValueToString(rawData[row][0]));
          }
        }
      } else {
        // Generate numeric labels
        for (let row = startRow; row < rawData.length; row++) {
          labels.push(String(row - startRow + 1));
        }
      }
    }

    return labels;
  }

  /**
   * Extracts data series from raw data
   */
  private extractSeries(
    rawData: CellValue[][],
    seriesInRows: boolean,
    dataStartRow: number,
    dataStartCol: number,
    firstRowIsLabels: boolean,
    firstColIsLabels: boolean
  ): ChartSeriesData[] {
    const series: ChartSeriesData[] = [];
    const colors = this.chart.style.colors ?? [...DEFAULT_CHART_COLORS];

    if (seriesInRows) {
      // Each row is a series
      for (let row = dataStartRow; row < rawData.length; row++) {
        const seriesData: number[] = [];
        const rowData = rawData[row];

        if (!rowData) continue;

        // Get series name from first column if configured
        const seriesName = firstColIsLabels && rowData[0]
          ? this.cellValueToString(rowData[0])
          : `Series ${row - dataStartRow + 1}`;

        // Extract data values
        for (let col = dataStartCol; col < rowData.length; col++) {
          seriesData.push(this.cellValueToNumber(rowData[col]));
        }

        const seriesIndex = row - dataStartRow;
        const seriesOverride = this.chart.series?.[seriesIndex];

        series.push({
          name: seriesOverride?.name ?? seriesName,
          data: seriesData,
          color: seriesOverride?.color ?? colors[seriesIndex % colors.length],
        });
      }
    } else {
      // Each column is a series
      if (rawData.length === 0) return series;

      const numCols = rawData[0]?.length ?? 0;

      for (let col = dataStartCol; col < numCols; col++) {
        const seriesData: number[] = [];

        // Get series name from first row if configured
        const seriesName = firstRowIsLabels && rawData[0]?.[col]
          ? this.cellValueToString(rawData[0][col])
          : `Series ${col - dataStartCol + 1}`;

        // Extract data values
        for (let row = dataStartRow; row < rawData.length; row++) {
          const value = rawData[row]?.[col];
          seriesData.push(this.cellValueToNumber(value));
        }

        const seriesIndex = col - dataStartCol;
        const seriesOverride = this.chart.series?.[seriesIndex];

        series.push({
          name: seriesOverride?.name ?? seriesName,
          data: seriesData,
          color: seriesOverride?.color ?? colors[seriesIndex % colors.length],
        });
      }
    }

    return series;
  }

  /**
   * Converts a CellValue to a string for labels
   */
  private cellValueToString(value: CellValue | undefined): string {
    if (!value) return '';

    switch (value.type) {
      case 'empty':
        return '';
      case 'string':
        return value.value;
      case 'number':
        return String(value.value);
      case 'boolean':
        return value.value ? 'TRUE' : 'FALSE';
      case 'error':
        return value.error.code;
    }
  }

  /**
   * Converts a CellValue to a number for data
   */
  private cellValueToNumber(value: CellValue | undefined): number {
    if (!value) return 0;

    switch (value.type) {
      case 'empty':
        return 0;
      case 'number':
        return value.value;
      case 'boolean':
        return value.value ? 1 : 0;
      case 'string': {
        const num = parseFloat(value.value);
        return isNaN(num) ? 0 : num;
      }
      case 'error':
        return 0;
    }
  }

  /**
   * Computes a cache key based on relevant cell values
   */
  private computeCacheKey(): string {
    const dependencies = this.getDependencies();
    const values: string[] = [];

    for (const addr of dependencies) {
      const cell = getCell(this.sheet, addr);
      const key = cellAddressKey(addr);
      const valueKey = this.cellValueToString(cell.value);
      values.push(`${key}:${valueKey}`);
    }

    return values.join('|');
  }
}

/**
 * Creates a new ChartDataProvider instance
 */
export function createChartDataProvider(chart: ChartModel, sheet: Sheet): ChartDataProvider {
  return new ChartDataProvider(chart, sheet);
}
