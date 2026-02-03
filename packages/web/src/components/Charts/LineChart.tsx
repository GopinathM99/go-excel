import React, { forwardRef, useMemo } from 'react';
import type { ChartModel } from '@excel/core';
import { ChartContainer, type ChartContainerHandle, type ChartContainerProps } from './ChartContainer';
import type { UseChartOptions, ChartTheme } from '../../hooks/useChart';

/**
 * Props for LineChart component
 */
export interface LineChartProps extends Omit<ChartContainerProps, 'chart' | 'options'> {
  /** The ChartModel from core */
  chart: ChartModel | null;
  /** Whether to use smooth (curved) lines */
  smooth?: boolean;
  /** Whether to show data point markers */
  showMarkers?: boolean;
  /** Whether to fill area under the line (area chart) */
  showArea?: boolean;
  /** Color theme for the chart */
  theme?: ChartTheme;
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * LineChart - Line chart component
 *
 * Features:
 * - Multiple series support
 * - Data point markers (optional)
 * - Legend, axis labels, gridlines
 * - Smooth/straight line option
 * - Area fill option
 * - Responsive sizing
 * - Tooltip on hover
 * - Export as image option
 */
export const LineChart = forwardRef<ChartContainerHandle, LineChartProps>(
  function LineChart(
    {
      chart,
      smooth = false,
      showMarkers = true,
      showArea = false,
      theme = 'default',
      animationDuration = 500,
      className = '',
      ...props
    },
    ref
  ) {
    // Override chart type based on showArea prop
    const adjustedChart = useMemo((): ChartModel | null => {
      if (!chart) return null;

      return {
        ...chart,
        type: showArea ? 'area' : 'line',
      };
    }, [chart, showArea]);

    const chartOptions: UseChartOptions = useMemo(
      () => ({
        theme,
        smooth,
        showMarkers,
        animationDuration,
      }),
      [theme, smooth, showMarkers, animationDuration]
    );

    return (
      <ChartContainer
        ref={ref}
        chart={adjustedChart}
        options={chartOptions}
        className={`line-chart ${smooth ? 'line-chart--smooth' : ''} ${showArea ? 'line-chart--area' : ''} ${className}`}
        {...props}
      />
    );
  }
);

/**
 * AreaChart - Alias for LineChart with area fill
 */
export const AreaChart = forwardRef<ChartContainerHandle, Omit<LineChartProps, 'showArea'>>(
  function AreaChart(props, ref) {
    return <LineChart ref={ref} {...props} showArea={true} />;
  }
);

/**
 * SmoothLineChart - Alias for LineChart with smooth curves
 */
export const SmoothLineChart = forwardRef<ChartContainerHandle, Omit<LineChartProps, 'smooth'>>(
  function SmoothLineChart(props, ref) {
    return <LineChart ref={ref} {...props} smooth={true} />;
  }
);

export default LineChart;
