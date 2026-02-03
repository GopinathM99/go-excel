import React, { useCallback } from 'react';
import './ChartEditor.css';

/**
 * Number format presets
 */
const NUMBER_FORMAT_PRESETS = [
  { value: '', label: 'Auto' },
  { value: '#,##0', label: 'Number (1,234)' },
  { value: '#,##0.00', label: 'Decimal (1,234.56)' },
  { value: '0%', label: 'Percent (12%)' },
  { value: '0.00%', label: 'Percent Decimal (12.34%)' },
  { value: '$#,##0', label: 'Currency ($1,234)' },
  { value: '$#,##0.00', label: 'Currency Decimal ($1,234.56)' },
];

/**
 * Rotation presets for axis labels
 */
const ROTATION_PRESETS = [
  { value: 0, label: 'Horizontal' },
  { value: -45, label: '-45 degrees' },
  { value: -90, label: 'Vertical' },
  { value: 45, label: '+45 degrees' },
];

/**
 * Props for AxisEditor
 */
interface AxisEditorProps {
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
  // Errors
  xAxisMinError?: string;
  xAxisMaxError?: string;
  yAxisMinError?: string;
  yAxisMaxError?: string;
  // Handlers
  onXAxisTitleChange: (value: string) => void;
  onXAxisMinChange: (value: string) => void;
  onXAxisMaxChange: (value: string) => void;
  onXAxisGridLinesChange: (value: boolean) => void;
  onXAxisLabelRotationChange: (value: number) => void;
  onYAxisTitleChange: (value: string) => void;
  onYAxisMinChange: (value: string) => void;
  onYAxisMaxChange: (value: string) => void;
  onYAxisGridLinesChange: (value: boolean) => void;
  onYAxisNumberFormatChange: (value: string) => void;
  onEnableSecondaryAxisChange: (value: boolean) => void;
  // Whether axes are supported
  supportsAxes: boolean;
}

/**
 * AxisEditor - Configure X and Y axis options
 */
