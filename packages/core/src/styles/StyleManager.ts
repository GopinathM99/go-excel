/**
 * StyleManager - Manages cell styles and provides style operations
 */

import type {
  CellStyle,
  FontStyle,
  CellBorders,
  Border,
  BorderStyle,
  NumberFormat,
  HorizontalAlign,
  VerticalAlign,
  CellFill,
  FillPattern,
  CellProtection,
} from '../models/CellStyle';

import {
  DEFAULT_CELL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_CELL_FILL,
  DEFAULT_CELL_PROTECTION,
  mergeCellStyles,
  isCellFill,
} from '../models/CellStyle';

import { NumberFormatter, createNumberFormatter } from './NumberFormatter';

/**
 * Style change event type
 */
export interface StyleChangeEvent {
  type: 'font' | 'fill' | 'border' | 'alignment' | 'numberFormat' | 'protection' | 'all';
  previousStyle: CellStyle | undefined;
  newStyle: CellStyle;
}

/**
 * Style listener callback
 */
export type StyleChangeListener = (event: StyleChangeEvent) => void;

/**
 * Named style definition
 */
export interface NamedStyle {
  name: string;
  style: CellStyle;
  builtIn: boolean;
}

/**
 * StyleManager class for managing cell styles
 */
export class StyleManager {
  private namedStyles: Map<string, NamedStyle> = new Map();
  private numberFormatter: NumberFormatter;
  private listeners: Set<StyleChangeListener> = new Set();

  constructor() {
    this.numberFormatter = createNumberFormatter();
    this.initializeBuiltInStyles();
  }

