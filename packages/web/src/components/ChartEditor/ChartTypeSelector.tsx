import React, { useCallback } from 'react';
import type { ChartType } from '@excel/core';
import type { ChartSubType } from '../../hooks/useChartEditor';
import './ChartEditor.css';

/**
 * Chart type configuration with icon and sub-types
 */
interface ChartTypeConfig {
  type: ChartType;
  label: string;
  icon: React.ReactNode;
  subTypes: {
    key: ChartSubType;
    label: string;
    description: string;
  }[];
}

/**
 * Available chart type configurations
 */
const CHART_TYPES: ChartTypeConfig[] = [
  {
    type: 'column',
    label: 'Column',
    icon: <ColumnChartIcon />,
    subTypes: [
      { key: 'clustered', label: 'Clustered', description: 'Compare values across categories' },
      { key: 'stacked', label: 'Stacked', description: 'Show parts of a whole over categories' },
      { key: 'percentStacked', label: '100% Stacked', description: 'Compare percentage contribution' },
    ],
  },
  {
    type: 'bar',
    label: 'Bar',
    icon: <BarChartIcon />,
    subTypes: [
      { key: 'clustered', label: 'Clustered', description: 'Compare values across categories' },
      { key: 'stacked', label: 'Stacked', description: 'Show parts of a whole over categories' },
      { key: 'percentStacked', label: '100% Stacked', description: 'Compare percentage contribution' },
    ],
  },
  {
    type: 'line',
    label: 'Line',
    icon: <LineChartIcon />,
    subTypes: [
      { key: 'default', label: 'Line', description: 'Show trends over time' },
      { key: 'stacked', label: 'Stacked', description: 'Show cumulative trends' },
      { key: 'percentStacked', label: '100% Stacked', description: 'Show percentage trends' },
    ],
  },
  {
    type: 'pie',
    label: 'Pie',
    icon: <PieChartIcon />,
    subTypes: [
      { key: 'default', label: 'Pie', description: 'Show proportions of a whole' },
    ],
  },
  {
    type: 'doughnut',
    label: 'Doughnut',
    icon: <DoughnutChartIcon />,
    subTypes: [
      { key: 'default', label: 'Doughnut', description: 'Show proportions with center space' },
    ],
  },
  {
    type: 'area',
    label: 'Area',
    icon: <AreaChartIcon />,
    subTypes: [
      { key: 'default', label: 'Area', description: 'Show magnitude over time' },
      { key: 'stacked', label: 'Stacked', description: 'Show cumulative totals' },
      { key: 'percentStacked', label: '100% Stacked', description: 'Show percentage contribution' },
    ],
  },
  {
    type: 'scatter',
    label: 'Scatter',
    icon: <ScatterChartIcon />,
    subTypes: [
      { key: 'default', label: 'Scatter', description: 'Show relationships between values' },
    ],
  },
];

/**
 * Props for ChartTypeSelector
 */
interface ChartTypeSelectorProps {
  selectedType: ChartType;
  selectedSubType: ChartSubType;
  onTypeChange: (type: ChartType) => void;
  onSubTypeChange: (subType: ChartSubType) => void;
}

/**
 * ChartTypeSelector - Grid of chart type options with sub-types
 */