export function AxisEditor({
  xAxisTitle,
  xAxisMin,
  xAxisMax,
  xAxisGridLines,
  xAxisLabelRotation,
  yAxisTitle,
  yAxisMin,
  yAxisMax,
  yAxisGridLines,
  yAxisNumberFormat,
  enableSecondaryAxis,
  xAxisMinError,
  xAxisMaxError,
  yAxisMinError,
  yAxisMaxError,
  onXAxisTitleChange,
  onXAxisMinChange,
  onXAxisMaxChange,
  onXAxisGridLinesChange,
  onXAxisLabelRotationChange,
  onYAxisTitleChange,
  onYAxisMinChange,
  onYAxisMaxChange,
  onYAxisGridLinesChange,
  onYAxisNumberFormatChange,
  onEnableSecondaryAxisChange,
  supportsAxes,
}: AxisEditorProps) {
  if (!supportsAxes) {
    return (
      <div className="axis-editor axis-editor--disabled">
        <div className="axis-editor__message">
          <InfoIcon />
          <span>
            Axis configuration is not available for pie and doughnut charts.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="axis-editor">
      {/* X-Axis Section */}
      <div className="axis-editor__axis-section">
        <h4 className="axis-editor__heading">
          <HorizontalAxisIcon />
          Horizontal Axis (X)
        </h4>

        <div className="axis-editor__field">
          <label className="axis-editor__label">Axis Title</label>
          <input
            type="text"
            className="axis-editor__input"
            value={xAxisTitle}
            onChange={(e) => onXAxisTitleChange(e.target.value)}
            placeholder="Enter axis title"
          />
        </div>

        <div className="axis-editor__field-row">
          <div className="axis-editor__field axis-editor__field--half">
            <label className="axis-editor__label">Min Value</label>
            <input
              type="text"
              className={`axis-editor__input ${xAxisMinError ? 'axis-editor__input--error' : ''}`}
              value={xAxisMin}
              onChange={(e) => onXAxisMinChange(e.target.value)}
              placeholder="Auto"
            />
            {xAxisMinError && (
              <span className="axis-editor__error">{xAxisMinError}</span>
            )}
          </div>
          <div className="axis-editor__field axis-editor__field--half">
            <label className="axis-editor__label">Max Value</label>
            <input
              type="text"
              className={`axis-editor__input ${xAxisMaxError ? 'axis-editor__input--error' : ''}`}
              value={xAxisMax}
              onChange={(e) => onXAxisMaxChange(e.target.value)}
              placeholder="Auto"
            />
            {xAxisMaxError && (
              <span className="axis-editor__error">{xAxisMaxError}</span>
            )}
          </div>
        </div>

        <div className="axis-editor__field">
          <label className="axis-editor__label">Label Rotation</label>
          <div className="axis-editor__rotation-presets">
            {ROTATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`axis-editor__rotation-btn ${
                  xAxisLabelRotation === preset.value ? 'axis-editor__rotation-btn--selected' : ''
                }`}
                onClick={() => onXAxisLabelRotationChange(preset.value)}
                title={preset.label}
              >
                <RotationIcon rotation={preset.value} />
              </button>
            ))}
          </div>
        </div>

        <label className="axis-editor__checkbox">
          <input
            type="checkbox"
            checked={xAxisGridLines}
            onChange={(e) => onXAxisGridLinesChange(e.target.checked)}
          />
          <span>Show gridlines</span>
        </label>
      </div>

      {/* Y-Axis Section */}
      <div className="axis-editor__axis-section">
        <h4 className="axis-editor__heading">
          <VerticalAxisIcon />
          Vertical Axis (Y)
        </h4>

        <div className="axis-editor__field">
          <label className="axis-editor__label">Axis Title</label>
          <input
            type="text"
            className="axis-editor__input"
            value={yAxisTitle}
            onChange={(e) => onYAxisTitleChange(e.target.value)}
            placeholder="Enter axis title"
          />
        </div>

        <div className="axis-editor__field-row">
          <div className="axis-editor__field axis-editor__field--half">
            <label className="axis-editor__label">Min Value</label>
            <input
              type="text"
              className={`axis-editor__input ${yAxisMinError ? 'axis-editor__input--error' : ''}`}
              value={yAxisMin}
              onChange={(e) => onYAxisMinChange(e.target.value)}
              placeholder="Auto"
            />
            {yAxisMinError && (
              <span className="axis-editor__error">{yAxisMinError}</span>
            )}
          </div>
          <div className="axis-editor__field axis-editor__field--half">
            <label className="axis-editor__label">Max Value</label>
            <input
              type="text"
              className={`axis-editor__input ${yAxisMaxError ? 'axis-editor__input--error' : ''}`}
              value={yAxisMax}
              onChange={(e) => onYAxisMaxChange(e.target.value)}
              placeholder="Auto"
            />
            {yAxisMaxError && (
              <span className="axis-editor__error">{yAxisMaxError}</span>
            )}
          </div>
        </div>

        <div className="axis-editor__field">
          <label className="axis-editor__label">Number Format</label>
          <select
            className="axis-editor__select"
            value={yAxisNumberFormat}
            onChange={(e) => onYAxisNumberFormatChange(e.target.value)}
          >
            {NUMBER_FORMAT_PRESETS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </div>

        <label className="axis-editor__checkbox">
          <input
            type="checkbox"
            checked={yAxisGridLines}
            onChange={(e) => onYAxisGridLinesChange(e.target.checked)}
          />
          <span>Show gridlines</span>
        </label>
      </div>

      {/* Secondary Axis Section */}
      <div className="axis-editor__secondary-section">
        <label className="axis-editor__checkbox axis-editor__checkbox--prominent">
          <input
            type="checkbox"
            checked={enableSecondaryAxis}
            onChange={(e) => onEnableSecondaryAxisChange(e.target.checked)}
          />
          <span>Enable secondary vertical axis</span>
        </label>
        <p className="axis-editor__hint">
          Use a secondary axis when you have data series with very different value ranges.
        </p>
      </div>
    </div>
  );
}

// Icons

function HorizontalAxisIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="12" x2="2" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <polygon points="14,12 11,10 11,14" fill="currentColor" />
    </svg>
  );
}

function VerticalAxisIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <line x1="4" y1="14" x2="4" y2="2" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <polygon points="4,2 2,5 6,5" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.5" r="1" fill="currentColor" />
    </svg>
  );
}

function RotationIcon({ rotation }: { rotation: number }) {
  // Visual representation of text at different angles
  const transform = `rotate(${rotation} 8 8)`;
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <g transform={transform}>
        <rect x="3" y="7" width="10" height="2" rx="0.5" />
      </g>
    </svg>
  );
}

export default AxisEditor;