  /**
   * Initialize built-in named styles
   */
  private initializeBuiltInStyles(): void {
    // Normal style
    this.namedStyles.set('Normal', {
      name: 'Normal',
      style: { ...DEFAULT_CELL_STYLE },
      builtIn: true,
    });

    // Heading styles
    this.namedStyles.set('Heading 1', {
      name: 'Heading 1',
      style: {
        font: {
          family: 'Calibri Light',
          size: 15,
          color: '#44546A',
          bold: true,
        },
        borders: {
          bottom: { style: 'thick', color: '#4472C4' },
        },
      },
      builtIn: true,
    });

    this.namedStyles.set('Heading 2', {
      name: 'Heading 2',
      style: {
        font: {
          family: 'Calibri Light',
          size: 13,
          color: '#44546A',
          bold: true,
        },
        borders: {
          bottom: { style: 'thick', color: '#A5A5A5' },
        },
      },
      builtIn: true,
    });

    this.namedStyles.set('Heading 3', {
      name: 'Heading 3',
      style: {
        font: {
          family: 'Calibri Light',
          size: 11,
          color: '#44546A',
          bold: true,
        },
        borders: {
          bottom: { style: 'medium', color: '#A5A5A5' },
        },
      },
      builtIn: true,
    });

    this.namedStyles.set('Heading 4', {
      name: 'Heading 4',
      style: {
        font: {
          family: 'Calibri Light',
          size: 11,
          color: '#44546A',
          bold: true,
          italic: true,
        },
      },
      builtIn: true,
    });

    // Title style
    this.namedStyles.set('Title', {
      name: 'Title',
      style: {
        font: {
          family: 'Calibri Light',
          size: 18,
          color: '#44546A',
        },
      },
      builtIn: true,
    });

    // Accent styles
    const accentColors = [
      { name: 'Accent1', color: '#4472C4' },
      { name: 'Accent2', color: '#ED7D31' },
      { name: 'Accent3', color: '#A5A5A5' },
      { name: 'Accent4', color: '#FFC000' },
      { name: 'Accent5', color: '#5B9BD5' },
      { name: 'Accent6', color: '#70AD47' },
    ];

    for (const accent of accentColors) {
      this.namedStyles.set(accent.name, {
        name: accent.name,
        style: {
          font: { color: '#FFFFFF' },
          fill: { pattern: 'solid', foregroundColor: accent.color },
        },
        builtIn: true,
      });
    }

    // Good/Bad/Neutral styles
    this.namedStyles.set('Good', {
      name: 'Good',
      style: {
        font: { color: '#006100' },
        fill: { pattern: 'solid', foregroundColor: '#C6EFCE' },
      },
      builtIn: true,
    });

    this.namedStyles.set('Bad', {
      name: 'Bad',
      style: {
        font: { color: '#9C0006' },
        fill: { pattern: 'solid', foregroundColor: '#FFC7CE' },
      },
      builtIn: true,
    });

    this.namedStyles.set('Neutral', {
      name: 'Neutral',
      style: {
        font: { color: '#9C5700' },
        fill: { pattern: 'solid', foregroundColor: '#FFEB9C' },
      },
      builtIn: true,
    });

    // Calculation styles
    this.namedStyles.set('Input', {
      name: 'Input',
      style: {
        font: { color: '#3F3F76' },
        fill: { pattern: 'solid', foregroundColor: '#FFCC99' },
        borders: {
          top: { style: 'thin', color: '#7F7F7F' },
          right: { style: 'thin', color: '#7F7F7F' },
          bottom: { style: 'thin', color: '#7F7F7F' },
          left: { style: 'thin', color: '#7F7F7F' },
        },
      },
      builtIn: true,
    });

    this.namedStyles.set('Output', {
      name: 'Output',
      style: {
        font: { color: '#3F3F3F', bold: true },
        fill: { pattern: 'solid', foregroundColor: '#F2F2F2' },
        borders: {
          top: { style: 'thin', color: '#3F3F3F' },
          right: { style: 'thin', color: '#3F3F3F' },
          bottom: { style: 'thin', color: '#3F3F3F' },
          left: { style: 'thin', color: '#3F3F3F' },
        },
      },
      builtIn: true,
    });

    this.namedStyles.set('Calculation', {
      name: 'Calculation',
      style: {
        font: { color: '#FA7D00', bold: true },
        fill: { pattern: 'solid', foregroundColor: '#F2F2F2' },
        borders: {
          top: { style: 'thin', color: '#7F7F7F' },
          right: { style: 'thin', color: '#7F7F7F' },
          bottom: { style: 'thin', color: '#7F7F7F' },
          left: { style: 'thin', color: '#7F7F7F' },
        },
      },
      builtIn: true,
    });

    // Note and Warning styles
    this.namedStyles.set('Note', {
      name: 'Note',
      style: {
        fill: { pattern: 'solid', foregroundColor: '#FFFFCC' },
        borders: {
          top: { style: 'thin', color: '#B2B2B2' },
          right: { style: 'thin', color: '#B2B2B2' },
          bottom: { style: 'thin', color: '#B2B2B2' },
          left: { style: 'thin', color: '#B2B2B2' },
        },
      },
      builtIn: true,
    });

    this.namedStyles.set('Warning Text', {
      name: 'Warning Text',
      style: {
        font: { color: '#FF0000' },
      },
      builtIn: true,
    });

    // Total styles
    this.namedStyles.set('Total', {
      name: 'Total',
      style: {
        font: { bold: true },
        borders: {
          top: { style: 'thin', color: '#4472C4' },
          bottom: { style: 'double', color: '#4472C4' },
        },
      },
      builtIn: true,
    });

    // Currency styles
    this.namedStyles.set('Currency', {
      name: 'Currency',
      style: {
        numberFormat: {
          category: 'currency',
          formatString: '$#,##0.00',
          currencySymbol: '$',
          decimalPlaces: 2,
        },
      },
      builtIn: true,
    });

    // Percent style
    this.namedStyles.set('Percent', {
      name: 'Percent',
      style: {
        numberFormat: {
          category: 'percentage',
          formatString: '0%',
          decimalPlaces: 0,
        },
      },
      builtIn: true,
    });

    // Comma style
    this.namedStyles.set('Comma', {
      name: 'Comma',
      style: {
        numberFormat: {
          category: 'number',
          formatString: '#,##0.00',
          decimalPlaces: 2,
          useThousandsSeparator: true,
        },
      },
      builtIn: true,
    });

    // Comma [0] style (no decimals)
    this.namedStyles.set('Comma [0]', {
      name: 'Comma [0]',
      style: {
        numberFormat: {
          category: 'number',
          formatString: '#,##0',
          decimalPlaces: 0,
          useThousandsSeparator: true,
        },
      },
      builtIn: true,
    });
  }

  /**
   * Get a named style
   */
  getNamedStyle(name: string): NamedStyle | undefined {
    return this.namedStyles.get(name);
  }

  /**
   * Get all named styles
   */
  getAllNamedStyles(): NamedStyle[] {
    return Array.from(this.namedStyles.values());
  }

