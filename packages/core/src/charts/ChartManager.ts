import type { ChartModel } from './ChartModel';
import type { CellRange } from '../models/CellRange';
import type { CellAddress } from '../models/CellAddress';
import { isAddressInRange, rangesOverlap } from '../models/CellRange';

/**
 * Position change information for row/column insertion/deletion
 */
export interface PositionChange {
  type: 'insertRows' | 'deleteRows' | 'insertColumns' | 'deleteColumns';
  start: number;
  count: number;
}

/**
 * Collection of position changes to apply
 */
export type PositionChanges = PositionChange[];

/**
 * Event types emitted by the ChartManager
 */
export type ChartManagerEvent =
  | { type: 'chartAdded'; chart: ChartModel }
  | { type: 'chartRemoved'; chartId: string }
  | { type: 'chartUpdated'; chart: ChartModel }
  | { type: 'chartsReordered'; chartIds: string[] };

/**
 * Event listener callback
 */
export type ChartManagerEventListener = (event: ChartManagerEvent) => void;

/**
 * Manages charts within a workbook
 */
export class ChartManager {
  private charts: Map<string, ChartModel>;
  private listeners: Set<ChartManagerEventListener>;

  constructor() {
    this.charts = new Map();
    this.listeners = new Set();
  }

  /**
   * Adds a chart to the manager
   */
  addChart(chart: ChartModel): void {
    if (this.charts.has(chart.id)) {
      throw new Error(`Chart with ID ${chart.id} already exists`);
    }

    this.charts.set(chart.id, chart);
    this.emit({ type: 'chartAdded', chart });
  }

  /**
   * Removes a chart by ID
   */
  removeChart(chartId: string): boolean {
    const removed = this.charts.delete(chartId);
    if (removed) {
      this.emit({ type: 'chartRemoved', chartId });
    }
    return removed;
  }

  /**
   * Gets a chart by ID
   */
  getChart(chartId: string): ChartModel | undefined {
    return this.charts.get(chartId);
  }

  /**
   * Updates a chart
   */
  updateChart(chart: ChartModel): void {
    if (!this.charts.has(chart.id)) {
      throw new Error(`Chart with ID ${chart.id} does not exist`);
    }

    this.charts.set(chart.id, chart);
    this.emit({ type: 'chartUpdated', chart });
  }

  /**
   * Gets all charts in a specific sheet
   */
  getChartsInSheet(sheetId: string): ChartModel[] {
    const result: ChartModel[] = [];

    for (const chart of this.charts.values()) {
      if (chart.position.sheetId === sheetId) {
        result.push(chart);
      }
    }

    return result;
  }

