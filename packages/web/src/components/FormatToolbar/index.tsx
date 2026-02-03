/**
 * FormatToolbar - Excel-like formatting toolbar components
 *
 * This module provides a comprehensive formatting toolbar with:
 * - Font family and size selection
 * - Text styling (bold, italic, underline, strikethrough)
 * - Horizontal and vertical alignment
 * - Text and fill color pickers
 * - Border style picker
 * - Number format picker
 * - Keyboard shortcuts support
 */

// Main toolbar component
export { FormatToolbar, default } from './FormatToolbar';

// Individual picker components
export { FontPicker } from './FontPicker';
export { ColorPicker } from './ColorPicker';
export { BorderPicker } from './BorderPicker';
export { NumberFormatPicker } from './NumberFormatPicker';

// Re-export hooks and utilities
export {
  useFormatting,
  useFormattingStore,
  COMMON_FONTS,
  COMMON_FONT_SIZES,
  NUMBER_FORMAT_PRESETS,
} from '../../hooks/useFormatting';

export type { CellPosition, SelectionRange } from '../../hooks/useFormatting';
