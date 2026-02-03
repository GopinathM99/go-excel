import { useCallback, useState, useMemo } from 'react';
import { create } from 'zustand';
import type {
  ChartModel,
  ChartType,
  ChartStyle,
  AxisConfig,
  LegendConfig,
  CellRange,
  ChartPosition,
} from '@excel/core';
import {
  createChart,
  updateChart,
  parseRangeReference,
  formatRangeReference,
  DEFAULT_CHART_STYLE,
  DEFAULT_AXIS_CONFIG,
  DEFAULT_LEGEND_CONFIG,
  DEFAULT_CHART_WIDTH,
  DEFAULT_CHART_HEIGHT,
  chartTypeSupportsAxes,
} from '@excel/core';
import { useChartManager } from './useChart';
import { useSpreadsheetStore } from '../store/spreadsheet';

/**
 * Chart sub-type definitions
 */
export type ChartSubType =
  | 'clustered'
  | 'stacked'
  | 'percentStacked'
  | 'default';

/**
 * Chart editor mode
 */
export type ChartEditorMode = 'create' | 'edit';

/**
 * Active tab in the chart editor
 */
export type ChartEditorTab = 'type' | 'data' | 'style' | 'axes' | 'legend';

/**
 * Form values for the chart editor
 */
export interface ChartEditorFormValues {
  // Chart type
  chartType: ChartType;
  chartSubType: ChartSubType;

  // Data configuration
  dataRange: string;
  seriesInRows: boolean;
  firstRowIsLabels: boolean;
  firstColIsLabels: boolean;

  // Style
  title: string;
  colorScheme: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  fontFamily: string;

  // X-Axis
  xAxisTitle: string;
  xAxisMin: string;
  xAxisMax: string;
  xAxisGridLines: boolean;
  xAxisLabelRotation: number;

  // Y-Axis
  yAxisTitle: string;
  yAxisMin: string;
  yAxisMax: string;
  yAxisGridLines: boolean;
  yAxisNumberFormat: string;

  // Secondary axis
  enableSecondaryAxis: boolean;

  // Legend
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  legendFontSize: number;
}

/**
 * Validation errors for form
 */
export interface ChartEditorErrors {
  dataRange?: string;
  xAxisMin?: string;
  xAxisMax?: string;
  yAxisMin?: string;
  yAxisMax?: string;
}

/**
 * Color scheme presets
 */
export const COLOR_SCHEMES = {
  default: ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D01', '#46BDC6'],
  colorful: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
  monochromatic: ['#4472C4', '#6B8DC9', '#8FAADB', '#B4C6E7', '#D6DCE4', '#2F5597'],
  earthy: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#556B2F', '#6B8E23'],
  vibrant: ['#FF4757', '#2ED573', '#1E90FF', '#FFA502', '#A55EEA', '#FF6B81'],
  pastel: ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94', '#B5EAD7'],
} as const;

export type ColorSchemeName = keyof typeof COLOR_SCHEMES;

/**
 * Default form values
 */
export const DEFAULT_FORM_VALUES: ChartEditorFormValues = {
  chartType: 'column',
  chartSubType: 'clustered',
  dataRange: '',
  seriesInRows: false,
  firstRowIsLabels: true,
  firstColIsLabels: true,
  title: '',
  colorScheme: 'default',
  backgroundColor: '#FFFFFF',
  borderColor: '#E0E0E0',
  borderWidth: 1,
  fontFamily: 'Arial, sans-serif',
  xAxisTitle: '',
  xAxisMin: '',
  xAxisMax: '',
  xAxisGridLines: true,
  xAxisLabelRotation: 0,
  yAxisTitle: '',
  yAxisMin: '',
  yAxisMax: '',
  yAxisGridLines: true,
  yAxisNumberFormat: '',
  enableSecondaryAxis: false,
  showLegend: true,
  legendPosition: 'bottom',
  legendFontSize: 11,
};

/**
 * Chart editor store state
 */
interface ChartEditorState {
  isOpen: boolean;
  mode: ChartEditorMode;
  activeTab: ChartEditorTab;
  editingChartId: string | null;
  formValues: ChartEditorFormValues;
  errors: ChartEditorErrors;
  isRangeSelectionMode: boolean;

  // Actions
  openCreate: () => void;
  openEdit: (chart: ChartModel) => void;
  close: () => void;
  setActiveTab: (tab: ChartEditorTab) => void;
  updateFormValue: <K extends keyof ChartEditorFormValues>(
    key: K,
    value: ChartEditorFormValues[K]
  ) => void;
  updateFormValues: (values: Partial<ChartEditorFormValues>) => void;
  setErrors: (errors: ChartEditorErrors) => void;
  clearError: (key: keyof ChartEditorErrors) => void;
  startRangeSelection: () => void;
  endRangeSelection: (range: string) => void;
  cancelRangeSelection: () => void;
  reset: () => void;
}