  /**
   * Gets all charts that depend on a specific range
   * Used to determine which charts need to refresh when cells change
   */
  getChartsForRange(range: CellRange): ChartModel[] {
    const result: ChartModel[] = [];

    for (const chart of this.charts.values()) {
      // Check if chart's data range overlaps with the given range
      if (rangesOverlap(chart.dataRange, range)) {
        result.push(chart);
        continue;
      }

      // Check series-specific ranges
      if (chart.series) {
        for (const series of chart.series) {
          if (series.dataRange && rangesOverlap(series.dataRange, range)) {
            result.push(chart);
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Gets all charts that would be affected by a cell address
   */
  getChartsForCell(address: CellAddress): ChartModel[] {
    const result: ChartModel[] = [];

    for (const chart of this.charts.values()) {
      // Check if cell is in chart's data range
      if (isAddressInRange(address, chart.dataRange)) {
        result.push(chart);
        continue;
      }

      // Check series-specific ranges
      if (chart.series) {
        for (const series of chart.series) {
          if (series.dataRange && isAddressInRange(address, series.dataRange)) {
            result.push(chart);
            break;
          }
        }
      }
    }

    return result;
  }

  /**
   * Updates chart positions after row/column insertion or deletion
   */
  updateChartPositions(sheetId: string, changes: PositionChanges): void {
    const chartsInSheet = this.getChartsInSheet(sheetId);

    for (const chart of chartsInSheet) {
      let updatedChart = chart;
      let modified = false;

      for (const change of changes) {
        const result = this.applyPositionChange(updatedChart, change);
        if (result.modified) {
          updatedChart = result.chart;
          modified = true;
        }
      }

      if (modified) {
        this.charts.set(updatedChart.id, updatedChart);
        this.emit({ type: 'chartUpdated', chart: updatedChart });
      }
    }
  }

  /**
   * Applies a single position change to a chart
   */
  private applyPositionChange(
    chart: ChartModel,
    change: PositionChange
  ): { chart: ChartModel; modified: boolean } {
    let modified = false;
    let updatedChart = { ...chart };

    // Update anchor position
    const anchorCell = { ...chart.position.anchorCell };

    switch (change.type) {
      case 'insertRows':
        if (anchorCell.row >= change.start) {
          anchorCell.row += change.count;
          modified = true;
        }
        break;

      case 'deleteRows':
        if (anchorCell.row >= change.start) {
          if (anchorCell.row < change.start + change.count) {
            // Anchor is in deleted range - move to deletion start
            anchorCell.row = change.start;
          } else {
            anchorCell.row -= change.count;
          }
          modified = true;
        }
        break;

      case 'insertColumns':
        if (anchorCell.col >= change.start) {
          anchorCell.col += change.count;
          modified = true;
        }
        break;

      case 'deleteColumns':
        if (anchorCell.col >= change.start) {
          if (anchorCell.col < change.start + change.count) {
            // Anchor is in deleted range - move to deletion start
            anchorCell.col = change.start;
          } else {
            anchorCell.col -= change.count;
          }
          modified = true;
        }
        break;
    }

    if (modified) {
      updatedChart = {
        ...updatedChart,
        position: {
          ...updatedChart.position,
          anchorCell,
        },
      };
    }

    // Update data range
    const dataRangeResult = this.adjustRange(chart.dataRange, change);
    if (dataRangeResult.modified) {
      updatedChart = {
        ...updatedChart,
        dataRange: dataRangeResult.range,
      };
      modified = true;
    }

    // Update series data ranges
    if (chart.series) {
      const updatedSeries = chart.series.map((series) => {
        if (series.dataRange) {
          const seriesRangeResult = this.adjustRange(series.dataRange, change);
          if (seriesRangeResult.modified) {
            modified = true;
            return { ...series, dataRange: seriesRangeResult.range };
          }
        }
        return series;
      });

      if (modified && chart.series !== updatedSeries) {
        updatedChart = { ...updatedChart, series: updatedSeries };
      }
    }

    return { chart: updatedChart, modified };
  }

  /**
   * Adjusts a cell range based on a position change
   */
  private adjustRange(
    range: CellRange,
    change: PositionChange
  ): { range: CellRange; modified: boolean } {
    const start = { ...range.start };
    const end = { ...range.end };
    let modified = false;

    switch (change.type) {
      case 'insertRows':
        if (start.row >= change.start) {
          start.row += change.count;
          modified = true;
        }
        if (end.row >= change.start) {
          end.row += change.count;
          modified = true;
        }
        break;

      case 'deleteRows': {
        const deleteEnd = change.start + change.count - 1;

        // Adjust start row
        if (start.row >= change.start) {
          if (start.row <= deleteEnd) {
            start.row = change.start;
          } else {
            start.row -= change.count;
          }
          modified = true;
        }

        // Adjust end row
        if (end.row >= change.start) {
          if (end.row <= deleteEnd) {
            end.row = Math.max(change.start, start.row);
          } else {
            end.row -= change.count;
          }
          modified = true;
        }
        break;
      }

      case 'insertColumns':
        if (start.col >= change.start) {
          start.col += change.count;
          modified = true;
        }
        if (end.col >= change.start) {
          end.col += change.count;
          modified = true;
        }
        break;

      case 'deleteColumns': {
        const deleteEnd = change.start + change.count - 1;

        // Adjust start column
        if (start.col >= change.start) {
          if (start.col <= deleteEnd) {
            start.col = change.start;
          } else {
            start.col -= change.count;
          }
          modified = true;
        }

        // Adjust end column
        if (end.col >= change.start) {
          if (end.col <= deleteEnd) {
            end.col = Math.max(change.start, start.col);
          } else {
            end.col -= change.count;
          }
          modified = true;
        }
        break;
      }
    }

    return { range: { start, end }, modified };
  }

  /**
   * Gets all charts
   */
  getAllCharts(): ChartModel[] {
    return Array.from(this.charts.values());
  }

  /**
   * Gets the number of charts
   */
  getChartCount(): number {
    return this.charts.size;
  }

  /**
   * Checks if a chart exists
   */
  hasChart(chartId: string): boolean {
    return this.charts.has(chartId);
  }

  /**
   * Clears all charts
   */
  clear(): void {
    const chartIds = Array.from(this.charts.keys());
    this.charts.clear();

    for (const chartId of chartIds) {
      this.emit({ type: 'chartRemoved', chartId });
    }
  }

  /**
   * Clears all charts in a specific sheet
   */
  clearSheet(sheetId: string): void {
    const chartsToRemove = this.getChartsInSheet(sheetId);

    for (const chart of chartsToRemove) {
      this.charts.delete(chart.id);
      this.emit({ type: 'chartRemoved', chartId: chart.id });
    }
  }

  /**
   * Adds an event listener
   */
  addEventListener(listener: ChartManagerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(listener: ChartManagerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Emits an event to all listeners
   */
  private emit(event: ChartManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in chart manager event listener:', error);
      }
    }
  }

  /**
   * Serializes the chart manager state
   */
  toJSON(): ChartModel[] {
    return this.getAllCharts();
  }

  /**
   * Loads charts from serialized state
   */
  fromJSON(charts: ChartModel[]): void {
    this.clear();
    for (const chart of charts) {
      this.charts.set(chart.id, chart);
    }
  }
}

/**
 * Creates a new ChartManager instance
 */
export function createChartManager(): ChartManager {
  return new ChartManager();
}
