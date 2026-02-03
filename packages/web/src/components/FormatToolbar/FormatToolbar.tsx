import { memo, useCallback } from 'react';
import { useFormatting } from '../../hooks/useFormatting';
import { FontPicker } from './FontPicker';
import { ColorPicker } from './ColorPicker';
import { BorderPicker } from './BorderPicker';
import { NumberFormatPicker } from './NumberFormatPicker';
import type { HorizontalAlign, VerticalAlign, BorderStyle } from '@excel/core';
import './FormatToolbar.css';

/**
 * Icons for alignment buttons
 */
const AlignIcons = {
  left: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h12v1.5H2zM2 7h8v1.5H2zM2 11h10v1.5H2z" />
    </svg>
  ),
  center: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h12v1.5H2zM4 7h8v1.5H4zM3 11h10v1.5H3z" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h12v1.5H2zM6 7h8v1.5H6zM4 11h10v1.5H4z" />
    </svg>
  ),
  top: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="2" width="10" height="1.5" />
      <rect x="6" y="5" width="4" height="2" />
    </svg>
  ),
  middle: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="7.25" width="10" height="1.5" />
      <rect x="6" y="4" width="4" height="2" />
      <rect x="6" y="10" width="4" height="2" />
    </svg>
  ),
  bottom: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="12.5" width="10" height="1.5" />
      <rect x="6" y="9" width="4" height="2" />
    </svg>
  ),
  wrapText: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 3h12v1.5H2zM2 7h8M2 11h6v1.5H2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M11 7c2 0 2 4-1 4H8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9 10l-1.5 1.5L9 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  ),
};

/**
 * FormatToolbar component - Main formatting toolbar
 */