/**
 * Zustand store for chart editor state
 */
export const useChartEditorStore = create<ChartEditorState>((set) => ({
  isOpen: false,
  mode: 'create',
  activeTab: 'type',
  editingChartId: null,
  formValues: { ...DEFAULT_FORM_VALUES },
  errors: {},
  isRangeSelectionMode: false,

  openCreate: () =>
    set({
      isOpen: true,
      mode: 'create',
      activeTab: 'type',
      editingChartId: null,
      formValues: { ...DEFAULT_FORM_VALUES },
      errors: {},
    }),

  openEdit: (chart: ChartModel) =>
    set({
      isOpen: true,
      mode: 'edit',
      activeTab: 'type',
      editingChartId: chart.id,
      formValues: chartModelToFormValues(chart),
      errors: {},
    }),

  close: () =>
    set({
      isOpen: false,
      isRangeSelectionMode: false,
    }),

  setActiveTab: (tab: ChartEditorTab) => set({ activeTab: tab }),

  updateFormValue: (key, value) =>
    set((state) => ({
      formValues: { ...state.formValues, [key]: value },
    })),

  updateFormValues: (values) =>
    set((state) => ({
      formValues: { ...state.formValues, ...values },
    })),

  setErrors: (errors) => set({ errors }),

  clearError: (key) =>
    set((state) => {
      const newErrors = { ...state.errors };
      delete newErrors[key];
      return { errors: newErrors };
    }),

  startRangeSelection: () => set({ isRangeSelectionMode: true }),

  endRangeSelection: (range: string) =>
    set((state) => ({
      isRangeSelectionMode: false,
      formValues: { ...state.formValues, dataRange: range },
    })),

  cancelRangeSelection: () => set({ isRangeSelectionMode: false }),

  reset: () =>
    set({
      isOpen: false,
      mode: 'create',
      activeTab: 'type',
      editingChartId: null,
      formValues: { ...DEFAULT_FORM_VALUES },
      errors: {},
      isRangeSelectionMode: false,
    }),
}));

/**
 * Convert ChartModel to form values
 */
function chartModelToFormValues(chart: ChartModel): ChartEditorFormValues {
  const colorScheme = detectColorScheme(chart.style.colors);

  return {
    chartType: chart.type,
    chartSubType: 'clustered', // Default, as sub-type isn't stored in model
    dataRange: formatRangeReference(chart.dataRange),
    seriesInRows: chart.seriesInRows,
    firstRowIsLabels: chart.firstRowIsLabels,
    firstColIsLabels: chart.firstColIsLabels,
    title: chart.title || '',
    colorScheme,
    backgroundColor: chart.style.backgroundColor || '#FFFFFF',
    borderColor: chart.style.borderColor || '#E0E0E0',
    borderWidth: chart.style.borderWidth || 1,
    fontFamily: chart.style.fontFamily || 'Arial, sans-serif',
    xAxisTitle: chart.xAxis?.title || '',
    xAxisMin: chart.xAxis?.min !== undefined ? String(chart.xAxis.min) : '',
    xAxisMax: chart.xAxis?.max !== undefined ? String(chart.xAxis.max) : '',
    xAxisGridLines: chart.xAxis?.gridLines !== false,
    xAxisLabelRotation: chart.xAxis?.labelRotation || 0,
    yAxisTitle: chart.yAxis?.title || '',
    yAxisMin: chart.yAxis?.min !== undefined ? String(chart.yAxis.min) : '',
    yAxisMax: chart.yAxis?.max !== undefined ? String(chart.yAxis.max) : '',
    yAxisGridLines: chart.yAxis?.gridLines !== false,
    yAxisNumberFormat: chart.yAxis?.numberFormat || '',
    enableSecondaryAxis: false,
    showLegend: chart.legend.show,
    legendPosition: chart.legend.position,
    legendFontSize: 11,
  };
}

/**
 * Detect color scheme from colors array
 */
function detectColorScheme(colors?: string[]): ColorSchemeName {
  if (!colors || colors.length === 0) return 'default';

  for (const [name, scheme] of Object.entries(COLOR_SCHEMES)) {
    if (colors[0] === scheme[0]) {
      return name as ColorSchemeName;
    }
  }

  return 'default';
}

/**
 * Validate form values
 */