  /**
   * Get built-in named styles
   */
  getBuiltInStyles(): NamedStyle[] {
    return Array.from(this.namedStyles.values()).filter((s) => s.builtIn);
  }

  /**
   * Get custom named styles
   */
  getCustomStyles(): NamedStyle[] {
    return Array.from(this.namedStyles.values()).filter((s) => !s.builtIn);
  }

  /**
   * Create a new named style
   */
  createNamedStyle(name: string, style: CellStyle): NamedStyle {
    if (this.namedStyles.has(name)) {
      throw new Error(`Style '${name}' already exists`);
    }

    const namedStyle: NamedStyle = {
      name,
      style,
      builtIn: false,
    };

    this.namedStyles.set(name, namedStyle);
    return namedStyle;
  }

  /**
   * Update a named style (only custom styles can be modified)
   */
  updateNamedStyle(name: string, style: CellStyle): NamedStyle {
    const existing = this.namedStyles.get(name);
    if (!existing) {
      throw new Error(`Style '${name}' does not exist`);
    }
    if (existing.builtIn) {
      throw new Error(`Cannot modify built-in style '${name}'`);
    }

    existing.style = style;
    return existing;
  }

  /**
   * Delete a named style (only custom styles can be deleted)
   */
  deleteNamedStyle(name: string): boolean {
    const existing = this.namedStyles.get(name);
    if (!existing) {
      return false;
    }
    if (existing.builtIn) {
      throw new Error(`Cannot delete built-in style '${name}'`);
    }

    return this.namedStyles.delete(name);
  }

  /**
   * Apply a style to a base style, returning the merged result
   */
  applyStyle(baseStyle: CellStyle | undefined, styleToApply: CellStyle): CellStyle {
    if (!baseStyle) {
      return { ...styleToApply };
    }
    return mergeCellStyles(baseStyle, styleToApply);
  }

  /**
   * Apply a named style to a base style
   */
  applyNamedStyle(baseStyle: CellStyle | undefined, styleName: string): CellStyle {
    const namedStyle = this.namedStyles.get(styleName);
    if (!namedStyle) {
      throw new Error(`Style '${styleName}' does not exist`);
    }
    return this.applyStyle(baseStyle, namedStyle.style);
  }

  /**
   * Clone a style (deep copy)
   */
  cloneStyle(style: CellStyle): CellStyle {
    return JSON.parse(JSON.stringify(style));
  }

  /**
   * Create a style with specific font properties
   */
  createFontStyle(font: Partial<FontStyle>): CellStyle {
    return { font: { ...font } };
  }

  /**
   * Create a style with specific fill
   */
  createFillStyle(fill: string | CellFill): CellStyle {
    return { fill };
  }

  /**
   * Create a solid fill style
   */
  createSolidFill(color: string): CellStyle {
    return {
      fill: {
        pattern: 'solid',
        foregroundColor: color,
      },
    };
  }

  /**
   * Create a pattern fill style
   */
  createPatternFill(
    pattern: FillPattern,
    foregroundColor?: string,
    backgroundColor?: string
  ): CellStyle {
    return {
      fill: {
        pattern,
        foregroundColor,
        backgroundColor,
      },
    };
  }

  /**
   * Create a style with specific borders
   */
  createBorderStyle(borders: CellBorders): CellStyle {
    return { borders };
  }

  /**
   * Create an outside border style
   */
  createOutsideBorder(borderStyle: BorderStyle, color: string): CellStyle {
    const border: Border = { style: borderStyle, color };
    return {
      borders: {
        top: border,
        right: border,
        bottom: border,
        left: border,
      },
    };
  }

  /**
   * Create a style with specific alignment
   */
  createAlignmentStyle(options: {
    horizontal?: HorizontalAlign;
    vertical?: VerticalAlign;
    wrapText?: boolean;
    indent?: number;
    textRotation?: number;
    shrinkToFit?: boolean;
  }): CellStyle {
    return {
      horizontalAlign: options.horizontal,
      verticalAlign: options.vertical,
      wrapText: options.wrapText,
      indent: options.indent,
      textRotation: options.textRotation,
      shrinkToFit: options.shrinkToFit,
    };
  }

