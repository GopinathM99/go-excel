import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type {
  ChartModel,
  ChartData,
  ChartType,
  ChartSeriesData,
} from '@excel/core';
import {
  ChartDataProvider,
  ChartManager,
  DEFAULT_CHART_COLORS,
  chartTypeSupportsAxes,
  isCircularChart,
} from '@excel/core';
import { useSpreadsheetStore } from '../store/spreadsheet';

/**
 * Excel-like color themes for charts
 */
export const CHART_THEMES = {
  default: [...DEFAULT_CHART_COLORS],
  colorful: [
    '#4472C4',
    '#ED7D31',
    '#A5A5A5',
    '#FFC000',
    '#5B9BD5',
    '#70AD47',
    '#264478',
    '#9E480E',
    '#636363',
    '#997300',
  ],
  monochromatic: [
    '#4472C4',
    '#6B8DC9',
    '#8FAADB',
    '#B4C6E7',
    '#D6DCE4',
    '#2F5597',
    '#5B9BD5',
    '#BDD7EE',
    '#DEEBF7',
    '#1F4E79',
  ],
  earthy: [
    '#8B4513',
    '#A0522D',
    '#CD853F',
    '#DEB887',
    '#F5DEB3',
    '#556B2F',
    '#6B8E23',
    '#9ACD32',
    '#BDB76B',
    '#DAA520',
  ],
} as const;

export type ChartTheme = keyof typeof CHART_THEMES;

/**
 * Options for useChart hook
 */
export interface UseChartOptions {
  /** Chart theme to use */
  theme?: ChartTheme;
  /** Enable smooth lines for line charts */
  smooth?: boolean;
  /** Enable donut variant for pie charts */
  donut?: boolean;
  /** Show data point markers for line charts */
  showMarkers?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
}

/**
 * Return type for useChart hook
 */
export interface UseChartResult {
  /** ECharts options object */
  options: EChartsOption;
  /** Chart data from provider */
  data: ChartData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: string | null;
  /** Force refresh the chart data */
  refresh: () => void;
  /** Export chart as data URL */
  getImageDataUrl: () => string | null;
  /** Reference to set the chart instance for export */
  setChartInstance: (instance: unknown) => void;
}

/**
 * Hook to integrate ChartModel with ECharts
 * Provides reactive data updates and ECharts option generation
 */