export function validateFormValues(values: ChartEditorFormValues): ChartEditorErrors {
  const errors: ChartEditorErrors = {};

  // Validate data range
  if (!values.dataRange.trim()) {
    errors.dataRange = 'Data range is required';
  } else {
    const parsed = parseRangeReference(values.dataRange.trim());
    if (!parsed) {
      errors.dataRange = 'Invalid range format (e.g., A1:D10)';
    }
  }

  // Validate axis min/max
  if (values.xAxisMin && isNaN(parseFloat(values.xAxisMin))) {
    errors.xAxisMin = 'Must be a number';
  }
  if (values.xAxisMax && isNaN(parseFloat(values.xAxisMax))) {
    errors.xAxisMax = 'Must be a number';
  }
  if (values.yAxisMin && isNaN(parseFloat(values.yAxisMin))) {
    errors.yAxisMin = 'Must be a number';
  }
  if (values.yAxisMax && isNaN(parseFloat(values.yAxisMax))) {
    errors.yAxisMax = 'Must be a number';
  }

  return errors;
}

/**
 * Convert form values to ChartModel configuration
 */
export function formValuesToChartConfig(
  values: ChartEditorFormValues,
  sheetId: string,
  anchorCell: { row: number; col: number }
): Parameters<typeof createChart>[0] | null {
  const dataRange = parseRangeReference(values.dataRange.trim());
  if (!dataRange) return null;

  const colors = COLOR_SCHEMES[values.colorScheme as ColorSchemeName] || COLOR_SCHEMES.default;

  const style: ChartStyle = {
    colors: [...colors],
    backgroundColor: values.backgroundColor,
    borderColor: values.borderColor,
    borderWidth: values.borderWidth,
    fontFamily: values.fontFamily,
    fontSize: 12,
  };

  const legend: LegendConfig = {
    show: values.showLegend,
    position: values.legendPosition,
  };

  const position: ChartPosition = {
    sheetId,
    anchorCell,
    width: DEFAULT_CHART_WIDTH,
    height: DEFAULT_CHART_HEIGHT,
    offsetX: 10,
    offsetY: 10,
  };

  const config: Parameters<typeof createChart>[0] = {
    type: values.chartType,
    title: values.title || undefined,
    dataRange,
    seriesInRows: values.seriesInRows,
    firstRowIsLabels: values.firstRowIsLabels,
    firstColIsLabels: values.firstColIsLabels,
    position,
    style,
    legend,
  };

  // Add axis config for charts that support axes
  if (chartTypeSupportsAxes(values.chartType)) {
    config.xAxis = {
      title: values.xAxisTitle || undefined,
      min: values.xAxisMin ? parseFloat(values.xAxisMin) : undefined,
      max: values.xAxisMax ? parseFloat(values.xAxisMax) : undefined,
      gridLines: values.xAxisGridLines,
      labelRotation: values.xAxisLabelRotation,
    };

    config.yAxis = {
      title: values.yAxisTitle || undefined,
      min: values.yAxisMin ? parseFloat(values.yAxisMin) : undefined,
      max: values.yAxisMax ? parseFloat(values.yAxisMax) : undefined,
      gridLines: values.yAxisGridLines,
      numberFormat: values.yAxisNumberFormat || undefined,
    };
  }

  return config;
}

/**
 * Hook for chart editor functionality
 */
