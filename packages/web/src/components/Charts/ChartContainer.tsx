import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import type { ChartModel } from '@excel/core';
import { useChart, type UseChartOptions } from '../../hooks/useChart';
import './ChartContainer.css';

/**
 * Props for ChartContainer component
 */
export interface ChartContainerProps {
  /** The ChartModel from core */
  chart: ChartModel | null;
  /** Chart rendering options */
  options?: UseChartOptions;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Callback when chart is ready */
  onReady?: (instance: ECharts) => void;
  /** Callback when chart data updates */
  onDataUpdate?: (data: unknown) => void;
  /** Whether the chart is selected/focused */
  isSelected?: boolean;
  /** Callback when chart is clicked */
  onClick?: (e: React.MouseEvent) => void;
  /** Callback when chart is double-clicked */
  onDoubleClick?: (e: React.MouseEvent) => void;
}

/**
 * Ref handle for ChartContainer
 */
export interface ChartContainerHandle {
  /** Get the ECharts instance */
  getEchartsInstance: () => ECharts | null;
  /** Export chart as PNG data URL */
  exportAsImage: () => string | null;
  /** Force refresh the chart */
  refresh: () => void;
  /** Resize the chart to fit container */
  resize: () => void;
}

/**
 * ChartContainer - Wrapper component for all chart types
 *
 * Features:
 * - Accepts ChartModel from core
 * - Renders appropriate chart type via ECharts
 * - Handles resize automatically
 * - Shows loading state
 * - Supports export as image
 */
export const ChartContainer = forwardRef<ChartContainerHandle, ChartContainerProps>(
  function ChartContainer(
    {
      chart,
      options = {},
      className = '',
      style,
      onReady,
      onDataUpdate,
      isSelected = false,
      onClick,
      onDoubleClick,
    },
    ref
  ) {
    const chartRef = useRef<ReactECharts>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    const {
      options: echartsOptions,
      data,
      isLoading,
      error,
      refresh,
      setChartInstance,
    } = useChart(chart, options);

    // Handle resize observer
    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        if (chartRef.current) {
          setIsResizing(true);
          const instance = chartRef.current.getEchartsInstance();
          instance?.resize();
          setTimeout(() => setIsResizing(false), 100);
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Notify when data updates
    useEffect(() => {
      if (data && onDataUpdate) {
        onDataUpdate(data);
      }
    }, [data, onDataUpdate]);

    // Handle chart ready
    const handleChartReady = useCallback(
      (instance: ECharts) => {
        setChartInstance(instance);
        onReady?.(instance);
      },
      [setChartInstance, onReady]
    );

    // Export as image
    const exportAsImage = useCallback((): string | null => {
      if (!chartRef.current) return null;

      const instance = chartRef.current.getEchartsInstance();
      return instance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
    }, []);

    // Get ECharts instance
    const getEchartsInstance = useCallback((): ECharts | null => {
      return chartRef.current?.getEchartsInstance() || null;
    }, []);

    // Resize handler
    const resize = useCallback(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    }, []);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getEchartsInstance,
        exportAsImage,
        refresh,
        resize,
      }),
      [getEchartsInstance, exportAsImage, refresh, resize]
    );

    // Render loading state
    if (isLoading) {
      return (
        <div
          ref={containerRef}
          className={`chart-container chart-container--loading ${className}`}
          style={style}
        >
          <div className="chart-loading">
            <div className="chart-loading-spinner" />
            <span className="chart-loading-text">Loading chart...</span>
          </div>
        </div>
      );
    }

    // Render error state
    if (error) {
      return (
        <div
          ref={containerRef}
          className={`chart-container chart-container--error ${className}`}
          style={style}
        >
          <div className="chart-error">
            <span className="chart-error-icon">!</span>
            <span className="chart-error-text">{error}</span>
            <button className="chart-error-retry" onClick={refresh}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Render empty state
    if (!chart) {
      return (
        <div
          ref={containerRef}
          className={`chart-container chart-container--empty ${className}`}
          style={style}
        >
          <div className="chart-empty">
            <span className="chart-empty-text">No chart data</span>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`chart-container ${isSelected ? 'chart-container--selected' : ''} ${className}`}
        style={style}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <ReactECharts
          ref={chartRef}
          option={echartsOptions}
          style={{ width: '100%', height: '100%' }}
          onChartReady={handleChartReady}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
        {isResizing && (
          <div className="chart-resize-overlay">
            <span>Resizing...</span>
          </div>
        )}
        {isSelected && (
          <div className="chart-selection-border" />
        )}
      </div>
    );
  }
);

export default ChartContainer;
