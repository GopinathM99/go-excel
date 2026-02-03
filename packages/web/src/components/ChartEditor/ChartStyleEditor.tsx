import React, { useCallback, useState } from 'react';
import { COLOR_SCHEMES, type ColorSchemeName } from '../../hooks/useChartEditor';
import './ChartEditor.css';

/**
 * Font family options
 */
const FONT_OPTIONS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
  { value: '"Helvetica Neue", sans-serif', label: 'Helvetica' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'system-ui, sans-serif', label: 'System Default' },
];

/**
 * Border style presets
 */
const BORDER_PRESETS = [
  { width: 0, label: 'None' },
  { width: 1, label: 'Thin' },
  { width: 2, label: 'Medium' },
  { width: 3, label: 'Thick' },
];

/**
 * Props for ChartStyleEditor
 */
interface ChartStyleEditorProps {
  title: string;
  colorScheme: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  fontFamily: string;
  onTitleChange: (value: string) => void;
  onColorSchemeChange: (value: string) => void;
  onBackgroundColorChange: (value: string) => void;
  onBorderColorChange: (value: string) => void;
  onBorderWidthChange: (value: number) => void;
  onFontFamilyChange: (value: string) => void;
}

/**
 * ChartStyleEditor - Configure chart colors, fonts, and appearance
 */
export function ChartStyleEditor({
  title,
  colorScheme,
  backgroundColor,
  borderColor,
  borderWidth,
  fontFamily,
  onTitleChange,
  onColorSchemeChange,
  onBackgroundColorChange,
  onBorderColorChange,
  onBorderWidthChange,
  onFontFamilyChange,
}: ChartStyleEditorProps) {
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(e.target.value);
    },
    [onTitleChange]
  );

  return (
    <div className="chart-style-editor">
      <div className="chart-style-editor__section">
        <h4 className="chart-style-editor__heading">Chart Title</h4>
        <input
          type="text"
          className="chart-style-editor__input"
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter chart title"
        />
      </div>

      <div className="chart-style-editor__section">
        <h4 className="chart-style-editor__heading">Color Scheme</h4>
        <div className="chart-style-editor__color-schemes">
          {Object.entries(COLOR_SCHEMES).map(([name, colors]) => (
            <button
              key={name}
              type="button"
              className={`chart-style-editor__scheme-btn ${
                colorScheme === name ? 'chart-style-editor__scheme-btn--selected' : ''
              }`}
              onClick={() => onColorSchemeChange(name)}
              title={name.charAt(0).toUpperCase() + name.slice(1)}
            >
              <div className="chart-style-editor__scheme-preview">
                {colors.slice(0, 6).map((color, i) => (
                  <span
                    key={i}
                    className="chart-style-editor__scheme-color"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="chart-style-editor__scheme-name">
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="chart-style-editor__section">
        <h4 className="chart-style-editor__heading">Background</h4>
        <div className="chart-style-editor__color-row">
          <label className="chart-style-editor__color-label">Background Color</label>
          <div className="chart-style-editor__color-picker-wrapper">
            <button
              type="button"
              className="chart-style-editor__color-btn"
              onClick={() => setShowBgColorPicker(!showBgColorPicker)}
            >
              <span
                className="chart-style-editor__color-swatch"
                style={{ backgroundColor: backgroundColor }}
              />
              <span className="chart-style-editor__color-value">{backgroundColor}</span>
            </button>
            {showBgColorPicker && (
              <div className="chart-style-editor__color-dropdown">
                <ColorPalette
                  selectedColor={backgroundColor}
                  onSelect={(color) => {
                    onBackgroundColorChange(color);
                    setShowBgColorPicker(false);
                  }}
                />
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  className="chart-style-editor__color-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="chart-style-editor__section">
        <h4 className="chart-style-editor__heading">Border</h4>
        <div className="chart-style-editor__border-row">
          <div className="chart-style-editor__border-style">
            <label className="chart-style-editor__label">Style</label>
            <div className="chart-style-editor__border-presets">
              {BORDER_PRESETS.map((preset) => (
                <button
                  key={preset.width}
                  type="button"
                  className={`chart-style-editor__border-preset ${
                    borderWidth === preset.width ? 'chart-style-editor__border-preset--selected' : ''
                  }`}
                  onClick={() => onBorderWidthChange(preset.width)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-style-editor__border-color">
            <label className="chart-style-editor__label">Color</label>
            <div className="chart-style-editor__color-picker-wrapper">
              <button
                type="button"
                className="chart-style-editor__color-btn chart-style-editor__color-btn--small"
                onClick={() => setShowBorderColorPicker(!showBorderColorPicker)}
              >
                <span
                  className="chart-style-editor__color-swatch"
                  style={{ backgroundColor: borderColor }}
                />
              </button>
              {showBorderColorPicker && (
                <div className="chart-style-editor__color-dropdown">
                  <ColorPalette
                    selectedColor={borderColor}
                    onSelect={(color) => {
                      onBorderColorChange(color);
                      setShowBorderColorPicker(false);
                    }}
                  />
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => onBorderColorChange(e.target.value)}
                    className="chart-style-editor__color-input"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-style-editor__section">
        <h4 className="chart-style-editor__heading">Font</h4>
        <select
          className="chart-style-editor__select"
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>
        <div className="chart-style-editor__font-preview" style={{ fontFamily }}>
          The quick brown fox jumps over the lazy dog
        </div>
      </div>
    </div>
  );
}

/**
 * Color palette component
 */
function ColorPalette({
  selectedColor,
  onSelect,
}: {
  selectedColor: string;
  onSelect: (color: string) => void;
}) {
  const PALETTE_COLORS = [
    // Grayscale
    '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#424242', '#212121', '#000000',
    // Reds
    '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828',
    // Oranges
    '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#EF6C00',
    // Yellows
    '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825',
    // Greens
    '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32',
    // Blues
    '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0',
    // Purples
    '#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A',
  ];

  return (
    <div className="chart-style-editor__palette">
      {PALETTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`chart-style-editor__palette-color ${
            selectedColor.toUpperCase() === color ? 'chart-style-editor__palette-color--selected' : ''
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
          title={color}
        />
      ))}
    </div>
  );
}

export default ChartStyleEditor;
