/**
 * Charts module - React components for Excel-like charts
 *
 * This module provides React components that integrate with the core
 * chart model and render charts using ECharts library.
 *
 * Usage:
 * ```tsx
 * import { BarChart, LineChart, PieChart, ChartContainer } from './Charts';
 *
 * // Using specific chart component
 * <BarChart chart={chartModel} horizontal={false} theme="colorful" />
 *
 * // Using generic container (auto-selects chart type from model)
 * <ChartContainer chart={chartModel} />
 * ```
 */

// Main container component
export { ChartContainer } from './ChartContainer';
export type { ChartContainerProps, ChartContainerHandle } from './ChartContainer';

// Bar/Column chart components
export { BarChart, ColumnChart, HorizontalBarChart } from './BarChart';
export type { BarChartProps } from './BarChart';

// Line chart components
export { LineChart, AreaChart, SmoothLineChart } from './LineChart';
export type { LineChartProps } from './LineChart';

// Pie/Donut chart components
export { PieChart, DonutChart } from './PieChart';
export type { PieChartProps } from './PieChart';

// Re-export hook and types for convenience
export { useChart, useChartManager, useChartManagerEvents, CHART_THEMES } from '../../hooks/useChart';
export type { UseChartOptions, UseChartResult, ChartTheme } from '../../hooks/useChart';
