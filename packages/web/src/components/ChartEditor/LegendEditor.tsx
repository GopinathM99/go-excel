import React from 'react';
import './ChartEditor.css';

/**
 * Legend position type
 */
type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Font size presets
 */
const FONT_SIZE_PRESETS = [
  { value: 9, label: 'Small' },
  { value: 11, label: 'Medium' },
  { value: 13, label: 'Large' },
  { value: 15, label: 'X-Large' },
];

/**
 * Props for LegendEditor
 */
interface LegendEditorProps {
  showLegend: boolean;
  legendPosition: LegendPosition;
  legendFontSize: number;
  onShowLegendChange: (value: boolean) => void;
  onLegendPositionChange: (value: LegendPosition) => void;
  onLegendFontSizeChange: (value: number) => void;
}

/**
 * LegendEditor - Configure chart legend visibility, position, and styling
 */
export function LegendEditor({
  showLegend,
  legendPosition,
  legendFontSize,
  onShowLegendChange,
  onLegendPositionChange,
  onLegendFontSizeChange,
}: LegendEditorProps) {
  return (
    <div className="legend-editor">
      <div className="legend-editor__section">
        <label className="legend-editor__toggle">
          <input
            type="checkbox"
            checked={showLegend}
            onChange={(e) => onShowLegendChange(e.target.checked)}
          />
          <span className="legend-editor__toggle-slider" />
          <span className="legend-editor__toggle-label">Show Legend</span>
        </label>
      </div>

      {showLegend && (
        <>
          <div className="legend-editor__section">
            <h4 className="legend-editor__heading">Position</h4>
            <div className="legend-editor__position-picker">
              <div className="legend-editor__position-grid">
                {/* Top */}
                <button
                  type="button"
                  className={`legend-editor__position-btn legend-editor__position-btn--top ${
                    legendPosition === 'top' ? 'legend-editor__position-btn--selected' : ''
                  }`}
                  onClick={() => onLegendPositionChange('top')}
                  title="Top"
                >
                  <PositionPreview position="top" />
                </button>

                {/* Left */}
                <button
                  type="button"
                  className={`legend-editor__position-btn legend-editor__position-btn--left ${
                    legendPosition === 'left' ? 'legend-editor__position-btn--selected' : ''
                  }`}
                  onClick={() => onLegendPositionChange('left')}
                  title="Left"
                >
                  <PositionPreview position="left" />
                </button>

                {/* Center (chart area) */}
                <div className="legend-editor__position-center">
                  <ChartIcon />
                </div>

                {/* Right */}
                <button
                  type="button"
                  className={`legend-editor__position-btn legend-editor__position-btn--right ${
                    legendPosition === 'right' ? 'legend-editor__position-btn--selected' : ''
                  }`}
                  onClick={() => onLegendPositionChange('right')}
                  title="Right"
                >
                  <PositionPreview position="right" />
                </button>

                {/* Bottom */}
                <button
                  type="button"
                  className={`legend-editor__position-btn legend-editor__position-btn--bottom ${
                    legendPosition === 'bottom' ? 'legend-editor__position-btn--selected' : ''
                  }`}
                  onClick={() => onLegendPositionChange('bottom')}
                  title="Bottom"
                >
                  <PositionPreview position="bottom" />
                </button>
              </div>
            </div>
          </div>

          <div className="legend-editor__section">
            <h4 className="legend-editor__heading">Font Size</h4>
            <div className="legend-editor__font-sizes">
              {FONT_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`legend-editor__font-size-btn ${
                    legendFontSize === preset.value ? 'legend-editor__font-size-btn--selected' : ''
                  }`}
                  onClick={() => onLegendFontSizeChange(preset.value)}
                >
                  <span
                    className="legend-editor__font-size-sample"
                    style={{ fontSize: `${preset.value}px` }}
                  >
                    Aa
                  </span>
                  <span className="legend-editor__font-size-label">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="legend-editor__preview-section">
            <h4 className="legend-editor__heading">Preview</h4>
            <div className="legend-editor__preview">
              <LegendPreview position={legendPosition} fontSize={legendFontSize} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Position preview icon
 */
function PositionPreview({ position }: { position: LegendPosition }) {
  return (
    <svg viewBox="0 0 24 24" className="legend-editor__position-icon">
      {/* Chart area */}
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Legend indicator */}
      {position === 'top' && (
        <g>
          <rect x="7" y="5" width="10" height="2" fill="currentColor" rx="0.5" />
        </g>
      )}
      {position === 'bottom' && (
        <g>
          <rect x="7" y="17" width="10" height="2" fill="currentColor" rx="0.5" />
        </g>
      )}
      {position === 'left' && (
        <g>
          <rect x="5" y="8" width="2" height="8" fill="currentColor" rx="0.5" />
        </g>
      )}
      {position === 'right' && (
        <g>
          <rect x="17" y="8" width="2" height="8" fill="currentColor" rx="0.5" />
        </g>
      )}
    </svg>
  );
}

/**
 * Chart icon for position picker center
 */
function ChartIcon() {
  return (
    <svg viewBox="0 0 40 40" className="legend-editor__chart-icon">
      <rect x="8" y="16" width="6" height="16" fill="#4285F4" rx="1" />
      <rect x="17" y="10" width="6" height="22" fill="#EA4335" rx="1" />
      <rect x="26" y="20" width="6" height="12" fill="#FBBC04" rx="1" />
    </svg>
  );
}

/**
 * Full legend preview
 */
function LegendPreview({
  position,
  fontSize,
}: {
  position: LegendPosition;
  fontSize: number;
}) {
  const isVertical = position === 'left' || position === 'right';

  const legendItems = (
    <div
      className={`legend-editor__preview-items ${
        isVertical ? 'legend-editor__preview-items--vertical' : ''
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <span className="legend-editor__preview-item">
        <span className="legend-editor__preview-marker" style={{ backgroundColor: '#4285F4' }} />
        Series 1
      </span>
      <span className="legend-editor__preview-item">
        <span className="legend-editor__preview-marker" style={{ backgroundColor: '#EA4335' }} />
        Series 2
      </span>
      <span className="legend-editor__preview-item">
        <span className="legend-editor__preview-marker" style={{ backgroundColor: '#FBBC04' }} />
        Series 3
      </span>
    </div>
  );

  const chartArea = (
    <div className="legend-editor__preview-chart">
      <svg viewBox="0 0 100 60">
        <rect x="10" y="30" width="20" height="25" fill="#4285F4" rx="2" />
        <rect x="40" y="15" width="20" height="40" fill="#EA4335" rx="2" />
        <rect x="70" y="25" width="20" height="30" fill="#FBBC04" rx="2" />
      </svg>
    </div>
  );

  return (
    <div className={`legend-editor__preview-layout legend-editor__preview-layout--${position}`}>
      {position === 'top' && (
        <>
          {legendItems}
          {chartArea}
        </>
      )}
      {position === 'bottom' && (
        <>
          {chartArea}
          {legendItems}
        </>
      )}
      {position === 'left' && (
        <>
          {legendItems}
          {chartArea}
        </>
      )}
      {position === 'right' && (
        <>
          {chartArea}
          {legendItems}
        </>
      )}
    </div>
  );
}

export default LegendEditor;
