/**
 * Style-related exports for @excel/core
 */

// NumberFormatter
export {
  NumberFormatter,
  createNumberFormatter,
  defaultFormatter,
  formatValue,
  formatNumber,
  formatDate,
  BuiltInFormats,
  getFormatCategory,
  DEFAULT_LOCALE,
} from './NumberFormatter';

export type { NumberFormatLocale } from './NumberFormatter';

// StyleManager
export {
  StyleManager,
  createStyleManager,
  defaultStyleManager,
  BorderStyles,
  AlignmentPresets,
  Colors,
} from './StyleManager';

export type {
  StyleChangeEvent,
  StyleChangeListener,
  NamedStyle,
} from './StyleManager';
