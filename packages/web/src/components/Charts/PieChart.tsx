import React, { forwardRef, useMemo } from 'react';
import type { ChartModel } from '@excel/core';
import { ChartContainer, type ChartContainerHandle, type ChartContainerProps } from './ChartContainer';
import type { UseChartOptions, ChartTheme } from '../../hooks/useChart';

/**
 * Props for PieChart component
 */
export interface PieChartProps extends Omit<ChartContainerProps, 'chart' | 'options'> {
  /** The ChartModel from core */
  chart: ChartModel | null;
  /** Whether to render as a donut chart (with center hole) */
  donut?: boolean;
  /** Color theme for the chart */
  theme?: ChartTheme;
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * PieChart - Pie/Donut chart component
 *
 * Features:
 * - Labels with percentages
 * - Legend support
 * - Donut variant option
 * - Multiple color themes
 * - Responsive sizing
 * - Tooltip on hover
 * - Export as image option
 */
export const PieChart = forwardRef<ChartContainerHandle, PieChartProps>(
  function PieChart(
    {
      chart,
      donut = false,
      theme = 'default',
      animationDuration = 500,
      className = '',
      ...props
    },
    ref
  ) {
    // Override chart type based on donut prop
    const adjustedChart = useMemo((): ChartModel | null => {
      if (!chart) return null;

      return {
        ...chart,
        type: donut ? 'doughnut' : 'pie',
      };
    }, [chart, donut]);

    const chartOptions: UseChartOptions = useMemo(
      () => ({
        theme,
        donut,
        animationDuration,
      }),
      [theme, donut, animationDuration]
    );

    return (
      <ChartContainer
        ref={ref}
        chart={adjustedChart}
        options={chartOptions}
        className={`pie-chart ${donut ? 'pie-chart--donut' : ''} ${className}`}
        {...props}
      />
    );
  }
);

/**
 * DonutChart - Alias for PieChart with donut variant
 */
export const DonutChart = forwardRef<ChartContainerHandle, Omit<PieChartProps, 'donut'>>(
  function DonutChart(props, ref) {
    return <PieChart ref={ref} {...props} donut={true} />;
  }
);

export default PieChart;