export function ChartTypeSelector({
  selectedType,
  selectedSubType,
  onTypeChange,
  onSubTypeChange,
}: ChartTypeSelectorProps) {
  const selectedConfig = CHART_TYPES.find((c) => c.type === selectedType);

  const handleTypeSelect = useCallback(
    (type: ChartType) => {
      onTypeChange(type);
      // Reset to first sub-type when changing type
      const config = CHART_TYPES.find((c) => c.type === type);
      if (config && config.subTypes.length > 0) {
        onSubTypeChange(config.subTypes[0].key);
      }
    },
    [onTypeChange, onSubTypeChange]
  );

  return (
    <div className="chart-type-selector">
      <div className="chart-type-selector__section">
        <h4 className="chart-type-selector__heading">Chart Type</h4>
        <div className="chart-type-selector__grid">
          {CHART_TYPES.map((config) => (
            <button
              key={config.type}
              className={`chart-type-selector__type-btn ${
                selectedType === config.type ? 'chart-type-selector__type-btn--selected' : ''
              }`}
              onClick={() => handleTypeSelect(config.type)}
              title={config.label}
              type="button"
            >
              <span className="chart-type-selector__icon">{config.icon}</span>
              <span className="chart-type-selector__label">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedConfig && selectedConfig.subTypes.length > 1 && (
        <div className="chart-type-selector__section">
          <h4 className="chart-type-selector__heading">{selectedConfig.label} Sub-Type</h4>
          <div className="chart-type-selector__subtypes">
            {selectedConfig.subTypes.map((subType) => (
              <button
                key={subType.key}
                className={`chart-type-selector__subtype-btn ${
                  selectedSubType === subType.key ? 'chart-type-selector__subtype-btn--selected' : ''
                }`}
                onClick={() => onSubTypeChange(subType.key)}
                type="button"
              >
                <span className="chart-type-selector__subtype-preview">
                  <SubTypePreview type={selectedType} subType={subType.key} />
                </span>
                <span className="chart-type-selector__subtype-info">
                  <span className="chart-type-selector__subtype-label">{subType.label}</span>
                  <span className="chart-type-selector__subtype-desc">{subType.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chart-type-selector__preview-area">
        <h4 className="chart-type-selector__heading">Preview</h4>
        <div className="chart-type-selector__preview-placeholder">
          <div className="chart-type-selector__preview-icon">
            {selectedConfig?.icon}
          </div>
          <span className="chart-type-selector__preview-text">
            {selectedConfig?.label} Chart
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Sub-type preview mini visualization
 */
function SubTypePreview({ type, subType }: { type: ChartType; subType: ChartSubType }) {
  // Simple SVG previews for sub-types
  if (type === 'column' || type === 'bar') {
    const isHorizontal = type === 'bar';

    if (subType === 'clustered') {
      return (
        <svg viewBox="0 0 40 30" className="chart-subtype-preview-svg">
          {isHorizontal ? (
            <>
              <rect x="0" y="2" width="25" height="4" fill="#4285F4" />
              <rect x="0" y="7" width="20" height="4" fill="#EA4335" />
              <rect x="0" y="14" width="35" height="4" fill="#4285F4" />
              <rect x="0" y="19" width="30" height="4" fill="#EA4335" />
            </>
          ) : (
            <>
              <rect x="4" y="10" width="6" height="18" fill="#4285F4" />
              <rect x="11" y="15" width="6" height="13" fill="#EA4335" />
              <rect x="21" y="5" width="6" height="23" fill="#4285F4" />
              <rect x="28" y="8" width="6" height="20" fill="#EA4335" />
            </>
          )}
        </svg>
      );
    }

    if (subType === 'stacked') {
      return (
        <svg viewBox="0 0 40 30" className="chart-subtype-preview-svg">
          {isHorizontal ? (
            <>
              <rect x="0" y="4" width="15" height="6" fill="#4285F4" />
              <rect x="15" y="4" width="10" height="6" fill="#EA4335" />
              <rect x="0" y="16" width="20" height="6" fill="#4285F4" />
              <rect x="20" y="16" width="15" height="6" fill="#EA4335" />
            </>
          ) : (
            <>
              <rect x="6" y="15" width="10" height="13" fill="#4285F4" />
              <rect x="6" y="8" width="10" height="7" fill="#EA4335" />
              <rect x="24" y="10" width="10" height="18" fill="#4285F4" />
              <rect x="24" y="3" width="10" height="7" fill="#EA4335" />
            </>
          )}
        </svg>
      );
    }

    if (subType === 'percentStacked') {
      return (
        <svg viewBox="0 0 40 30" className="chart-subtype-preview-svg">
          {isHorizontal ? (
            <>
              <rect x="0" y="4" width="24" height="6" fill="#4285F4" />
              <rect x="24" y="4" width="14" height="6" fill="#EA4335" />
              <rect x="0" y="16" width="20" height="6" fill="#4285F4" />
              <rect x="20" y="16" width="18" height="6" fill="#EA4335" />
            </>
          ) : (
            <>
              <rect x="6" y="10" width="10" height="18" fill="#4285F4" />
              <rect x="6" y="2" width="10" height="8" fill="#EA4335" />
              <rect x="24" y="10" width="10" height="18" fill="#4285F4" />
              <rect x="24" y="2" width="10" height="8" fill="#EA4335" />
            </>
          )}
        </svg>
      );
    }
  }

  if (type === 'line' || type === 'area') {
    const isArea = type === 'area';

    if (subType === 'default') {
      return (
        <svg viewBox="0 0 40 30" className="chart-subtype-preview-svg">
          <polyline
            points="2,22 12,12 22,18 38,6"
            fill={isArea ? 'rgba(66, 133, 244, 0.3)' : 'none'}
            stroke="#4285F4"
            strokeWidth="2"
          />
          {isArea && <polygon points="2,22 12,12 22,18 38,6 38,28 2,28" fill="rgba(66, 133, 244, 0.3)" />}
        </svg>
      );
    }
  }

  // Default preview
  return (
    <svg viewBox="0 0 40 30" className="chart-subtype-preview-svg">
      <rect x="5" y="8" width="8" height="20" fill="#4285F4" opacity="0.5" />
      <rect x="16" y="12" width="8" height="16" fill="#4285F4" opacity="0.7" />
      <rect x="27" y="4" width="8" height="24" fill="#4285F4" />
    </svg>
  );
}

// Chart Type Icons

function ColumnChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="12" width="4" height="9" rx="0.5" />
      <rect x="10" y="6" width="4" height="15" rx="0.5" />
      <rect x="17" y="9" width="4" height="12" rx="0.5" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="9" height="4" rx="0.5" />
      <rect x="3" y="10" width="15" height="4" rx="0.5" />
      <rect x="3" y="17" width="12" height="4" rx="0.5" />
    </svg>
  );
}

function LineChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,18 8,12 13,15 21,6" />
      <circle cx="3" cy="18" r="1.5" fill="currentColor" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="13" cy="15" r="1.5" fill="currentColor" />
      <circle cx="21" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PieChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2 A10,10 0 0,1 22,12 L12,12 Z" />
      <path d="M12,2 A10,10 0 0,0 3.5,17 L12,12 Z" opacity="0.7" />
      <path d="M3.5,17 A10,10 0 0,0 22,12 L12,12 Z" opacity="0.4" />
    </svg>
  );
}

function DoughnutChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2 A10,10 0 0,1 22,12 L17,12 A5,5 0 0,0 12,7 Z" />
      <path d="M12,2 A10,10 0 0,0 3.5,17 L7.5,14.5 A5,5 0 0,1 12,7 Z" opacity="0.7" />
      <path d="M3.5,17 A10,10 0 0,0 22,12 L17,12 A5,5 0 0,1 7.5,14.5 Z" opacity="0.4" />
    </svg>
  );
}

function AreaChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="3,20 3,14 8,10 14,14 21,6 21,20" opacity="0.4" />
      <polyline
        points="3,14 8,10 14,14 21,6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ScatterChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="16" r="2" />
      <circle cx="10" cy="10" r="2" />
      <circle cx="14" cy="14" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="8" cy="6" r="2" opacity="0.6" />
      <circle cx="16" cy="18" r="2" opacity="0.6" />
    </svg>
  );
}

export default ChartTypeSelector;
