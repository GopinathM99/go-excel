import { describe, it, expect } from 'vitest';
import {
  chartTypeSupportsAxes,
  isCircularChart,
  DEFAULT_CHART_COLORS,
  DEFAULT_CHART_STYLE,
  DEFAULT_AXIS_CONFIG,
  DEFAULT_LEGEND_CONFIG,
  DEFAULT_CHART_WIDTH,
  DEFAULT_CHART_HEIGHT,
} from '../ChartTypes';

describe('ChartTypes', () => {
  describe('chartTypeSupportsAxes', () => {
    it('should return true for bar charts', () => {
      expect(chartTypeSupportsAxes('bar')).toBe(true);
    });

    it('should return true for column charts', () => {
      expect(chartTypeSupportsAxes('column')).toBe(true);
    });

    it('should return true for line charts', () => {
      expect(chartTypeSupportsAxes('line')).toBe(true);
    });

    it('should return true for area charts', () => {
      expect(chartTypeSupportsAxes('area')).toBe(true);
    });

    it('should return true for scatter charts', () => {
      expect(chartTypeSupportsAxes('scatter')).toBe(true);
    });

    it('should return false for pie charts', () => {
      expect(chartTypeSupportsAxes('pie')).toBe(false);
    });

    it('should return false for doughnut charts', () => {
      expect(chartTypeSupportsAxes('doughnut')).toBe(false);
    });
  });

  describe('isCircularChart', () => {
    it('should return true for pie charts', () => {
      expect(isCircularChart('pie')).toBe(true);
    });

    it('should return true for doughnut charts', () => {
      expect(isCircularChart('doughnut')).toBe(true);
    });

    it('should return false for bar charts', () => {
      expect(isCircularChart('bar')).toBe(false);
    });

    it('should return false for line charts', () => {
      expect(isCircularChart('line')).toBe(false);
    });
  });

  describe('default values', () => {
    it('should have default colors defined', () => {
      expect(DEFAULT_CHART_COLORS).toBeDefined();
      expect(DEFAULT_CHART_COLORS.length).toBeGreaterThan(0);
      expect(DEFAULT_CHART_COLORS[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have default chart style defined', () => {
      expect(DEFAULT_CHART_STYLE).toBeDefined();
      expect(DEFAULT_CHART_STYLE.colors).toBeDefined();
      expect(DEFAULT_CHART_STYLE.backgroundColor).toBe('#FFFFFF');
      expect(DEFAULT_CHART_STYLE.fontFamily).toBeDefined();
    });

    it('should have default axis config defined', () => {
      expect(DEFAULT_AXIS_CONFIG).toBeDefined();
      expect(DEFAULT_AXIS_CONFIG.gridLines).toBe(true);
      expect(DEFAULT_AXIS_CONFIG.labelRotation).toBe(0);
    });

    it('should have default legend config defined', () => {
      expect(DEFAULT_LEGEND_CONFIG).toBeDefined();
      expect(DEFAULT_LEGEND_CONFIG.show).toBe(true);
      expect(DEFAULT_LEGEND_CONFIG.position).toBe('bottom');
    });

    it('should have default chart dimensions defined', () => {
      expect(DEFAULT_CHART_WIDTH).toBe(400);
      expect(DEFAULT_CHART_HEIGHT).toBe(300);
    });
  });
});