export function useChart(
  chart: ChartModel | null,
  options: UseChartOptions = {}
): UseChartResult {
  const {
    theme = 'default',
    smooth = false,
    donut = false,
    showMarkers = true,
    animationDuration = 500,
  } = options;

  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartInstanceRef = useRef<unknown>(null);
  const providerRef = useRef<ChartDataProvider | null>(null);

  // Get cell data from spreadsheet store
  const cells = useSpreadsheetStore((state) => state.cells);

  // Create mock sheet from spreadsheet store for ChartDataProvider
  const mockSheet = useMemo(() => {
    if (!chart) return null;

    // Create a minimal sheet object compatible with ChartDataProvider
    const cellsMap = new Map<string, { value: { type: string; value: unknown } }>();

    cells.forEach((cellData, key) => {
      const [row, col] = key.split(',').map(Number);
      const value = cellData.value;

      // Determine value type
      let cellValue: { type: string; value: unknown };
      if (value === '' || value === undefined || value === null) {
        cellValue = { type: 'empty', value: null };
      } else if (!isNaN(Number(value)) && value !== '') {
        cellValue = { type: 'number', value: Number(value) };
      } else if (value === 'TRUE' || value === 'FALSE') {
        cellValue = { type: 'boolean', value: value === 'TRUE' };
      } else {
        cellValue = { type: 'string', value: String(value) };
      }

      cellsMap.set(`${row},${col}`, { value: cellValue });
    });

    return {
      id: chart.position.sheetId,
      cells: cellsMap,
    };
  }, [chart, cells]);

  // Refresh chart data
  const refresh = useCallback(() => {
    if (!chart || !mockSheet) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create or update the data provider
      if (!providerRef.current) {
        // Create a compatible sheet object for ChartDataProvider
        const sheetForProvider = {
          id: mockSheet.id,
          cells: new Map(),
        };

        // Convert cells to the format expected by ChartDataProvider
        mockSheet.cells.forEach((cell, key) => {
          sheetForProvider.cells.set(key, { value: cell.value });
        });

        providerRef.current = new ChartDataProvider(
          chart,
          sheetForProvider as never
        );
      } else {
        providerRef.current.updateChart(chart);
        providerRef.current.invalidateCache();
      }

      const chartData = providerRef.current.getData();
      setData(chartData);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      setIsLoading(false);
    }
  }, [chart, mockSheet]);

  // Auto-refresh when chart or cells change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Set chart instance for export
  const setChartInstance = useCallback((instance: unknown) => {
    chartInstanceRef.current = instance;
  }, []);

  // Export chart as image
  const getImageDataUrl = useCallback((): string | null => {
    const instance = chartInstanceRef.current as {
      getDataURL?: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string;
    } | null;

    if (!instance || typeof instance.getDataURL !== 'function') {
      return null;
    }

    return instance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
  }, []);

  // Generate ECharts options
  const echartsOptions = useMemo((): EChartsOption => {
    if (!chart || !data) {
      return {};
    }

    const colors = CHART_THEMES[theme];

    // Base options common to all chart types
    const baseOptions: EChartsOption = {
      color: colors,
      backgroundColor: chart.style.backgroundColor || '#ffffff',
      animation: true,
      animationDuration,
      textStyle: {
        fontFamily: chart.style.fontFamily || 'Arial, sans-serif',
        fontSize: chart.style.fontSize || 12,
      },
    };

    // Title configuration
    if (chart.title) {
      baseOptions.title = {
        text: chart.title,
        subtext: chart.subtitle,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#333',
        },
        subtextStyle: {
          fontSize: 12,
          color: '#666',
        },
      };
    }

    // Tooltip configuration
    baseOptions.tooltip = {
      trigger: isCircularChart(chart.type) ? 'item' : 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
      axisPointer: {
        type: chart.type === 'line' ? 'cross' : 'shadow',
        crossStyle: {
          color: '#999',
        },
      },
    };

    // Legend configuration
    if (chart.legend.show) {
      baseOptions.legend = {
        show: true,
        orient: chart.legend.position === 'left' || chart.legend.position === 'right'
          ? 'vertical'
          : 'horizontal',
        left: chart.legend.position === 'left' ? 'left' :
              chart.legend.position === 'right' ? 'right' : 'center',
        top: chart.legend.position === 'top' ? 'top' :
             chart.legend.position === 'bottom' ? 'bottom' : 'middle',
        data: data.series.map((s) => s.name),
        textStyle: {
          fontSize: 11,
          color: '#666',
        },
        itemWidth: 14,
        itemHeight: 10,
      };
    }

    // Build chart-type specific options
    switch (chart.type) {
      case 'bar':
        return buildBarChartOptions(chart, data, baseOptions, true);
      case 'column':
        return buildBarChartOptions(chart, data, baseOptions, false);
      case 'line':
        return buildLineChartOptions(chart, data, baseOptions, smooth, showMarkers);
      case 'area':
        return buildAreaChartOptions(chart, data, baseOptions, smooth);
      case 'pie':
      case 'doughnut':
        return buildPieChartOptions(chart, data, baseOptions, chart.type === 'doughnut' || donut);
      case 'scatter':
        return buildScatterChartOptions(chart, data, baseOptions);
      default:
        return baseOptions;
    }
  }, [chart, data, theme, smooth, donut, showMarkers, animationDuration]);

  return {
    options: echartsOptions,
    data,
    isLoading,
    error,
    refresh,
    getImageDataUrl,
    setChartInstance,
  };
}