  /**
   * Create a style with specific number format
   */
  createNumberFormatStyle(format: NumberFormat | string): CellStyle {
    if (typeof format === 'string') {
      return {
        numberFormat: {
          category: 'custom',
          formatString: format,
        },
      };
    }
    return { numberFormat: format };
  }

  /**
   * Create a style with specific protection
   */
  createProtectionStyle(protection: CellProtection): CellStyle {
    return { protection };
  }

  /**
   * Get the effective style by merging with defaults
   */
  getEffectiveStyle(style: CellStyle | undefined): Required<CellStyle> {
    if (!style) {
      return { ...DEFAULT_CELL_STYLE };
    }

    return {
      font: { ...DEFAULT_FONT_STYLE, ...style.font },
      fill: style.fill ?? DEFAULT_CELL_FILL,
      borders: style.borders ?? {},
      horizontalAlign: style.horizontalAlign ?? DEFAULT_CELL_STYLE.horizontalAlign,
      verticalAlign: style.verticalAlign ?? DEFAULT_CELL_STYLE.verticalAlign,
      wrapText: style.wrapText ?? DEFAULT_CELL_STYLE.wrapText,
      textRotation: style.textRotation ?? DEFAULT_CELL_STYLE.textRotation,
      indent: style.indent ?? DEFAULT_CELL_STYLE.indent,
      shrinkToFit: style.shrinkToFit ?? DEFAULT_CELL_STYLE.shrinkToFit,
      readingOrder: style.readingOrder ?? DEFAULT_CELL_STYLE.readingOrder,
      numberFormat: style.numberFormat ?? DEFAULT_CELL_STYLE.numberFormat,
      protection: { ...DEFAULT_CELL_PROTECTION, ...style.protection },
      quotePrefix: style.quotePrefix ?? DEFAULT_CELL_STYLE.quotePrefix,
    };
  }

  /**
   * Check if two styles are equal
   */
  areStylesEqual(style1: CellStyle | undefined, style2: CellStyle | undefined): boolean {
    if (style1 === style2) return true;
    if (!style1 || !style2) return false;
    return JSON.stringify(style1) === JSON.stringify(style2);
  }

  /**
   * Check if a style is empty (no properties set)
   */
  isStyleEmpty(style: CellStyle | undefined): boolean {
    if (!style) return true;
    return Object.keys(style).length === 0;
  }

  /**
   * Format a value using the style's number format
   */
  formatValue(value: unknown, style: CellStyle | undefined): string {
    const formatString = style?.numberFormat?.formatString ?? 'General';
    return this.numberFormatter.format(value, formatString);
  }

  /**
   * Get the number formatter instance
   */
  getNumberFormatter(): NumberFormatter {
    return this.numberFormatter;
  }

