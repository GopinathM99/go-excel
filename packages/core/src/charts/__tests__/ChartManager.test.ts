import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ChartManager,
  createChartManager,
  type PositionChange,
  type ChartManagerEvent,
} from '../ChartManager';
import { createChart } from '../ChartModel';
import type { ChartModel, CreateChartConfig } from '../ChartModel';

describe('ChartManager', () => {
  let manager: ChartManager;
  let chart1: ChartModel;
  let chart2: ChartModel;
  let chart3: ChartModel;

  const createTestChart = (
    sheetId: string,
    rowStart: number = 0,
    colStart: number = 0
  ): ChartModel => {
    return createChart({
      type: 'bar',
      dataRange: {
        start: { row: rowStart, col: colStart },
        end: { row: rowStart + 5, col: colStart + 3 },
      },
      position: {
        sheetId,
        anchorCell: { row: rowStart, col: colStart + 5 },
        width: 400,
        height: 300,
      },
    });
  };

  beforeEach(() => {
    manager = new ChartManager();
    chart1 = createTestChart('sheet1', 0, 0);
    chart2 = createTestChart('sheet1', 10, 0);
    chart3 = createTestChart('sheet2', 0, 0);
  });

  describe('addChart', () => {
    it('should add a chart to the manager', () => {
      manager.addChart(chart1);
      expect(manager.getChart(chart1.id)).toBe(chart1);
    });

    it('should throw if adding a chart with duplicate ID', () => {
      manager.addChart(chart1);
      expect(() => manager.addChart(chart1)).toThrow();
    });

    it('should emit chartAdded event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);
      manager.addChart(chart1);

      expect(listener).toHaveBeenCalledWith({
        type: 'chartAdded',
        chart: chart1,
      });
    });
  });

  describe('removeChart', () => {
    beforeEach(() => {
      manager.addChart(chart1);
    });

    it('should remove a chart from the manager', () => {
      const result = manager.removeChart(chart1.id);
      expect(result).toBe(true);
      expect(manager.getChart(chart1.id)).toBeUndefined();
    });

    it('should return false if chart does not exist', () => {
      const result = manager.removeChart('nonexistent');
      expect(result).toBe(false);
    });

    it('should emit chartRemoved event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);
      manager.removeChart(chart1.id);

      expect(listener).toHaveBeenCalledWith({
        type: 'chartRemoved',
        chartId: chart1.id,
      });
    });
  });

  describe('getChart', () => {
    it('should return the chart if it exists', () => {
      manager.addChart(chart1);
      expect(manager.getChart(chart1.id)).toBe(chart1);
    });

    it('should return undefined if chart does not exist', () => {
      expect(manager.getChart('nonexistent')).toBeUndefined();
    });
  });

  describe('updateChart', () => {
    beforeEach(() => {
      manager.addChart(chart1);
    });

    it('should update an existing chart', () => {
      const updated = { ...chart1, title: 'Updated Title' };
      manager.updateChart(updated);
      expect(manager.getChart(chart1.id)?.title).toBe('Updated Title');
    });

    it('should throw if chart does not exist', () => {
      expect(() => manager.updateChart(chart2)).toThrow();
    });

    it('should emit chartUpdated event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);
      const updated = { ...chart1, title: 'Updated Title' };
      manager.updateChart(updated);

      expect(listener).toHaveBeenCalledWith({
        type: 'chartUpdated',
        chart: updated,
      });
    });
  });

  describe('getChartsInSheet', () => {
    beforeEach(() => {
      manager.addChart(chart1);
      manager.addChart(chart2);
      manager.addChart(chart3);
    });

    it('should return charts in the specified sheet', () => {
      const result = manager.getChartsInSheet('sheet1');
      expect(result).toHaveLength(2);
      expect(result).toContain(chart1);
      expect(result).toContain(chart2);
    });

    it('should return empty array for sheet with no charts', () => {
      const result = manager.getChartsInSheet('sheet99');
      expect(result).toHaveLength(0);
    });
  });

  describe('getChartsForRange', () => {
    beforeEach(() => {
      manager.addChart(chart1);
      manager.addChart(chart2);
    });

    it('should return charts that overlap with the range', () => {
      const range = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 2 },
      };
      const result = manager.getChartsForRange(range);
      expect(result).toHaveLength(1);
      expect(result).toContain(chart1);
    });

    it('should return empty array if no charts overlap', () => {
      const range = {
        start: { row: 100, col: 100 },
        end: { row: 105, col: 105 },
      };
      const result = manager.getChartsForRange(range);
      expect(result).toHaveLength(0);
    });
  });

  describe('getChartsForCell', () => {
    beforeEach(() => {
      manager.addChart(chart1);
      manager.addChart(chart2);
    });

    it('should return charts that contain the cell', () => {
      const result = manager.getChartsForCell({ row: 2, col: 2 });
      expect(result).toHaveLength(1);
      expect(result).toContain(chart1);
    });

    it('should return empty array if no charts contain the cell', () => {
      const result = manager.getChartsForCell({ row: 100, col: 100 });
      expect(result).toHaveLength(0);
    });
  });

  describe('updateChartPositions', () => {
    beforeEach(() => {
      manager.addChart(chart1);
      manager.addChart(chart2);
    });

    it('should adjust chart positions when rows are inserted', () => {
      const changes: PositionChange[] = [
        { type: 'insertRows', start: 5, count: 3 },
      ];

      manager.updateChartPositions('sheet1', changes);

      // chart1 has anchor at row 0, should not change
      expect(manager.getChart(chart1.id)?.position.anchorCell.row).toBe(0);

      // chart2 has anchor at row 10, should move to 13
      expect(manager.getChart(chart2.id)?.position.anchorCell.row).toBe(13);
    });

    it('should adjust chart positions when rows are deleted', () => {
      const changes: PositionChange[] = [
        { type: 'deleteRows', start: 5, count: 3 },
      ];

      manager.updateChartPositions('sheet1', changes);

      // chart1 should not change
      expect(manager.getChart(chart1.id)?.position.anchorCell.row).toBe(0);

      // chart2 should move from 10 to 7
      expect(manager.getChart(chart2.id)?.position.anchorCell.row).toBe(7);
    });

    it('should adjust data ranges when rows are inserted before data', () => {
      const changes: PositionChange[] = [
        { type: 'insertRows', start: 0, count: 5 },
      ];

      manager.updateChartPositions('sheet1', changes);

      const updatedChart1 = manager.getChart(chart1.id);
      expect(updatedChart1?.dataRange.start.row).toBe(5);
      expect(updatedChart1?.dataRange.end.row).toBe(10);
    });

    it('should adjust data ranges when columns are inserted', () => {
      const changes: PositionChange[] = [
        { type: 'insertColumns', start: 0, count: 2 },
      ];

      manager.updateChartPositions('sheet1', changes);

      const updatedChart1 = manager.getChart(chart1.id);
      expect(updatedChart1?.dataRange.start.col).toBe(2);
      expect(updatedChart1?.dataRange.end.col).toBe(5);
    });

    it('should only affect charts in the specified sheet', () => {
      manager.addChart(chart3);
      const changes: PositionChange[] = [
        { type: 'insertRows', start: 0, count: 5 },
      ];

      manager.updateChartPositions('sheet1', changes);

      // chart3 is in sheet2, should not be affected
      expect(manager.getChart(chart3.id)?.position.anchorCell.row).toBe(0);
      expect(manager.getChart(chart3.id)?.dataRange.start.row).toBe(0);
    });

    it('should emit chartUpdated events for modified charts', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const changes: PositionChange[] = [
        { type: 'insertRows', start: 0, count: 5 },
      ];

      manager.updateChartPositions('sheet1', changes);

      // Both charts in sheet1 should have updates
      const updateCalls = listener.mock.calls.filter(
        (call) => call[0].type === 'chartUpdated'
      );
      expect(updateCalls.length).toBe(2);
    });
  });

  describe('getAllCharts', () => {
    it('should return all charts', () => {
      manager.addChart(chart1);
      manager.addChart(chart2);
      manager.addChart(chart3);

      const result = manager.getAllCharts();
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no charts exist', () => {
      const result = manager.getAllCharts();
      expect(result).toHaveLength(0);
    });
  });

  describe('getChartCount', () => {
    it('should return the number of charts', () => {
      expect(manager.getChartCount()).toBe(0);

      manager.addChart(chart1);
      expect(manager.getChartCount()).toBe(1);

      manager.addChart(chart2);
      expect(manager.getChartCount()).toBe(2);
    });
  });

  describe('hasChart', () => {
    it('should return true if chart exists', () => {
      manager.addChart(chart1);
      expect(manager.hasChart(chart1.id)).toBe(true);
    });

    it('should return false if chart does not exist', () => {
      expect(manager.hasChart('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all charts', () => {
      manager.addChart(chart1);
      manager.addChart(chart2);
      manager.addChart(chart3);

      manager.clear();

      expect(manager.getChartCount()).toBe(0);
    });

    it('should emit chartRemoved event for each chart', () => {
      manager.addChart(chart1);
      manager.addChart(chart2);

      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.clear();

      const removeCalls = listener.mock.calls.filter(
        (call) => call[0].type === 'chartRemoved'
      );
      expect(removeCalls.length).toBe(2);
    });
  });

  describe('clearSheet', () => {
    beforeEach(() => {
      manager.addChart(chart1);
      manager.addChart(chart2);
      manager.addChart(chart3);
    });

    it('should remove only charts in the specified sheet', () => {
      manager.clearSheet('sheet1');

      expect(manager.getChartCount()).toBe(1);
      expect(manager.hasChart(chart3.id)).toBe(true);
      expect(manager.hasChart(chart1.id)).toBe(false);
      expect(manager.hasChart(chart2.id)).toBe(false);
    });

    it('should emit chartRemoved event for each removed chart', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.clearSheet('sheet1');

      const removeCalls = listener.mock.calls.filter(
        (call) => call[0].type === 'chartRemoved'
      );
      expect(removeCalls.length).toBe(2);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      manager.addEventListener(listener);
      manager.addChart(chart1);
      expect(listener).toHaveBeenCalledTimes(1);

      manager.removeEventListener(listener);
      manager.addChart(chart2);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle errors in listeners gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = vi.fn();

      manager.addEventListener(errorListener);
      manager.addEventListener(normalListener);

      // Should not throw
      expect(() => manager.addChart(chart1)).not.toThrow();

      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      manager.addChart(chart1);
      manager.addChart(chart2);

      const json = manager.toJSON();
      expect(json).toHaveLength(2);
      expect(json).toContainEqual(chart1);
      expect(json).toContainEqual(chart2);
    });

    it('should load from JSON', () => {
      manager.addChart(chart1);
      manager.addChart(chart2);

      const json = manager.toJSON();

      const newManager = new ChartManager();
      newManager.fromJSON(json);

      expect(newManager.getChartCount()).toBe(2);
      expect(newManager.getChart(chart1.id)).toEqual(chart1);
      expect(newManager.getChart(chart2.id)).toEqual(chart2);
    });

    it('should clear existing charts when loading from JSON', () => {
      manager.addChart(chart1);
      manager.fromJSON([chart2]);

      expect(manager.getChartCount()).toBe(1);
      expect(manager.hasChart(chart1.id)).toBe(false);
      expect(manager.hasChart(chart2.id)).toBe(true);
    });
  });

  describe('createChartManager factory', () => {
    it('should create a ChartManager instance', () => {
      const newManager = createChartManager();
      expect(newManager).toBeInstanceOf(ChartManager);
    });
  });
});
