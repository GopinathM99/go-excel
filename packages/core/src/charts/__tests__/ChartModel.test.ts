import { describe, it, expect } from 'vitest';
import {
  createChart,
  updateChart,
  updateChartType,
  cloneChart,
  validateChartModel,
} from '../ChartModel';
import type { CreateChartConfig, ChartModel } from '../ChartModel';
import { DEFAULT_CHART_WIDTH, DEFAULT_CHART_HEIGHT } from '../ChartTypes';

describe('ChartModel', () => {
  const minimalConfig: CreateChartConfig = {
    dataRange: {
      start: { row: 0, col: 0 },
      end: { row: 5, col: 3 },
    },
    position: {
      sheetId: 'sheet1',
      anchorCell: { row: 0, col: 5 },
      width: 400,
      height: 300,
    },
  };

  describe('createChart', () => {
    it('should create a chart with minimal configuration', () => {
      const chart = createChart(minimalConfig);

      expect(chart.id).toBeDefined();
      expect(chart.type).toBe('column'); // Default type
      expect(chart.dataRange).toEqual(minimalConfig.dataRange);
      expect(chart.position.sheetId).toBe('sheet1');
      expect(chart.position.width).toBe(400);
      expect(chart.position.height).toBe(300);
    });

    it('should generate unique IDs for each chart', () => {
      const chart1 = createChart(minimalConfig);
      const chart2 = createChart(minimalConfig);

      expect(chart1.id).not.toBe(chart2.id);
    });

    it('should set default values correctly', () => {
      const chart = createChart(minimalConfig);

      expect(chart.seriesInRows).toBe(false);
      expect(chart.firstRowIsLabels).toBe(true);
      expect(chart.firstColIsLabels).toBe(true);
      expect(chart.legend.show).toBe(true);
      expect(chart.legend.position).toBe('bottom');
      expect(chart.style.colors).toBeDefined();
      expect(chart.position.offsetX).toBe(0);
      expect(chart.position.offsetY).toBe(0);
    });

    it('should set axes for non-circular chart types', () => {
      const chart = createChart({ ...minimalConfig, type: 'bar' });

      expect(chart.xAxis).toBeDefined();
      expect(chart.yAxis).toBeDefined();
      expect(chart.xAxis?.gridLines).toBe(true);
    });

    it('should not set axes for pie charts', () => {
      const chart = createChart({ ...minimalConfig, type: 'pie' });

      expect(chart.xAxis).toBeUndefined();
      expect(chart.yAxis).toBeUndefined();
    });

    it('should accept custom configuration', () => {
      const chart = createChart({
        ...minimalConfig,
        type: 'line',
        title: 'Sales Chart',
        seriesInRows: true,
        firstRowIsLabels: false,
        legend: { show: false, position: 'right' },
        style: { backgroundColor: '#F0F0F0' },
      });

      expect(chart.type).toBe('line');
      expect(chart.title).toBe('Sales Chart');
      expect(chart.seriesInRows).toBe(true);
      expect(chart.firstRowIsLabels).toBe(false);
      expect(chart.legend.show).toBe(false);
      expect(chart.legend.position).toBe('right');
      expect(chart.style.backgroundColor).toBe('#F0F0F0');
    });

    it('should set timestamps', () => {
      const before = Date.now();
      const chart = createChart(minimalConfig);
      const after = Date.now();

      expect(chart.createdAt).toBeGreaterThanOrEqual(before);
      expect(chart.createdAt).toBeLessThanOrEqual(after);
      expect(chart.updatedAt).toBe(chart.createdAt);
    });
  });

  describe('updateChart', () => {
    it('should update chart properties immutably', () => {
      const original = createChart(minimalConfig);
      const updated = updateChart(original, { title: 'New Title' });

      expect(updated).not.toBe(original);
      expect(updated.title).toBe('New Title');
      expect(original.title).toBeUndefined();
    });

    it('should preserve the original ID', () => {
      const original = createChart(minimalConfig);
      const updated = updateChart(original, { title: 'New Title' });

      expect(updated.id).toBe(original.id);
    });

    it('should preserve the original createdAt', () => {
      const original = createChart(minimalConfig);
      const updated = updateChart(original, { title: 'New Title' });

      expect(updated.createdAt).toBe(original.createdAt);
    });

    it('should update the updatedAt timestamp', () => {
      const original = createChart(minimalConfig);

      // Wait a tiny bit to ensure different timestamp
      const updated = updateChart(original, { title: 'New Title' });

      expect(updated.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
    });

    it('should deep merge nested objects', () => {
      const original = createChart(minimalConfig);
      const updated = updateChart(original, {
        style: { backgroundColor: '#000000' },
      });

      // Should have new backgroundColor but preserve other style properties
      expect(updated.style.backgroundColor).toBe('#000000');
      expect(updated.style.colors).toBeDefined();
      expect(updated.style.fontFamily).toBeDefined();
    });

    it('should update position properties', () => {
      const original = createChart(minimalConfig);
      const updated = updateChart(original, {
        position: { ...original.position, width: 600 },
      });

      expect(updated.position.width).toBe(600);
      expect(updated.position.height).toBe(300); // Unchanged
    });
  });

  describe('updateChartType', () => {
    it('should change chart type', () => {
      const original = createChart({ ...minimalConfig, type: 'bar' });
      const updated = updateChartType(original, 'line');

      expect(updated.type).toBe('line');
    });

    it('should add axes when changing from pie to bar', () => {
      const original = createChart({ ...minimalConfig, type: 'pie' });
      expect(original.xAxis).toBeUndefined();

      const updated = updateChartType(original, 'bar');

      expect(updated.xAxis).toBeDefined();
      expect(updated.yAxis).toBeDefined();
    });

    it('should remove axes when changing from bar to pie', () => {
      const original = createChart({ ...minimalConfig, type: 'bar' });
      expect(original.xAxis).toBeDefined();

      const updated = updateChartType(original, 'pie');

      expect(updated.xAxis).toBeUndefined();
      expect(updated.yAxis).toBeUndefined();
    });
  });

  describe('cloneChart', () => {
    it('should create a copy with a new ID', () => {
      const original = createChart({
        ...minimalConfig,
        title: 'Original',
      });
      const cloned = cloneChart(original);

      expect(cloned.id).not.toBe(original.id);
    });

    it('should append (Copy) to title if present', () => {
      const original = createChart({
        ...minimalConfig,
        title: 'Sales Chart',
      });
      const cloned = cloneChart(original);

      expect(cloned.title).toBe('Sales Chart (Copy)');
    });

    it('should preserve all other properties', () => {
      const original = createChart({
        ...minimalConfig,
        type: 'line',
        seriesInRows: true,
        style: { backgroundColor: '#F0F0F0' },
      });
      const cloned = cloneChart(original);

      expect(cloned.type).toBe(original.type);
      expect(cloned.seriesInRows).toBe(original.seriesInRows);
      expect(cloned.style.backgroundColor).toBe(original.style.backgroundColor);
      expect(cloned.dataRange).toEqual(original.dataRange);
    });

    it('should have new timestamps', () => {
      const original = createChart(minimalConfig);
      const cloned = cloneChart(original);

      expect(cloned.createdAt).toBeGreaterThanOrEqual(original.createdAt);
    });
  });

  describe('validateChartModel', () => {
    it('should validate a correct chart model', () => {
      const chart = createChart(minimalConfig);
      const result = validateChartModel(chart);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing ID', () => {
      const chart = createChart(minimalConfig);
      const invalid = { ...chart, id: '' };
      const result = validateChartModel(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chart must have an ID');
    });

    it('should catch missing data range', () => {
      const chart = createChart(minimalConfig);
      const invalid = { ...chart, dataRange: null as any };
      const result = validateChartModel(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chart must have a data range');
    });

    it('should catch missing position', () => {
      const chart = createChart(minimalConfig);
      const invalid = { ...chart, position: null as any };
      const result = validateChartModel(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chart must have a position');
    });

    it('should catch invalid dimensions', () => {
      const chart = createChart(minimalConfig);
      const invalid = {
        ...chart,
        position: { ...chart.position, width: 0, height: -10 },
      };
      const result = validateChartModel(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chart width must be positive');
      expect(result.errors).toContain('Chart height must be positive');
    });

    it('should catch missing sheet ID in position', () => {
      const chart = createChart(minimalConfig);
      const invalid = {
        ...chart,
        position: { ...chart.position, sheetId: '' },
      };
      const result = validateChartModel(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chart position must have a sheet ID');
    });
  });
});