/**
 * Build bar/column chart options
 */
function buildBarChartOptions(
  chart: ChartModel,
  data: ChartData,
  baseOptions: EChartsOption,
  isHorizontal: boolean
): EChartsOption {
  const categoryAxis = {
    type: 'category' as const,
    data: data.labels,
    axisLabel: {
      rotate: chart.xAxis?.labelRotation || 0,
      fontSize: 11,
      color: '#666',
    },
    axisLine: {
      lineStyle: {
        color: '#ccc',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#ccc',
      },
    },
    name: isHorizontal ? chart.yAxis?.title : chart.xAxis?.title,
    nameLocation: 'middle' as const,
    nameGap: 35,
    nameTextStyle: {
      fontSize: 12,
      color: '#666',
    },
  };

  const valueAxis = {
    type: 'value' as const,
    min: isHorizontal ? chart.xAxis?.min : chart.yAxis?.min,
    max: isHorizontal ? chart.xAxis?.max : chart.yAxis?.max,
    axisLabel: {
      fontSize: 11,
      color: '#666',
      formatter: chart.yAxis?.numberFormat || undefined,
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: '#ccc',
      },
    },
    splitLine: {
      show: chart.yAxis?.gridLines !== false,
      lineStyle: {
        color: '#eee',
        type: 'dashed' as const,
      },
    },
    name: isHorizontal ? chart.xAxis?.title : chart.yAxis?.title,
    nameLocation: 'middle' as const,
    nameGap: 45,
    nameTextStyle: {
      fontSize: 12,
      color: '#666',
    },
  };

  return {
    ...baseOptions,
    grid: {
      left: '10%',
      right: '5%',
      top: chart.title ? '15%' : '10%',
      bottom: chart.legend.show && chart.legend.position === 'bottom' ? '18%' : '12%',
      containLabel: true,
    },
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    series: data.series.map((series, index) => ({
      name: series.name,
      type: 'bar' as const,
      data: series.data,
      itemStyle: {
        color: series.color || undefined,
        borderRadius: isHorizontal ? [0, 2, 2, 0] : [2, 2, 0, 0],
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.2)',
        },
      },
      barMaxWidth: 50,
    })),
  };
}

/**
 * Build line chart options
 */
function buildLineChartOptions(
  chart: ChartModel,
  data: ChartData,
  baseOptions: EChartsOption,
  smooth: boolean,
  showMarkers: boolean
): EChartsOption {
  return {
    ...baseOptions,
    grid: {
      left: '10%',
      right: '5%',
      top: chart.title ? '15%' : '10%',
      bottom: chart.legend.show && chart.legend.position === 'bottom' ? '18%' : '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: {
        rotate: chart.xAxis?.labelRotation || 0,
        fontSize: 11,
        color: '#666',
      },
      axisLine: {
        lineStyle: {
          color: '#ccc',
        },
      },
      axisTick: {
        lineStyle: {
          color: '#ccc',
        },
      },
      name: chart.xAxis?.title,
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    yAxis: {
      type: 'value',
      min: chart.yAxis?.min,
      max: chart.yAxis?.max,
      axisLabel: {
        fontSize: 11,
        color: '#666',
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#ccc',
        },
      },
      splitLine: {
        show: chart.yAxis?.gridLines !== false,
        lineStyle: {
          color: '#eee',
          type: 'dashed',
        },
      },
      name: chart.yAxis?.title,
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: data.series.map((series) => ({
      name: series.name,
      type: 'line' as const,
      data: series.data,
      smooth,
      symbol: showMarkers ? 'circle' : 'none',
      symbolSize: showMarkers ? 6 : 0,
      lineStyle: {
        width: 2,
        color: series.color || undefined,
      },
      itemStyle: {
        color: series.color || undefined,
      },
      emphasis: {
        focus: 'series' as const,
        lineStyle: {
          width: 3,
        },
      },
    })),
  };
}

