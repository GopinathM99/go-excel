import { memo, useState, useRef, useEffect, useCallback } from 'react';
import type { BorderStyle } from '@excel/core';

interface BorderPickerProps {
  onApplyBorder: (
    preset: 'all' | 'outside' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right',
    style?: BorderStyle,
    color?: string
  ) => void;
  currentColor?: string;
}

/**
 * Border style options
 */
const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'thick', label: 'Thick' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

/**
 * Border preset icons as SVG paths
 */
const BorderIcons = {
  all: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  outside: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" />
    </svg>
  ),
  inside: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  none: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2">
      <rect x="3" y="3" width="18" height="18" />
    </svg>
  ),
  top: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="3" x2="21" y2="3" />
    </svg>
  ),
  bottom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="3" x2="3" y2="21" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="21" y1="3" x2="21" y2="21" />
    </svg>
  ),
};

/**
 * BorderPicker component for selecting border styles
 */
export const BorderPicker = memo(function BorderPicker({
  onApplyBorder,
  currentColor = '#000000',
}: BorderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<BorderStyle>('thin');
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handlePresetClick = useCallback(
    (preset: 'all' | 'outside' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right') => {
      onApplyBorder(preset, selectedStyle, selectedColor);
      setIsOpen(false);
    },
    [onApplyBorder, selectedStyle, selectedColor]
  );

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(e.target.value);
  }, []);

  return (
    <div className="format-dropdown" ref={containerRef}>
      <div className="format-btn-split">
        <button
          className="format-btn format-btn-split-main"
          onClick={() => onApplyBorder('outside', selectedStyle, selectedColor)}
          title="Apply Border"
          aria-label="Apply border to selection"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="12" height="12" />
          </svg>
        </button>
        <button
          className="format-btn format-btn-split-arrow"
          onClick={() => setIsOpen(!isOpen)}
          title="Border Options"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <svg viewBox="0 0 8 8" fill="currentColor">
            <path d="M1 2l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="format-dropdown-menu" role="menu">
          <div className="border-picker-container">
            {/* Border Presets */}
            <div className="format-dropdown-header">Border Presets</div>
            <div className="border-picker-presets">
              <button
                className="border-picker-preset"
                onClick={() => handlePresetClick('all')}
                title="All Borders"
              >
                {BorderIcons.all}
                <span>All</span>
              </button>
              <button
                className="border-picker-preset"
                onClick={() => handlePresetClick('outside')}
                title="Outside Borders"
              >
                {BorderIcons.outside}
                <span>Outside</span>
              </button>
              <button
                className="border-picker-preset"
                onClick={() => handlePresetClick('inside')}
                title="Inside Borders"
              >
                {BorderIcons.inside}
                <span>Inside</span>
              </button>
              <button
                className="border-picker-preset"
                onClick={() => handlePresetClick('none')}
                title="No Border"
              >
                {BorderIcons.none}
                <span>None</span>
              </button>
            </div>

            <div className="format-dropdown-divider" />

            {/* Individual Sides */}
            <div className="format-dropdown-header">Border Sides</div>
            <div className="border-picker-sides">
              <button
                className="border-picker-side"
                onClick={() => handlePresetClick('top')}
                title="Top Border"
              >
                {BorderIcons.top}
              </button>
              <button
                className="border-picker-side"
                onClick={() => handlePresetClick('bottom')}
                title="Bottom Border"
              >
                {BorderIcons.bottom}
              </button>
              <button
                className="border-picker-side"
                onClick={() => handlePresetClick('left')}
                title="Left Border"
              >
                {BorderIcons.left}
              </button>
              <button
                className="border-picker-side"
                onClick={() => handlePresetClick('right')}
                title="Right Border"
              >
                {BorderIcons.right}
              </button>
            </div>

            <div className="format-dropdown-divider" />

            {/* Border Options */}
            <div className="format-dropdown-header">Border Style</div>
            <div className="border-picker-options">
              <select
                className="format-select border-picker-style-select"
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value as BorderStyle)}
                aria-label="Border style"
              >
                {BORDER_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
              <input
                type="color"
                className="border-picker-color-btn"
                value={selectedColor}
                onChange={handleColorChange}
                title="Border Color"
                aria-label="Border color"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default BorderPicker;