export function useChartEditor() {
  const store = useChartEditorStore();
  const chartManager = useChartManager();
  const selectedCell = useSpreadsheetStore((state) => state.selectedCell);
  const selectionRange = useSpreadsheetStore((state) => state.selectionRange);

  /**
   * Validate current form values
   */
  const validate = useCallback((): boolean => {
    const errors = validateFormValues(store.formValues);
    store.setErrors(errors);
    return Object.keys(errors).length === 0;
  }, [store.formValues, store.setErrors]);

  /**
   * Build preview chart model from current form values
   */
  const previewChart = useMemo((): ChartModel | null => {
    const config = formValuesToChartConfig(
      store.formValues,
      'preview-sheet',
      { row: 0, col: 0 }
    );

    if (!config) return null;

    try {
      return createChart(config);
    } catch {
      return null;
    }
  }, [store.formValues]);

  /**
   * Insert a new chart
   */
  const insertChart = useCallback((): ChartModel | null => {
    if (!validate()) return null;

    const anchorCell = selectedCell || { row: 0, col: 5 };
    const config = formValuesToChartConfig(
      store.formValues,
      'sheet-1', // TODO: Get actual sheet ID
      anchorCell
    );

    if (!config) return null;

    try {
      const chart = createChart(config);
      chartManager.addChart(chart);
      store.close();
      return chart;
    } catch (error) {
      console.error('Failed to create chart:', error);
      return null;
    }
  }, [validate, store.formValues, selectedCell, chartManager, store.close]);

  /**
   * Update an existing chart
   */
  const updateExistingChart = useCallback((): ChartModel | null => {
    if (!validate() || !store.editingChartId) return null;

    const existingChart = chartManager.getChart(store.editingChartId);
    if (!existingChart) return null;

    const dataRange = parseRangeReference(store.formValues.dataRange.trim());
    if (!dataRange) return null;

    const colors =
      COLOR_SCHEMES[store.formValues.colorScheme as ColorSchemeName] ||
      COLOR_SCHEMES.default;

    const updates: Partial<ChartModel> = {
      type: store.formValues.chartType,
      title: store.formValues.title || undefined,
      dataRange,
      seriesInRows: store.formValues.seriesInRows,
      firstRowIsLabels: store.formValues.firstRowIsLabels,
      firstColIsLabels: store.formValues.firstColIsLabels,
      style: {
        colors: [...colors],
        backgroundColor: store.formValues.backgroundColor,
        borderColor: store.formValues.borderColor,
        borderWidth: store.formValues.borderWidth,
        fontFamily: store.formValues.fontFamily,
        fontSize: 12,
      },
      legend: {
        show: store.formValues.showLegend,
        position: store.formValues.legendPosition,
      },
    };

    if (chartTypeSupportsAxes(store.formValues.chartType)) {
      updates.xAxis = {
        title: store.formValues.xAxisTitle || undefined,
        min: store.formValues.xAxisMin
          ? parseFloat(store.formValues.xAxisMin)
          : undefined,
        max: store.formValues.xAxisMax
          ? parseFloat(store.formValues.xAxisMax)
          : undefined,
        gridLines: store.formValues.xAxisGridLines,
        labelRotation: store.formValues.xAxisLabelRotation,
      };

      updates.yAxis = {
        title: store.formValues.yAxisTitle || undefined,
        min: store.formValues.yAxisMin
          ? parseFloat(store.formValues.yAxisMin)
          : undefined,
        max: store.formValues.yAxisMax
          ? parseFloat(store.formValues.yAxisMax)
          : undefined,
        gridLines: store.formValues.yAxisGridLines,
        numberFormat: store.formValues.yAxisNumberFormat || undefined,
      };
    }

    try {
      const updatedChart = updateChart(existingChart, updates);
      chartManager.updateChart(updatedChart);
      store.close();
      return updatedChart;
    } catch (error) {
      console.error('Failed to update chart:', error);
      return null;
    }
  }, [validate, store.editingChartId, store.formValues, chartManager, store.close]);

  /**
   * Handle form submission (insert or update)
   */
  const handleSubmit = useCallback((): ChartModel | null => {
    if (store.mode === 'create') {
      return insertChart();
    } else {
      return updateExistingChart();
    }
  }, [store.mode, insertChart, updateExistingChart]);

  /**
   * Get current selection as range string
   */
  const getSelectionAsRange = useCallback((): string => {
    if (!selectionRange) {
      if (selectedCell) {
        return formatRangeReference({
          start: selectedCell,
          end: selectedCell,
        });
      }
      return '';
    }

    return formatRangeReference({
      start: selectionRange.start,
      end: selectionRange.end,
    });
  }, [selectedCell, selectionRange]);

  /**
   * Use current spreadsheet selection as data range
   */
  const useCurrentSelection = useCallback(() => {
    const range = getSelectionAsRange();
    if (range) {
      store.updateFormValue('dataRange', range);
      store.clearError('dataRange');
    }
  }, [getSelectionAsRange, store.updateFormValue, store.clearError]);

  return {
    // Store state
    isOpen: store.isOpen,
    mode: store.mode,
    activeTab: store.activeTab,
    formValues: store.formValues,
    errors: store.errors,
    isRangeSelectionMode: store.isRangeSelectionMode,

    // Store actions
    openCreate: store.openCreate,
    openEdit: store.openEdit,
    close: store.close,
    setActiveTab: store.setActiveTab,
    updateFormValue: store.updateFormValue,
    updateFormValues: store.updateFormValues,
    startRangeSelection: store.startRangeSelection,
    endRangeSelection: store.endRangeSelection,
    cancelRangeSelection: store.cancelRangeSelection,

    // Computed
    previewChart,

    // Actions
    validate,
    insertChart,
    updateExistingChart,
    handleSubmit,
    getSelectionAsRange,
    useCurrentSelection,
  };
}

export default useChartEditor;
