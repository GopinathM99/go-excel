import { memo, useState, useRef, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  currentColor: string;
  recentColors: string[];
  onColorSelect: (color: string) => void;
  type: 'text' | 'fill';
}

/**
 * Excel-like color palette
 */
const COLOR_PALETTE = [
  // Row 1 - Theme colors (dark)
  ['#000000', '#1C1C1C', '#3B3B3B', '#5A5A5A', '#787878', '#969696', '#B4B4B4', '#D3D3D3', '#EBEBEB', '#FFFFFF'],
  // Row 2 - Theme colors
  ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'],
  // Row 3 - Lighter tints
  ['#F8CBAD', '#FFCCCC', '#FFE699', '#FFFF99', '#C6EFCE', '#A9D08E', '#BDD7EE', '#9DC3E6', '#8EA9DB', '#CCC0DA'],
  // Row 4 - Light tints
  ['#F4B084', '#FF9999', '#FFD966', '#FFFF66', '#A9D18E', '#70AD47', '#9BC2E6', '#5B9BD5', '#6A89CC', '#B4A7D6'],
  // Row 5 - Medium tints
  ['#ED7D31', '#FF6666', '#FFB800', '#FFFF00', '#70C050', '#00B050', '#00B0F0', '#2E75B6', '#4472C4', '#9673A6'],
  // Row 6 - Dark shades
  ['#C65911', '#C00000', '#BF8F00', '#BFC000', '#548235', '#375623', '#2F5496', '#1F4E79', '#305496', '#604A7B'],
];

/**
 * Standard colors for quick access
 */
const STANDARD_COLORS = [
  '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050',
  '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0',
];

/**
 * ColorPicker component for selecting text and fill colors
 */
export const ColorPicker = memo(function ColorPicker({
  currentColor,
  recentColors,
  onColorSelect,
  type,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleColorClick = useCallback((color: string) => {
    onColorSelect(color);
    setIsOpen(false);
  }, [onColorSelect]);

  const handleNoColor = useCallback(() => {
    onColorSelect('transparent');
    setIsOpen(false);
  }, [onColorSelect]);

  const handleMoreColors = useCallback(() => {
    // Create a hidden color input and trigger it
    const input = document.createElement('input');
    input.type = 'color';
    input.value = currentColor || '#000000';
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      onColorSelect(target.value);
    });
    input.addEventListener('change', () => {
      setIsOpen(false);
    });
    input.click();
  }, [currentColor, onColorSelect]);

  const displayColor = currentColor || (type === 'text' ? '#000000' : 'transparent');

  return (
    <div className="format-dropdown" ref={containerRef}>
      <div className="format-btn-split">
        <button
          className="format-btn format-btn-split-main format-btn-color"
          onClick={() => onColorSelect(displayColor)}
          title={type === 'text' ? 'Font Color' : 'Fill Color'}
          aria-label={type === 'text' ? 'Apply font color' : 'Apply fill color'}
        >
          {type === 'text' ? (
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 13L8 4l2.5 9M6 11h4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 12h12M8 3L4 10h8L8 3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          )}
          <div
            className="format-btn-color-indicator"
            style={{
              backgroundColor: displayColor === 'transparent' ? 'transparent' : displayColor,
              border: displayColor === 'transparent' ? '1px solid var(--color-border)' : 'none',
            }}
          />
        </button>
        <button
          className="format-btn format-btn-split-arrow"
          onClick={() => setIsOpen(!isOpen)}
          title={`${type === 'text' ? 'Font Color' : 'Fill Color'} Options`}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <svg viewBox="0 0 8 8" fill="currentColor">
            <path d="M1 2l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="format-dropdown-menu" role="listbox">
          <div className="color-picker-container">
            {/* No Color option (for fill only) */}
            {type === 'fill' && (
              <>
                <button
                  className="format-dropdown-item"
                  onClick={handleNoColor}
                >
                  <div
                    className="color-picker-swatch color-picker-swatch-transparent"
                    style={{ width: 16, height: 16 }}
                  />
                  <span>No Fill</span>
                </button>
                <div className="format-dropdown-divider" />
              </>
            )}

            {/* Theme Colors */}
            <div className="format-dropdown-header">Theme Colors</div>
            <div className="color-picker-grid">
              {COLOR_PALETTE.flat().map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  className={`color-picker-swatch ${color === currentColor ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorClick(color)}
                  title={color}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>

            {/* Standard Colors */}
            <div className="format-dropdown-header">Standard Colors</div>
            <div className="color-picker-grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
              {STANDARD_COLORS.map((color, index) => (
                <button
                  key={`std-${color}-${index}`}
                  className={`color-picker-swatch ${color === currentColor ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorClick(color)}
                  title={color}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>

            {/* Recent Colors */}
            {recentColors.length > 0 && (
              <div className="color-picker-recent">
                <div className="color-picker-recent-label">Recent Colors</div>
                <div className="color-picker-recent-colors">
                  {recentColors.map((color, index) => (
                    <button
                      key={`recent-${color}-${index}`}
                      className={`color-picker-swatch ${color === currentColor ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorClick(color)}
                      title={color}
                      aria-label={`Select recent color ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* More Colors */}
            <button className="color-picker-more" onClick={handleMoreColors}>
              More Colors...
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default ColorPicker;