/**
 * Build area chart options
 */
function buildAreaChartOptions(
  chart: ChartModel,
  data: ChartData,
  baseOptions: EChartsOption,
  smooth: boolean
): EChartsOption {
  const lineOptions = buildLineChartOptions(chart, data, baseOptions, smooth, false);

  return {
    ...lineOptions,
    series: data.series.map((series, index) => ({
      name: series.name,
      type: 'line' as const,
      data: series.data,
      smooth,
      symbol: 'none',
      lineStyle: {
        width: 2,
        color: series.color || undefined,
      },
      areaStyle: {
        opacity: 0.3,
        color: series.color || undefined,
      },
      emphasis: {
        focus: 'series' as const,
      },
    })),
  };
}

/**
 * Build pie/doughnut chart options
 */
function buildPieChartOptions(
  chart: ChartModel,
  data: ChartData,
  baseOptions: EChartsOption,
  isDonut: boolean
): EChartsOption {
  // For pie charts, we use the first series and labels as data
  const pieData = data.labels.map((label, index) => ({
    name: label,
    value: data.series[0]?.data[index] || 0,
  }));

  return {
    ...baseOptions,
    series: [
      {
        name: chart.title || 'Data',
        type: 'pie',
        radius: isDonut ? ['40%', '70%'] : '70%',
        center: ['50%', '55%'],
        data: pieData,
        itemStyle: {
          borderRadius: isDonut ? 4 : 2,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
          fontSize: 11,
          color: '#666',
        },
        labelLine: {
          smooth: 0.2,
          length: 10,
          length2: 20,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
      },
    ],
  };
}

/**
 * Build scatter chart options
 */
function buildScatterChartOptions(
  chart: ChartModel,
  data: ChartData,
  baseOptions: EChartsOption
): EChartsOption {
  return {
    ...baseOptions,
    grid: {
      left: '10%',
      right: '5%',
      top: chart.title ? '15%' : '10%',
      bottom: chart.legend.show && chart.legend.position === 'bottom' ? '18%' : '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      min: chart.xAxis?.min,
      max: chart.xAxis?.max,
      axisLabel: {
        fontSize: 11,
        color: '#666',
      },
      axisLine: {
        lineStyle: {
          color: '#ccc',
        },
      },
      splitLine: {
        show: chart.xAxis?.gridLines !== false,
        lineStyle: {
          color: '#eee',
          type: 'dashed',
        },
      },
      name: chart.xAxis?.title,
      nameLocation: 'middle',
      nameGap: 35,
      nameTextStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    yAxis: {
      type: 'value',
      min: chart.yAxis?.min,
      max: chart.yAxis?.max,
      axisLabel: {
        fontSize: 11,
        color: '#666',
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: '#ccc',
        },
      },
      splitLine: {
        show: chart.yAxis?.gridLines !== false,
        lineStyle: {
          color: '#eee',
          type: 'dashed',
        },
      },
      name: chart.yAxis?.title,
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: data.series.map((series, seriesIndex) => ({
      name: series.name,
      type: 'scatter' as const,
      data: series.data.map((value, index) => [
        index,
        value,
      ]),
      symbolSize: 10,
      itemStyle: {
        color: series.color || undefined,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
    })),
  };
}

/**
 * Singleton ChartManager hook
 */
let chartManagerInstance: ChartManager | null = null;

export function useChartManager(): ChartManager {
  if (!chartManagerInstance) {
    chartManagerInstance = new ChartManager();
  }
  return chartManagerInstance;
}

/**
 * Hook to subscribe to ChartManager events
 */
export function useChartManagerEvents(
  callback: (event: { type: string; chart?: ChartModel; chartId?: string }) => void
): void {
  const manager = useChartManager();

  useEffect(() => {
    manager.addEventListener(callback);
    return () => {
      manager.removeEventListener(callback);
    };
  }, [manager, callback]);
}
