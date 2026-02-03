import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { NumberFormat, NumberFormatCategory } from '@excel/core';
import { NUMBER_FORMAT_PRESETS } from '../../hooks/useFormatting';

interface NumberFormatPickerProps {
  currentFormat: NumberFormat | undefined;
  currentValue?: unknown;
  onFormatSelect: (format: NumberFormat) => void;
}

/**
 * Quick format buttons configuration
 */
const QUICK_FORMATS: { icon: string; label: string; format: NumberFormat }[] = [
  {
    icon: '$',
    label: 'Currency',
    format: { category: 'currency', formatString: '$#,##0.00', currencySymbol: '$', decimalPlaces: 2 },
  },
  {
    icon: '%',
    label: 'Percentage',
    format: { category: 'percentage', formatString: '0%', decimalPlaces: 0 },
  },
  {
    icon: ',',
    label: 'Comma Style',
    format: { category: 'number', formatString: '#,##0.00', decimalPlaces: 2, useThousandsSeparator: true },
  },
];

/**
 * Format a sample value to preview the format
 */
function formatPreview(value: unknown, format: NumberFormat): string {
  if (value === undefined || value === null) {
    // Use sample values based on category
    switch (format.category) {
      case 'percentage':
        value = 0.1;
        break;
      case 'date':
        value = new Date();
        break;
      case 'time':
        value = new Date();
        break;
      default:
        value = 1234.1;
    }
  }

  try {
    // Simple preview formatting
    if (typeof value === 'number') {
      switch (format.category) {
        case 'percentage':
          return `${(value * 100).toFixed(format.decimalPlaces ?? 0)}%`;
        case 'currency':
          return `${format.currencySymbol ?? '$'}${value.toLocaleString(undefined, {
            minimumFractionDigits: format.decimalPlaces ?? 2,
            maximumFractionDigits: format.decimalPlaces ?? 2,
          })}`;
        case 'accounting':
          return `${format.currencySymbol ?? '$'} ${value.toLocaleString(undefined, {
            minimumFractionDigits: format.decimalPlaces ?? 2,
            maximumFractionDigits: format.decimalPlaces ?? 2,
          })}`;
        case 'scientific':
          return value.toExponential(2);
        case 'number':
          return value.toLocaleString(undefined, {
            minimumFractionDigits: format.decimalPlaces ?? 0,
            maximumFractionDigits: format.decimalPlaces ?? 0,
            useGrouping: format.useThousandsSeparator ?? true,
          });
        case 'fraction':
          return format.formatString.includes('?') ? `${Math.floor(value)} 1/4` : String(value);
        case 'general':
        default:
          return String(value);
      }
    }

    if (value instanceof Date) {
      switch (format.category) {
        case 'date':
          return value.toLocaleDateString();
        case 'time':
          return value.toLocaleTimeString();
        default:
          return value.toLocaleString();
      }
    }

    return String(value);
  } catch {
    return format.formatString;
  }
}

/**
 * NumberFormatPicker component for selecting number formats
 */
export const NumberFormatPicker = memo(function NumberFormatPicker({
  currentFormat,
  currentValue,
  onFormatSelect,
}: NumberFormatPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<NumberFormatCategory | null>(null);
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

  const handleFormatSelect = useCallback((format: NumberFormat) => {
    onFormatSelect(format);
    setIsOpen(false);
  }, [onFormatSelect]);

  const handleCategoryClick = useCallback((category: NumberFormatCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  }, [expandedCategory]);

  // Get current format display label
  const currentLabel = useMemo(() => {
    if (!currentFormat) return 'General';
    const category = NUMBER_FORMAT_PRESETS.find((c) => c.category === currentFormat.category);
    if (!category) return currentFormat.category;
    const format = category.formats.find((f) => f.format.formatString === currentFormat.formatString);
    return format?.label ?? category.label;
  }, [currentFormat]);

  return (
    <div className="format-dropdown" ref={containerRef}>
      {/* Quick format buttons */}
      {QUICK_FORMATS.map((qf) => (
        <button
          key={qf.label}
          className={`format-btn ${currentFormat?.category === qf.format.category ? 'active' : ''}`}
          onClick={() => handleFormatSelect(qf.format)}
          title={qf.label}
          aria-label={qf.label}
        >
          {qf.icon}
        </button>
      ))}

      {/* Increase/Decrease decimal buttons */}
      <button
        className="format-btn"
        onClick={() => {
          const decimals = (currentFormat?.decimalPlaces ?? 0) + 1;
          const newFormat: NumberFormat = {
            ...currentFormat,
            category: currentFormat?.category ?? 'number',
            formatString: decimals === 0 ? '#,##0' : `#,##0.${'0'.repeat(decimals)}`,
            decimalPlaces: decimals,
          };
          onFormatSelect(newFormat);
        }}
        title="Increase Decimal"
        aria-label="Increase decimal places"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
          <text x="1" y="12" fontSize="8" fill="currentColor">.0</text>
          <path d="M11 4l3 0M11 8l3 0" strokeWidth="1.5" />
          <path d="M12.5 5.5l0 5" strokeWidth="1.5" />
        </svg>
      </button>
      <button
        className="format-btn"
        onClick={() => {
          const decimals = Math.max(0, (currentFormat?.decimalPlaces ?? 2) - 1);
          const newFormat: NumberFormat = {
            ...currentFormat,
            category: currentFormat?.category ?? 'number',
            formatString: decimals === 0 ? '#,##0' : `#,##0.${'0'.repeat(decimals)}`,
            decimalPlaces: decimals,
          };
          onFormatSelect(newFormat);
        }}
        title="Decrease Decimal"
        aria-label="Decrease decimal places"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
          <text x="1" y="12" fontSize="8" fill="currentColor">.0</text>
          <path d="M11 6l3 0" strokeWidth="1.5" />
        </svg>
      </button>

      {/* Format dropdown */}
      <button
        className="format-btn format-btn-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        title="Number Format"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{ minWidth: '80px', justifyContent: 'flex-start', paddingLeft: '8px' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentLabel}
        </span>
      </button>

      {isOpen && (
        <div className="format-dropdown-menu number-format-picker format-dropdown-menu-right" role="menu">
          {NUMBER_FORMAT_PRESETS.map((category) => (
            <div key={category.category} className="number-format-category">
              {category.formats.length === 1 ? (
                // Single format - just a button
                <button
                  className={`format-dropdown-item ${currentFormat?.category === category.category ? 'active' : ''}`}
                  onClick={() => handleFormatSelect(category.formats[0].format)}
                >
                  <span>{category.label}</span>
                  <span className="number-format-option-preview">
                    {formatPreview(currentValue, category.formats[0].format)}
                  </span>
                </button>
              ) : (
                // Multiple formats - expandable
                <>
                  <button
                    className="number-format-category-label"
                    onClick={() => handleCategoryClick(category.category)}
                    aria-expanded={expandedCategory === category.category}
                    style={{
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{category.label}</span>
                    <svg
                      viewBox="0 0 8 8"
                      width="8"
                      height="8"
                      style={{
                        transform: expandedCategory === category.category ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                      }}
                    >
                      <path d="M1 2l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                  {expandedCategory === category.category && (
                    <div>
                      {category.formats.map((format, index) => (
                        <button
                          key={index}
                          className={`number-format-option ${
                            currentFormat?.formatString === format.format.formatString ? 'active' : ''
                          }`}
                          onClick={() => handleFormatSelect(format.format)}
                        >
                          <span>{format.label}</span>
                          <span className="number-format-option-preview">
                            {formatPreview(currentValue, format.format)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default NumberFormatPicker;