export const FormatToolbar = memo(function FormatToolbar() {
  const {
    currentStyle,
    recentTextColors,
    recentFillColors,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrikethrough,
    setFontFamily,
    setFontSize,
    setTextColor,
    setFillColor,
    setHorizontalAlign,
    setVerticalAlign,
    setNumberFormat,
    applyBorderPreset,
    toggleWrapText,
    clearFormatting,
  } = useFormatting();

  // Extract current style values
  const fontFamily = currentStyle.font?.family ?? 'Arial';
  const fontSize = currentStyle.font?.size ?? 11;
  const isBold = currentStyle.font?.bold ?? false;
  const isItalic = currentStyle.font?.italic ?? false;
  const isUnderline = currentStyle.font?.underline ?? false;
  const isStrikethrough = currentStyle.font?.strikethrough ?? false;
  const textColor = currentStyle.font?.color ?? '#000000';
  const fillColor = typeof currentStyle.fill === 'string' ? currentStyle.fill : 'transparent';
  const horizontalAlign = currentStyle.horizontalAlign ?? 'left';
  const verticalAlign = currentStyle.verticalAlign ?? 'bottom';
  const isWrapText = currentStyle.wrapText ?? false;
  const numberFormat = currentStyle.numberFormat;

  // Border handler
  const handleApplyBorder = useCallback(
    (preset: 'all' | 'outside' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right', style?: BorderStyle, color?: string) => {
      applyBorderPreset(preset, style, color);
    },
    [applyBorderPreset]
  );

  return (
    <div className="format-toolbar" role="toolbar" aria-label="Formatting Toolbar">
      {/* Font Section */}
      <div className="format-toolbar-section" role="group" aria-label="Font">
        <FontPicker
          currentFont={fontFamily}
          currentSize={fontSize}
          onFontChange={setFontFamily}
          onSizeChange={setFontSize}
        />

        {/* Bold, Italic, Underline, Strikethrough */}
        <button
          className={`format-btn format-btn-bold ${isBold ? 'active' : ''}`}
          onClick={toggleBold}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          aria-pressed={isBold}
        >
          B
        </button>
        <button
          className={`format-btn format-btn-italic ${isItalic ? 'active' : ''}`}
          onClick={toggleItalic}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          aria-pressed={isItalic}
        >
          I
        </button>
        <button
          className={`format-btn format-btn-underline ${isUnderline ? 'active' : ''}`}
          onClick={toggleUnderline}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          aria-pressed={isUnderline}
        >
          U
        </button>
        <button
          className={`format-btn format-btn-strikethrough ${isStrikethrough ? 'active' : ''}`}
          onClick={toggleStrikethrough}
          title="Strikethrough (Ctrl+5)"
          aria-label="Strikethrough"
          aria-pressed={isStrikethrough}
        >
          S
        </button>
      </div>

      {/* Alignment Section */}
      <div className="format-toolbar-section" role="group" aria-label="Alignment">
        {/* Horizontal Alignment */}
        <button
          className={`format-btn ${horizontalAlign === 'left' ? 'active' : ''}`}
          onClick={() => setHorizontalAlign('left')}
          title="Align Left"
          aria-label="Align Left"
          aria-pressed={horizontalAlign === 'left'}
        >
          {AlignIcons.left}
        </button>
        <button
          className={`format-btn ${horizontalAlign === 'center' ? 'active' : ''}`}
          onClick={() => setHorizontalAlign('center')}
          title="Align Center"
          aria-label="Align Center"
          aria-pressed={horizontalAlign === 'center'}
        >
          {AlignIcons.center}
        </button>
        <button
          className={`format-btn ${horizontalAlign === 'right' ? 'active' : ''}`}
          onClick={() => setHorizontalAlign('right')}
          title="Align Right"
          aria-label="Align Right"
          aria-pressed={horizontalAlign === 'right'}
        >
          {AlignIcons.right}
        </button>

        {/* Vertical Alignment */}
        <button
          className={`format-btn ${verticalAlign === 'top' ? 'active' : ''}`}
          onClick={() => setVerticalAlign('top')}
          title="Align Top"
          aria-label="Align Top"
          aria-pressed={verticalAlign === 'top'}
        >
          {AlignIcons.top}
        </button>
        <button
          className={`format-btn ${verticalAlign === 'middle' ? 'active' : ''}`}
          onClick={() => setVerticalAlign('middle')}
          title="Align Middle"
          aria-label="Align Middle"
          aria-pressed={verticalAlign === 'middle'}
        >
          {AlignIcons.middle}
        </button>
        <button
          className={`format-btn ${verticalAlign === 'bottom' ? 'active' : ''}`}
          onClick={() => setVerticalAlign('bottom')}
          title="Align Bottom"
          aria-label="Align Bottom"
          aria-pressed={verticalAlign === 'bottom'}
        >
          {AlignIcons.bottom}
        </button>

        {/* Wrap Text */}
        <button
          className={`format-btn ${isWrapText ? 'active' : ''}`}
          onClick={toggleWrapText}
          title="Wrap Text"
          aria-label="Wrap Text"
          aria-pressed={isWrapText}
        >
          {AlignIcons.wrapText}
        </button>
      </div>

      {/* Color Section */}
      <div className="format-toolbar-section" role="group" aria-label="Colors">
        <ColorPicker
          currentColor={textColor}
          recentColors={recentTextColors}
          onColorSelect={setTextColor}
          type="text"
        />
        <ColorPicker
          currentColor={fillColor}
          recentColors={recentFillColors}
          onColorSelect={setFillColor}
          type="fill"
        />
      </div>

      {/* Border Section */}
      <div className="format-toolbar-section" role="group" aria-label="Borders">
        <BorderPicker onApplyBorder={handleApplyBorder} />
      </div>

      {/* Number Format Section */}
      <div className="format-toolbar-section" role="group" aria-label="Number Format">
        <NumberFormatPicker
          currentFormat={numberFormat}
          onFormatSelect={setNumberFormat}
        />
      </div>

      {/* Clear Formatting */}
      <div className="format-toolbar-section" role="group" aria-label="Clear">
        <button
          className="format-btn"
          onClick={clearFormatting}
          title="Clear Formatting"
          aria-label="Clear all formatting"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default FormatToolbar;
