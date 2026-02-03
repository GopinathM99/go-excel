/**
 * ChartEditor module - Excel-like chart wizard UI components
 *
 * This module provides a complete chart creation and editing experience
 * similar to Microsoft Excel's chart wizard. It includes:
 *
 * - ChartEditorDialog: Main modal dialog with tabbed interface
 * - ChartTypeSelector: Visual grid for selecting chart types and sub-types
 * - DataRangePicker: Input and configuration for chart data range
 * - ChartStyleEditor: Colors, fonts, and visual styling options
 * - AxisEditor: X and Y axis configuration (title, min/max, gridlines)
 * - LegendEditor: Legend visibility, position, and font size
 *
 * Usage:
 * ```tsx
 * import { ChartEditorDialog, useChartEditor } from './ChartEditor';
 *
 * function App() {
 *   const { openCreate, openEdit } = useChartEditor();
 *
 *   return (
 *     <>
 *       <button onClick={openCreate}>Insert Chart</button>
 *       <ChartEditorDialog />
 *     </>
 *   );
 * }
 * ```
 *
 * The chart editor integrates with:
 * - ChartManager from @excel/core for chart CRUD operations
 * - useSpreadsheetStore for data range selection
 * - ChartContainer for live preview
 */

// Main dialog component
export { ChartEditorDialog } from './ChartEditorDialog';
export { default as ChartEditorDialogDefault } from './ChartEditorDialog';

// Tab panel components
export { ChartTypeSelector } from './ChartTypeSelector';
export { default as ChartTypeSelectorDefault } from './ChartTypeSelector';

export { DataRangePicker } from './DataRangePicker';
export { default as DataRangePickerDefault } from './DataRangePicker';

export { ChartStyleEditor } from './ChartStyleEditor';
export { default as ChartStyleEditorDefault } from './ChartStyleEditor';

export { AxisEditor } from './AxisEditor';
export { default as AxisEditorDefault } from './AxisEditor';

export { LegendEditor } from './LegendEditor';
export { default as LegendEditorDefault } from './LegendEditor';

// Hook for editor state management
export {
  useChartEditor,
  useChartEditorStore,
  validateFormValues,
  formValuesToChartConfig,
  COLOR_SCHEMES,
  DEFAULT_FORM_VALUES,
} from '../../hooks/useChartEditor';

// Types
export type {
  ChartSubType,
  ChartEditorMode,
  ChartEditorTab,
  ChartEditorFormValues,
  ChartEditorErrors,
  ColorSchemeName,
} from '../../hooks/useChartEditor';

// Default export for convenience
export { ChartEditorDialog as default } from './ChartEditorDialog';
