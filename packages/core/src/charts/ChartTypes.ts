import type { CellAddress } from '../models/CellAddress';

/**
 * Supported chart types
 */
export type ChartType =
  | 'bar'
  | 'column'
  | 'line'
  | 'pie'
  | 'area'
  | 'scatter'
  | 'doughnut';

/**
 * Chart styling configuration
 */
export interface ChartStyle {
  /** Array of colors for series (will cycle if more series than colors) */
  colors?: string[];
  /** Background color of the chart area */
  backgroundColor?: string;
  /** Border color around the chart */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Font family for all text elements */
  fontFamily?: string;
  /** Base font size in pixels */
  fontSize?: number;
}

/**
 * Axis configuration for X and Y axes
 */
export interface AxisConfig {
  /** Axis title */
  title?: string;
  /** Minimum value (auto if not specified) */
  min?: number;
  /** Maximum value (auto if not specified) */
  max?: number;
  /** Whether to show grid lines */
  gridLines?: boolean;
  /** Rotation angle for axis labels in degrees */
  labelRotation?: number;
  /** Number format for axis labels (e.g., '#,##0', '0.00%') */
  numberFormat?: string;
  /** Step size between ticks (auto if not specified) */
  stepSize?: number;
}

/**
 * Legend configuration
 */
export interface LegendConfig {
  /** Whether to show the legend */
  show: boolean;
  /** Position of the legend relative to the chart */
  position: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Chart position and size within a sheet
 */
export interface ChartPosition {
  /** ID of the sheet containing this chart */
  sheetId: string;
  /** Cell where the top-left corner of the chart is anchored */
  anchorCell: CellAddress;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Horizontal offset from the anchor cell in pixels */
  offsetX?: number;
  /** Vertical offset from the anchor cell in pixels */
  offsetY?: number;
}

/**
 * Default color palette for charts
 */
export const DEFAULT_CHART_COLORS: readonly string[] = [
  '#4285F4', // Google Blue
  '#EA4335', // Google Red
  '#FBBC04', // Google Yellow
  '#34A853', // Google Green
  '#FF6D01', // Orange
  '#46BDC6', // Teal
  '#7B1FA2', // Purple
  '#C2185B', // Pink
  '#00ACC1', // Cyan
  '#8D6E63', // Brown
] as const;

/**
 * Default chart style
 */
export const DEFAULT_CHART_STYLE: ChartStyle = {
  colors: [...DEFAULT_CHART_COLORS],
  backgroundColor: '#FFFFFF',
  borderColor: '#E0E0E0',
  borderWidth: 1,
  fontFamily: 'Arial, sans-serif',
  fontSize: 12,
};

/**
 * Default axis configuration
 */
export const DEFAULT_AXIS_CONFIG: AxisConfig = {
  gridLines: true,
  labelRotation: 0,
};

/**
 * Default legend configuration
 */
export const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  show: true,
  position: 'bottom',
};

/**
 * Default chart dimensions
 */
export const DEFAULT_CHART_WIDTH = 400;
export const DEFAULT_CHART_HEIGHT = 300;

/**
 * Checks if a chart type supports axes (non-pie/doughnut charts)
 */
export function chartTypeSupportsAxes(type: ChartType): boolean {
  return type !== 'pie' && type !== 'doughnut';
}

/**
 * Checks if a chart type is a circular/radial chart
 */
export function isCircularChart(type: ChartType): boolean {
  return type === 'pie' || type === 'doughnut';
}
