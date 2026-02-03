import React, { useCallback, useEffect, useRef } from 'react';
import { chartTypeSupportsAxes } from '@excel/core';
import { ChartContainer } from '../Charts';
import { useChartEditor, type ChartEditorTab } from '../../hooks/useChartEditor';
import { ChartTypeSelector } from './ChartTypeSelector';
import { DataRangePicker } from './DataRangePicker';
import { ChartStyleEditor } from './ChartStyleEditor';
import { AxisEditor } from './AxisEditor';
import { LegendEditor } from './LegendEditor';
import './ChartEditor.css';

/**
 * Tab configuration
 */
const TABS: { key: ChartEditorTab; label: string; icon: React.ReactNode }[] = [
  { key: 'type', label: 'Chart Type', icon: <ChartTypeIcon /> },
  { key: 'data', label: 'Data', icon: <DataIcon /> },
  { key: 'style', label: 'Style', icon: <StyleIcon /> },
  { key: 'axes', label: 'Axes', icon: <AxesIcon /> },
  { key: 'legend', label: 'Legend', icon: <LegendIcon /> },
];

/**
 * ChartEditorDialog - Main modal dialog for creating/editing charts
 */
export function ChartEditorDialog() {
  const {
    isOpen,
    mode,
    activeTab,
    formValues,
    errors,
    isRangeSelectionMode,
    previewChart,
    close,
    setActiveTab,
    updateFormValue,
    handleSubmit,
    startRangeSelection,
    endRangeSelection,
  } = useChartEditor();

  const dialogRef = useRef<HTMLDialogElement>(null);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        close();
      }
    },
    [close]
  );

  // Handle form submission
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit]
  );

  // Check if axes are supported for current chart type
  const supportsAxes = chartTypeSupportsAxes(formValues.chartType);

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="chart-editor-dialog"
      onClick={handleBackdropClick}
    >
      <div className="chart-editor-dialog__content">
        {/* Header */}
        <header className="chart-editor-dialog__header">
          <h2 className="chart-editor-dialog__title">
            {mode === 'create' ? 'Insert Chart' : 'Edit Chart'}
          </h2>
          <button
            type="button"
            className="chart-editor-dialog__close-btn"
            onClick={close}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Body */}
        <div className="chart-editor-dialog__body">
          {/* Left: Tabs and Form */}
          <div className="chart-editor-dialog__form-area">
            {/* Tab Navigation */}
            <nav className="chart-editor-dialog__tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`chart-editor-dialog__tab ${
                    activeTab === tab.key ? 'chart-editor-dialog__tab--active' : ''
                  } ${
                    tab.key === 'axes' && !supportsAxes
                      ? 'chart-editor-dialog__tab--disabled'
                      : ''
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={tab.key === 'axes' && !supportsAxes}
                >
                  <span className="chart-editor-dialog__tab-icon">{tab.icon}</span>
                  <span className="chart-editor-dialog__tab-label">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Tab Content */}
            <form
              className="chart-editor-dialog__form"
              onSubmit={handleFormSubmit}
            >
              <div className="chart-editor-dialog__tab-content">
                {activeTab === 'type' && (
                  <ChartTypeSelector
                    selectedType={formValues.chartType}
                    selectedSubType={formValues.chartSubType}
                    onTypeChange={(type) => updateFormValue('chartType', type)}
                    onSubTypeChange={(subType) => updateFormValue('chartSubType', subType)}
                  />
                )}

                {activeTab === 'data' && (
                  <DataRangePicker
                    dataRange={formValues.dataRange}
                    seriesInRows={formValues.seriesInRows}
                    firstRowIsLabels={formValues.firstRowIsLabels}
                    firstColIsLabels={formValues.firstColIsLabels}
                    onDataRangeChange={(range) => updateFormValue('dataRange', range)}
                    onSeriesInRowsChange={(value) => updateFormValue('seriesInRows', value)}
                    onFirstRowIsLabelsChange={(value) => updateFormValue('firstRowIsLabels', value)}
                    onFirstColIsLabelsChange={(value) => updateFormValue('firstColIsLabels', value)}
                    error={errors.dataRange}
                    onStartRangeSelection={startRangeSelection}
                    isRangeSelectionMode={isRangeSelectionMode}
                  />
                )}

                {activeTab === 'style' && (
                  <ChartStyleEditor
                    title={formValues.title}
                    colorScheme={formValues.colorScheme}
                    backgroundColor={formValues.backgroundColor}
                    borderColor={formValues.borderColor}
                    borderWidth={formValues.borderWidth}
                    fontFamily={formValues.fontFamily}
                    onTitleChange={(value) => updateFormValue('title', value)}
                    onColorSchemeChange={(value) => updateFormValue('colorScheme', value)}
                    onBackgroundColorChange={(value) => updateFormValue('backgroundColor', value)}
                    onBorderColorChange={(value) => updateFormValue('borderColor', value)}
                    onBorderWidthChange={(value) => updateFormValue('borderWidth', value)}
                    onFontFamilyChange={(value) => updateFormValue('fontFamily', value)}
                  />
                )}

                {activeTab === 'axes' && (
                  <AxisEditor
                    xAxisTitle={formValues.xAxisTitle}
                    xAxisMin={formValues.xAxisMin}
                    xAxisMax={formValues.xAxisMax}
                    xAxisGridLines={formValues.xAxisGridLines}
                    xAxisLabelRotation={formValues.xAxisLabelRotation}
                    yAxisTitle={formValues.yAxisTitle}
                    yAxisMin={formValues.yAxisMin}
                    yAxisMax={formValues.yAxisMax}
                    yAxisGridLines={formValues.yAxisGridLines}
                    yAxisNumberFormat={formValues.yAxisNumberFormat}
                    enableSecondaryAxis={formValues.enableSecondaryAxis}
                    xAxisMinError={errors.xAxisMin}
                    xAxisMaxError={errors.xAxisMax}
                    yAxisMinError={errors.yAxisMin}
                    yAxisMaxError={errors.yAxisMax}
                    onXAxisTitleChange={(value) => updateFormValue('xAxisTitle', value)}
                    onXAxisMinChange={(value) => updateFormValue('xAxisMin', value)}
                    onXAxisMaxChange={(value) => updateFormValue('xAxisMax', value)}
                    onXAxisGridLinesChange={(value) => updateFormValue('xAxisGridLines', value)}
                    onXAxisLabelRotationChange={(value) => updateFormValue('xAxisLabelRotation', value)}
                    onYAxisTitleChange={(value) => updateFormValue('yAxisTitle', value)}
                    onYAxisMinChange={(value) => updateFormValue('yAxisMin', value)}
                    onYAxisMaxChange={(value) => updateFormValue('yAxisMax', value)}
                    onYAxisGridLinesChange={(value) => updateFormValue('yAxisGridLines', value)}
                    onYAxisNumberFormatChange={(value) => updateFormValue('yAxisNumberFormat', value)}
                    onEnableSecondaryAxisChange={(value) => updateFormValue('enableSecondaryAxis', value)}
                    supportsAxes={supportsAxes}
                  />
                )}

                {activeTab === 'legend' && (
                  <LegendEditor
                    showLegend={formValues.showLegend}
                    legendPosition={formValues.legendPosition}
                    legendFontSize={formValues.legendFontSize}
                    onShowLegendChange={(value) => updateFormValue('showLegend', value)}
                    onLegendPositionChange={(value) => updateFormValue('legendPosition', value)}
                    onLegendFontSizeChange={(value) => updateFormValue('legendFontSize', value)}
                  />
                )}
              </div>
            </form>
          </div>

          {/* Right: Preview Pane */}
          <div className="chart-editor-dialog__preview-area">
            <h3 className="chart-editor-dialog__preview-title">Preview</h3>
            <div className="chart-editor-dialog__preview-container">
              {previewChart ? (
                <ChartContainer
                  chart={previewChart}
                  className="chart-editor-dialog__preview-chart"
                />
              ) : (
                <div className="chart-editor-dialog__preview-empty">
                  <EmptyChartIcon />
                  <span>Configure data range to see preview</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="chart-editor-dialog__footer">
          <button
            type="button"
            className="chart-editor-dialog__btn chart-editor-dialog__btn--secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className="chart-editor-dialog__btn chart-editor-dialog__btn--primary"
            onClick={handleFormSubmit}
          >
            {mode === 'create' ? 'Insert' : 'Update'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

// Icons

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartTypeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect x="2" y="8" width="3" height="6" rx="0.5" />
      <rect x="6.5" y="4" width="3" height="10" rx="0.5" />
      <rect x="11" y="6" width="3" height="8" rx="0.5" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect x="2" y="2" width="5" height="5" rx="0.5" opacity="0.5" />
      <rect x="9" y="2" width="5" height="5" rx="0.5" opacity="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="0.5" opacity="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="0.5" />
    </svg>
  );
}

function StyleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <circle cx="4" cy="4" r="2.5" fill="#4285F4" />
      <circle cx="12" cy="4" r="2.5" fill="#EA4335" />
      <circle cx="4" cy="12" r="2.5" fill="#FBBC04" />
      <circle cx="12" cy="12" r="2.5" fill="#34A853" />
    </svg>
  );
}

function AxesIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <line x1="3" y1="13" x2="3" y2="3" strokeLinecap="round" />
      <line x1="3" y1="13" x2="13" y2="13" strokeLinecap="round" />
      <polygon points="3,3 1.5,5 4.5,5" fill="currentColor" stroke="none" />
      <polygon points="13,13 11,11.5 11,14.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LegendIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <rect x="2" y="3" width="3" height="3" rx="0.5" fill="#4285F4" />
      <rect x="6" y="4" width="8" height="1" rx="0.5" opacity="0.5" />
      <rect x="2" y="8" width="3" height="3" rx="0.5" fill="#EA4335" />
      <rect x="6" y="9" width="8" height="1" rx="0.5" opacity="0.5" />
    </svg>
  );
}

function EmptyChartIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" width="64" height="64" opacity="0.3">
      <rect x="8" y="32" width="12" height="24" rx="2" />
      <rect x="26" y="16" width="12" height="40" rx="2" />
      <rect x="44" y="24" width="12" height="32" rx="2" />
    </svg>
  );
}

export default ChartEditorDialog;