  /**
   * Add a style change listener
   */
  addListener(listener: StyleChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a style change listener
   */
  removeListener(listener: StyleChangeListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify listeners of style change
   */
  private notifyListeners(event: StyleChangeEvent): void {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  /**
   * Clear a specific style property
   */
  clearStyleProperty(
    style: CellStyle,
    property: keyof CellStyle
  ): CellStyle {
    const result = { ...style };
    delete result[property];
    return result;
  }

  /**
   * Extract only the font from a style
   */
  extractFont(style: CellStyle | undefined): FontStyle | undefined {
    return style?.font;
  }

  /**
   * Extract only the fill from a style
   */
  extractFill(style: CellStyle | undefined): string | CellFill | undefined {
    return style?.fill;
  }

  /**
   * Extract only the borders from a style
   */
  extractBorders(style: CellStyle | undefined): CellBorders | undefined {
    return style?.borders;
  }

  /**
   * Extract only the number format from a style
   */
  extractNumberFormat(style: CellStyle | undefined): NumberFormat | undefined {
    return style?.numberFormat;
  }

  /**
   * Create a minimal style diff (only properties that differ)
   */
  getStyleDiff(oldStyle: CellStyle | undefined, newStyle: CellStyle): CellStyle {
    if (!oldStyle) {
      return { ...newStyle };
    }

    const diff: CellStyle = {};

    // Check each property
    if (JSON.stringify(oldStyle.font) !== JSON.stringify(newStyle.font)) {
      diff.font = newStyle.font;
    }
    if (JSON.stringify(oldStyle.fill) !== JSON.stringify(newStyle.fill)) {
      diff.fill = newStyle.fill;
    }
    if (JSON.stringify(oldStyle.borders) !== JSON.stringify(newStyle.borders)) {
      diff.borders = newStyle.borders;
    }
    if (oldStyle.horizontalAlign !== newStyle.horizontalAlign) {
      diff.horizontalAlign = newStyle.horizontalAlign;
    }
    if (oldStyle.verticalAlign !== newStyle.verticalAlign) {
      diff.verticalAlign = newStyle.verticalAlign;
    }
    if (oldStyle.wrapText !== newStyle.wrapText) {
      diff.wrapText = newStyle.wrapText;
    }
    if (oldStyle.textRotation !== newStyle.textRotation) {
      diff.textRotation = newStyle.textRotation;
    }
    if (oldStyle.indent !== newStyle.indent) {
      diff.indent = newStyle.indent;
    }
    if (oldStyle.shrinkToFit !== newStyle.shrinkToFit) {
      diff.shrinkToFit = newStyle.shrinkToFit;
    }
    if (oldStyle.readingOrder !== newStyle.readingOrder) {
      diff.readingOrder = newStyle.readingOrder;
    }
    if (JSON.stringify(oldStyle.numberFormat) !== JSON.stringify(newStyle.numberFormat)) {
      diff.numberFormat = newStyle.numberFormat;
    }
    if (JSON.stringify(oldStyle.protection) !== JSON.stringify(newStyle.protection)) {
      diff.protection = newStyle.protection;
    }
    if (oldStyle.quotePrefix !== newStyle.quotePrefix) {
      diff.quotePrefix = newStyle.quotePrefix;
    }

    return diff;
  }
}

/**
 * Create a StyleManager instance
 */
export function createStyleManager(): StyleManager {
  return new StyleManager();
}

/**
 * Default StyleManager instance
 */
export const defaultStyleManager = new StyleManager();

/**
 * Predefined border styles for convenience
 */
export const BorderStyles = {
  thin: (color: string = '#000000'): Border => ({ style: 'thin', color }),
  medium: (color: string = '#000000'): Border => ({ style: 'medium', color }),
  thick: (color: string = '#000000'): Border => ({ style: 'thick', color }),
  dashed: (color: string = '#000000'): Border => ({ style: 'dashed', color }),
  dotted: (color: string = '#000000'): Border => ({ style: 'dotted', color }),
  double: (color: string = '#000000'): Border => ({ style: 'double', color }),
  none: (): Border => ({ style: 'none', color: '' }),
} as const;

/**
 * Predefined alignment presets
 */
export const AlignmentPresets = {
  topLeft: { horizontal: 'left' as HorizontalAlign, vertical: 'top' as VerticalAlign },
  topCenter: { horizontal: 'center' as HorizontalAlign, vertical: 'top' as VerticalAlign },
  topRight: { horizontal: 'right' as HorizontalAlign, vertical: 'top' as VerticalAlign },
  middleLeft: { horizontal: 'left' as HorizontalAlign, vertical: 'middle' as VerticalAlign },
  middleCenter: { horizontal: 'center' as HorizontalAlign, vertical: 'middle' as VerticalAlign },
  middleRight: { horizontal: 'right' as HorizontalAlign, vertical: 'middle' as VerticalAlign },
  bottomLeft: { horizontal: 'left' as HorizontalAlign, vertical: 'bottom' as VerticalAlign },
  bottomCenter: { horizontal: 'center' as HorizontalAlign, vertical: 'bottom' as VerticalAlign },
  bottomRight: { horizontal: 'right' as HorizontalAlign, vertical: 'bottom' as VerticalAlign },
} as const;

/**
 * Common color values
 */
export const Colors = {
  // Standard colors
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',

  // Theme colors (Office default)
  darkBlue: '#44546A',
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',

  // Conditional formatting colors
  goodGreen: '#C6EFCE',
  goodGreenText: '#006100',
  badRed: '#FFC7CE',
  badRedText: '#9C0006',
  neutralYellow: '#FFEB9C',
  neutralYellowText: '#9C5700',

  // Gray scale
  gray10: '#E6E6E6',
  gray20: '#CCCCCC',
  gray30: '#B3B3B3',
  gray40: '#999999',
  gray50: '#808080',
  gray60: '#666666',
  gray70: '#4D4D4D',
  gray80: '#333333',
  gray90: '#1A1A1A',
} as const;
