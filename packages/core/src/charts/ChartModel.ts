import type { CellRange } from '../models/CellRange';
import type {
  ChartType,
  ChartStyle,
  AxisConfig,
  LegendConfig,
  ChartPosition,
} from './ChartTypes';
import {
  DEFAULT_CHART_STYLE,
  DEFAULT_AXIS_CONFIG,
  DEFAULT_LEGEND_CONFIG,
  DEFAULT_CHART_WIDTH,
  DEFAULT_CHART_HEIGHT,
  chartTypeSupportsAxes,
} from './ChartTypes';
import { generateId } from '@excel/shared';

/**
 * Represents a single data series in a chart
 */
export interface ChartSeries {
  /** Name of the series (shown in legend) */
  name?: string;
  /** Override data range for this specific series */
  dataRange?: CellRange;
  /** Override color for this series */
  color?: string;
  /** Override chart type for this series (for combo charts) */
  type?: ChartType;
}

/**
 * Full chart model containing all configuration
 */
export interface ChartModel {
  /** Unique identifier for this chart */
  id: string;

  /** Type of chart to render */
  type: ChartType;

  /** Chart title */
  title?: string;

  /** Subtitle shown below the title */
  subtitle?: string;

  // Data binding configuration

  /** The cell range containing chart data */
  dataRange: CellRange;

  /** If true, each row is a series; if false, each column is a series */
  seriesInRows: boolean;

  /** If true, first row contains category labels (X-axis labels) */
  firstRowIsLabels: boolean;

  /** If true, first column contains series names */
  firstColIsLabels: boolean;

  // Positioning

  /** Position and size of the chart */
  position: ChartPosition;

  // Styling

  /** Chart styling configuration */
  style: ChartStyle;

  // Axes (for non-pie/doughnut charts)

  /** X-axis configuration */
  xAxis?: AxisConfig;

  /** Y-axis configuration */
  yAxis?: AxisConfig;

  // Legend

  /** Legend configuration */
  legend: LegendConfig;

  // Series overrides

  /** Individual series configurations (overrides auto-detected series) */
  series?: ChartSeries[];

  // Metadata

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  updatedAt: number;
}

/**
 * Configuration options for creating a new chart
 * All fields are optional except dataRange
 */
export type CreateChartConfig = Partial<Omit<ChartModel, 'id' | 'createdAt' | 'updatedAt'>> & {
  dataRange: CellRange;
  position: ChartPosition;
};

/**
 * Creates a new chart with default values
 */
export function createChart(config: CreateChartConfig): ChartModel {
  const now = Date.now();
  const type = config.type ?? 'column';

  const chart: ChartModel = {
    id: generateId(),
    type,
    title: config.title,
    subtitle: config.subtitle,
    dataRange: config.dataRange,
    seriesInRows: config.seriesInRows ?? false,
    firstRowIsLabels: config.firstRowIsLabels ?? true,
    firstColIsLabels: config.firstColIsLabels ?? true,
    position: {
      sheetId: config.position.sheetId,
      anchorCell: config.position.anchorCell,
      width: config.position.width ?? DEFAULT_CHART_WIDTH,
      height: config.position.height ?? DEFAULT_CHART_HEIGHT,
      offsetX: config.position.offsetX ?? 0,
      offsetY: config.position.offsetY ?? 0,
    },
    style: {
      ...DEFAULT_CHART_STYLE,
      ...config.style,
    },
    legend: {
      ...DEFAULT_LEGEND_CONFIG,
      ...config.legend,
    },
    series: config.series,
    createdAt: now,
    updatedAt: now,
  };

  // Add axis config for charts that support axes
  if (chartTypeSupportsAxes(type)) {
    chart.xAxis = {
      ...DEFAULT_AXIS_CONFIG,
      ...config.xAxis,
    };
    chart.yAxis = {
      ...DEFAULT_AXIS_CONFIG,
      ...config.yAxis,
    };
  }

  return chart;
}

/**
 * Updates an existing chart with new values
 * Returns a new chart object (immutable)
 */
export function updateChart(
  chart: ChartModel,
  updates: Partial<Omit<ChartModel, 'id' | 'createdAt'>>
): ChartModel {
  const updatedChart: ChartModel = {
    ...chart,
    ...updates,
    id: chart.id, // Ensure ID cannot be changed
    createdAt: chart.createdAt, // Ensure createdAt cannot be changed
    updatedAt: Date.now(),
  };

  // Deep merge nested objects
  if (updates.position) {
    updatedChart.position = {
      ...chart.position,
      ...updates.position,
    };
  }

  if (updates.style) {
    updatedChart.style = {
      ...chart.style,
      ...updates.style,
    };
  }

  if (updates.legend) {
    updatedChart.legend = {
      ...chart.legend,
      ...updates.legend,
    };
  }

  if (updates.xAxis) {
    updatedChart.xAxis = {
      ...chart.xAxis,
      ...updates.xAxis,
    };
  }

  if (updates.yAxis) {
    updatedChart.yAxis = {
      ...chart.yAxis,
      ...updates.yAxis,
    };
  }

  return updatedChart;
}

/**
 * Updates the chart type and adjusts configuration accordingly
 */
export function updateChartType(chart: ChartModel, newType: ChartType): ChartModel {
  const updatedChart = updateChart(chart, { type: newType });

  // Add/remove axes based on chart type
  if (chartTypeSupportsAxes(newType)) {
    if (!updatedChart.xAxis) {
      updatedChart.xAxis = { ...DEFAULT_AXIS_CONFIG };
    }
    if (!updatedChart.yAxis) {
      updatedChart.yAxis = { ...DEFAULT_AXIS_CONFIG };
    }
  } else {
    updatedChart.xAxis = undefined;
    updatedChart.yAxis = undefined;
  }

  return updatedChart;
}

/**
 * Clones a chart with a new ID
 */
export function cloneChart(chart: ChartModel): ChartModel {
  const now = Date.now();
  return {
    ...chart,
    id: generateId(),
    title: chart.title ? `${chart.title} (Copy)` : undefined,
    createdAt: now,
    updatedAt: now,
    style: { ...chart.style },
    position: { ...chart.position },
    legend: { ...chart.legend },
    xAxis: chart.xAxis ? { ...chart.xAxis } : undefined,
    yAxis: chart.yAxis ? { ...chart.yAxis } : undefined,
    series: chart.series ? chart.series.map((s) => ({ ...s })) : undefined,
  };
}

/**
 * Validates a chart model for completeness
 */
export function validateChartModel(chart: ChartModel): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!chart.id) {
    errors.push('Chart must have an ID');
  }

  if (!chart.dataRange) {
    errors.push('Chart must have a data range');
  }

  if (!chart.position) {
    errors.push('Chart must have a position');
  } else {
    if (!chart.position.sheetId) {
      errors.push('Chart position must have a sheet ID');
    }
    if (chart.position.width <= 0) {
      errors.push('Chart width must be positive');
    }
    if (chart.position.height <= 0) {
      errors.push('Chart height must be positive');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
