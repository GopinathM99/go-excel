import React, { forwardRef, useMemo } from 'react';
import type { ChartModel } from '@excel/core';
import { ChartContainer, type ChartContainerHandle, type ChartContainerProps } from './ChartContainer';
import type { UseChartOptions, ChartTheme } from '../../hooks/useChart';

/**
 * Props for BarChart component
 */
export interface BarChartProps extends Omit<ChartContainerProps, 'chart' | 'options'> {
  /** The ChartModel from core */
  chart: ChartModel | null;
  /** Whether to render as horizontal bar (true) or vertical column (false) */
  horizontal?: boolean;
  /** Color theme for the chart */
  theme?: ChartTheme;
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * BarChart - Bar/Column chart component
 *
 * Features:
 * - Horizontal (bar) and vertical (column) variants
 * - Multiple series support
 * - Legend, axis labels, gridlines
 * - Responsive sizing
 * - Tooltip on hover
 * - Export as image option
 */
export const BarChart = forwardRef<ChartContainerHandle, BarChartProps>(
  function BarChart(
    {
      chart,
      horizontal = false,
      theme = 'default',
      animationDuration = 500,
      className = '',
      ...props
    },
    ref
  ) {
    // Override chart type based on horizontal prop
    const adjustedChart = useMemo((): ChartModel | null => {
      if (!chart) return null;

      // Force the chart type to bar or column based on horizontal prop
      return {
        ...chart,
        type: horizontal ? 'bar' : 'column',
      };
    }, [chart, horizontal]);

    const chartOptions: UseChartOptions = useMemo(
      () => ({
        theme,
        animationDuration,
      }),
      [theme, animationDuration]
    );

    return (
      <ChartContainer
        ref={ref}
        chart={adjustedChart}
        options={chartOptions}
        className={`bar-chart ${horizontal ? 'bar-chart--horizontal' : 'bar-chart--vertical'} ${className}`}
        {...props}
      />
    );
  }
);

/**
 * ColumnChart - Alias for vertical BarChart
 */
export const ColumnChart = forwardRef<ChartContainerHandle, Omit<BarChartProps, 'horizontal'>>(
  function ColumnChart(props, ref) {
    return <BarChart ref={ref} {...props} horizontal={false} />;
  }
);

/**
 * HorizontalBarChart - Alias for horizontal BarChart
 */
export const HorizontalBarChart = forwardRef<ChartContainerHandle, Omit<BarChartProps, 'horizontal'>>(
  function HorizontalBarChart(props, ref) {
    return <BarChart ref={ref} {...props} horizontal={true} />;
  }
);

export default BarChart;
