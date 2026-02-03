import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { COMMON_FONTS, COMMON_FONT_SIZES } from '../../hooks/useFormatting';

interface FontPickerProps {
  currentFont: string;
  currentSize: number;
  onFontChange: (font: string) => void;
  onSizeChange: (size: number) => void;
}

/**
 * FontPicker component for selecting font family and size
 */
export const FontPicker = memo(function FontPicker({
  currentFont,
  currentSize,
  onFontChange,
  onSizeChange,
}: FontPickerProps) {
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [customSize, setCustomSize] = useState(currentSize.toString());
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const sizeInputRef = useRef<HTMLInputElement>(null);

  // Update custom size when currentSize changes
  useEffect(() => {
    setCustomSize(currentSize.toString());
  }, [currentSize]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setFontDropdownOpen(false);
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setSizeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFontSelect = useCallback((font: string) => {
    onFontChange(font);
    setFontDropdownOpen(false);
  }, [onFontChange]);

  const handleSizeSelect = useCallback((size: number) => {
    onSizeChange(size);
    setSizeDropdownOpen(false);
  }, [onSizeChange]);

  const handleCustomSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomSize(e.target.value);
  }, []);

  const handleCustomSizeBlur = useCallback(() => {
    const size = parseInt(customSize, 10);
    if (!isNaN(size) && size >= 1 && size <= 409) {
      onSizeChange(size);
    } else {
      setCustomSize(currentSize.toString());
    }
  }, [customSize, currentSize, onSizeChange]);

  const handleCustomSizeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSizeBlur();
      sizeInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setCustomSize(currentSize.toString());
      sizeInputRef.current?.blur();
    }
  }, [handleCustomSizeBlur, currentSize]);

  return (
    <>
      {/* Font Family Picker */}
      <div className="format-dropdown" ref={fontDropdownRef}>
        <button
          className="format-btn format-btn-dropdown"
          onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
          title="Font"
          aria-haspopup="listbox"
          aria-expanded={fontDropdownOpen}
          style={{
            minWidth: '120px',
            fontFamily: currentFont,
            justifyContent: 'flex-start',
            paddingLeft: '8px',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentFont}
          </span>
        </button>
        {fontDropdownOpen && (
          <div className="format-dropdown-menu" role="listbox" aria-label="Select font">
            {COMMON_FONTS.map((font) => (
              <button
                key={font}
                className={`format-dropdown-item font-picker-option ${font === currentFont ? 'active' : ''}`}
                onClick={() => handleFontSelect(font)}
                role="option"
                aria-selected={font === currentFont}
                style={{ fontFamily: font }}
              >
                {font}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size Picker */}
      <div className="format-dropdown" ref={sizeDropdownRef}>
        <input
          ref={sizeInputRef}
          type="text"
          className="format-select format-select-size"
          value={customSize}
          onChange={handleCustomSizeChange}
          onBlur={handleCustomSizeBlur}
          onKeyDown={handleCustomSizeKeyDown}
          onFocus={() => setSizeDropdownOpen(true)}
          title="Font Size"
          aria-label="Font size"
          style={{ textAlign: 'center' }}
        />
        {sizeDropdownOpen && (
          <div className="format-dropdown-menu" role="listbox" aria-label="Select font size">
            {COMMON_FONT_SIZES.map((size) => (
              <button
                key={size}
                className={`format-dropdown-item ${size === currentSize ? 'active' : ''}`}
                onClick={() => handleSizeSelect(size)}
                role="option"
                aria-selected={size === currentSize}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
});

export default FontPicker;
