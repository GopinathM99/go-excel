/**
 * Text alignment options
 */
export type HorizontalAlign = 'left' | 'center' | 'right' | 'justify' | 'fill' | 'centerContinuous' | 'distributed';
export type VerticalAlign = 'top' | 'middle' | 'bottom' | 'justify' | 'distributed';

/**
 * Border style options
 */
export type BorderStyle =
  | 'none'
  | 'thin'
  | 'medium'
  | 'thick'
  | 'dotted'
  | 'dashed'
  | 'double';

/**
 * Border definition for a single side
 */
export interface Border {
  style: BorderStyle;
  color: string;
}

/**
 * All four borders of a cell
 */
export interface CellBorders {
  top?: Border;
  right?: Border;
  bottom?: Border;
  left?: Border;
}

/**
 * Fill pattern types
 */
export type FillPattern =
  | 'none'
  | 'solid'
  | 'darkGray'
  | 'mediumGray'
  | 'lightGray'
  | 'gray125'
  | 'gray0625'
  | 'darkHorizontal'
  | 'darkVertical'
  | 'darkDown'
  | 'darkUp'
  | 'darkGrid'
  | 'darkTrellis'
  | 'lightHorizontal'
  | 'lightVertical'
  | 'lightDown'
  | 'lightUp'
  | 'lightGrid'
  | 'lightTrellis';

/**
 * Fill definition with pattern support
 */
export interface CellFill {
  /** Pattern type */
  pattern: FillPattern;
  /** Background color (base color) */
  backgroundColor?: string;
  /** Foreground/pattern color */
  foregroundColor?: string;
}

/**
 * Underline style options
 */
export type UnderlineStyle = 'none' | 'single' | 'double' | 'singleAccounting' | 'doubleAccounting';

/**
 * Font styling options
 */
export interface FontStyle {
  /** Font family name */
  family?: string;
  /** Font size in points */
  size?: number;
  /** Font color (hex or named) */
  color?: string;
  /** Bold weight */
  bold?: boolean;
  /** Italic style */
  italic?: boolean;
  /** Underline style */
  underline?: boolean | UnderlineStyle;
  /** Strikethrough */
  strikethrough?: boolean;
  /** Superscript */
  superscript?: boolean;
  /** Subscript */
  subscript?: boolean;
  /** Font outline (Mac only) */
  outline?: boolean;
  /** Font shadow */
  shadow?: boolean;
}

/**
 * Number format categories
 */
export type NumberFormatCategory =
  | 'general'
  | 'number'
  | 'currency'
  | 'accounting'
  | 'date'
  | 'time'
  | 'percentage'
  | 'fraction'
  | 'scientific'
  | 'text'
  | 'custom';

/**
 * Number format definition
 */
export interface NumberFormat {
  category: NumberFormatCategory;
  formatString: string;
  /** Number of decimal places (for number/currency/percentage) */
  decimalPlaces?: number;
  /** Use thousands separator */
  useThousandsSeparator?: boolean;
  /** Currency symbol */
  currencySymbol?: string;
  /** Negative number format */
  negativeFormat?: 'minus' | 'parentheses' | 'red' | 'redParentheses';
}

/**
 * Protection options for a cell
 */
export interface CellProtection {
  /** Whether cell is locked (default true) */
  locked?: boolean;
  /** Whether formula is hidden when sheet is protected */
  hidden?: boolean;
}

/**
 * Complete cell style definition
 */
export interface CellStyle {
  /** Font styling */
  font?: FontStyle;

  /** Background fill - can be simple color string or pattern fill */
  fill?: string | CellFill;

  /** Cell borders */
  borders?: CellBorders;

  /** Horizontal text alignment */
  horizontalAlign?: HorizontalAlign;

  /** Vertical text alignment */
  verticalAlign?: VerticalAlign;

  /** Text wrapping */
  wrapText?: boolean;

  /** Text rotation angle (-90 to 90 degrees, or 255 for vertical text) */
  textRotation?: number;

  /** Text indent level (0-250) */
  indent?: number;

  /** Shrink text to fit cell */
  shrinkToFit?: boolean;

  /** Reading order: 0=context, 1=LTR, 2=RTL */
  readingOrder?: 0 | 1 | 2;

  /** Number format */
  numberFormat?: NumberFormat;

  /** Cell protection */
  protection?: CellProtection;

  /** Quote prefix (forces text display) */
  quotePrefix?: boolean;
}

/**
 * Default font style
 */
export const DEFAULT_FONT_STYLE: Required<FontStyle> = {
  family: 'Arial',
  size: 11,
  color: '#000000',
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  superscript: false,
  subscript: false,
  outline: false,
  shadow: false,
};

/**
 * Default cell fill
 */
export const DEFAULT_CELL_FILL: CellFill = {
  pattern: 'none',
  backgroundColor: undefined,
  foregroundColor: undefined,
};

/**
 * Default cell protection
 */
export const DEFAULT_CELL_PROTECTION: Required<CellProtection> = {
  locked: true,
  hidden: false,
};

/**
 * Default cell style values
 */
export const DEFAULT_CELL_STYLE: Required<CellStyle> = {
  font: DEFAULT_FONT_STYLE,
  fill: DEFAULT_CELL_FILL,
  borders: {},
  horizontalAlign: 'left',
  verticalAlign: 'bottom',
  wrapText: false,
  textRotation: 0,
  indent: 0,
  shrinkToFit: false,
  readingOrder: 0,
  numberFormat: {
    category: 'general',
    formatString: 'General',
  },
  protection: DEFAULT_CELL_PROTECTION,
  quotePrefix: false,
};

/**
 * Predefined number formats
 */
export const NUMBER_FORMATS = {
  GENERAL: { category: 'general', formatString: 'General' },
  NUMBER: { category: 'number', formatString: '#,##0.00', decimalPlaces: 2, useThousandsSeparator: true },
  NUMBER_NO_DECIMAL: { category: 'number', formatString: '#,##0', decimalPlaces: 0, useThousandsSeparator: true },
  CURRENCY: { category: 'currency', formatString: '$#,##0.00', decimalPlaces: 2, currencySymbol: '$' },
  ACCOUNTING: { category: 'accounting', formatString: '_($* #,##0.00_)', decimalPlaces: 2, currencySymbol: '$' },
  PERCENTAGE: { category: 'percentage', formatString: '0.00%', decimalPlaces: 2 },
  PERCENTAGE_NO_DECIMAL: { category: 'percentage', formatString: '0%', decimalPlaces: 0 },
  DATE_SHORT: { category: 'date', formatString: 'm/d/yyyy' },
  DATE_LONG: { category: 'date', formatString: 'mmmm d, yyyy' },
  TIME: { category: 'time', formatString: 'h:mm:ss AM/PM' },
  DATETIME: { category: 'date', formatString: 'm/d/yyyy h:mm' },
  SCIENTIFIC: { category: 'scientific', formatString: '0.00E+00' },
  FRACTION: { category: 'fraction', formatString: '# ?/?' },
  TEXT: { category: 'text', formatString: '@' },
} as const satisfies Record<string, NumberFormat>;

/**
 * Creates a partial cell style with only the specified properties
 */
export function createCellStyle(overrides: Partial<CellStyle>): CellStyle {
  return { ...overrides };
}

/**
 * Type guard to check if fill is a CellFill object
 */
export function isCellFill(fill: string | CellFill | undefined): fill is CellFill {
  return typeof fill === 'object' && fill !== null && 'pattern' in fill;
}

/**
 * Merges two cell styles, with the second taking precedence
 */
export function mergeCellStyles(base: CellStyle, override: CellStyle): CellStyle {
  const result: CellStyle = { ...base };

  if (override.font) {
    result.font = { ...base.font, ...override.font };
  }
  if (override.fill !== undefined) {
    // Handle fill merge - if both are CellFill objects, merge them
    if (isCellFill(override.fill) && isCellFill(base.fill)) {
      result.fill = { ...base.fill, ...override.fill };
    } else {
      result.fill = override.fill;
    }
  }
  if (override.borders) {
    result.borders = { ...base.borders, ...override.borders };
  }
  if (override.horizontalAlign !== undefined) {
    result.horizontalAlign = override.horizontalAlign;
  }
  if (override.verticalAlign !== undefined) {
    result.verticalAlign = override.verticalAlign;
  }
  if (override.wrapText !== undefined) {
    result.wrapText = override.wrapText;
  }
  if (override.textRotation !== undefined) {
    result.textRotation = override.textRotation;
  }
  if (override.indent !== undefined) {
    result.indent = override.indent;
  }
  if (override.shrinkToFit !== undefined) {
    result.shrinkToFit = override.shrinkToFit;
  }
  if (override.readingOrder !== undefined) {
    result.readingOrder = override.readingOrder;
  }
  if (override.numberFormat) {
    result.numberFormat = { ...base.numberFormat, ...override.numberFormat };
  }
  if (override.protection) {
    result.protection = { ...base.protection, ...override.protection };
  }
  if (override.quotePrefix !== undefined) {
    result.quotePrefix = override.quotePrefix;
  }

  return result;
}

/**
 * Gets the background color from a fill value
 */
export function getFillBackgroundColor(fill: string | CellFill | undefined): string | undefined {
  if (!fill) return undefined;
  if (typeof fill === 'string') {
    return fill === 'transparent' ? undefined : fill;
  }
  // For pattern fills, return foregroundColor for solid, backgroundColor otherwise
  if (fill.pattern === 'solid') {
    return fill.foregroundColor || fill.backgroundColor;
  }
  return fill.backgroundColor;
}

/**
 * Converts a CellStyle to CSS properties for rendering
 */
export function cellStyleToCSS(style: CellStyle): Record<string, string | number | undefined> {
  const css: Record<string, string | number | undefined> = {};

  if (style.font) {
    if (style.font.family) css.fontFamily = style.font.family;
    if (style.font.size) css.fontSize = `${style.font.size}px`;
    if (style.font.color) css.color = style.font.color;
    if (style.font.bold) css.fontWeight = 'bold';
    if (style.font.italic) css.fontStyle = 'italic';

    const decorations: string[] = [];
    if (style.font.underline) decorations.push('underline');
    if (style.font.strikethrough) decorations.push('line-through');
    if (decorations.length > 0) {
      css.textDecoration = decorations.join(' ');
    }

    // Vertical align for super/subscript
    if (style.font.superscript) {
      css.verticalAlign = 'super';
      css.fontSize = style.font.size ? `${style.font.size * 0.8}px` : '0.8em';
    } else if (style.font.subscript) {
      css.verticalAlign = 'sub';
      css.fontSize = style.font.size ? `${style.font.size * 0.8}px` : '0.8em';
    }

    // Text shadow for shadow property
    if (style.font.shadow) {
      css.textShadow = '1px 1px 2px rgba(0,0,0,0.3)';
    }
  }

  // Handle fill (string or CellFill)
  const bgColor = getFillBackgroundColor(style.fill);
  if (bgColor) {
    css.backgroundColor = bgColor;
  }

  if (style.horizontalAlign) {
    // Map Excel alignments to CSS
    const alignMap: Record<HorizontalAlign, string> = {
      left: 'left',
      center: 'center',
      right: 'right',
      justify: 'justify',
      fill: 'left', // 'fill' repeats content - not directly supported in CSS
      centerContinuous: 'center',
      distributed: 'justify',
    };
    css.textAlign = alignMap[style.horizontalAlign];
  }

  if (style.verticalAlign && !style.font?.superscript && !style.font?.subscript) {
    const vAlignMap: Record<VerticalAlign, string> = {
      top: 'top',
      middle: 'middle',
      bottom: 'bottom',
      justify: 'middle',
      distributed: 'middle',
    };
    css.verticalAlign = vAlignMap[style.verticalAlign];
  }

  if (style.wrapText) {
    css.whiteSpace = 'pre-wrap';
    css.wordWrap = 'break-word';
  }

  if (style.textRotation) {
    if (style.textRotation === 255) {
      // Vertical text
      css.writingMode = 'vertical-rl';
    } else {
      css.transform = `rotate(${-style.textRotation}deg)`;
    }
  }

  if (style.indent) {
    css.paddingLeft = `${style.indent * 8}px`;
  }

  if (style.shrinkToFit) {
    css.overflow = 'hidden';
    css.textOverflow = 'ellipsis';
  }

  if (style.readingOrder === 1) {
    css.direction = 'ltr';
  } else if (style.readingOrder === 2) {
    css.direction = 'rtl';
  }

  return css;
}

/**
 * Creates CSS for borders (returns an object to handle all four sides)
 */
export function bordersToCSS(borders: CellBorders | undefined): Record<string, string | number | undefined> {
  if (!borders) return {};

  const css: Record<string, string | number | undefined> = {};

  const borderToString = (border: Border | undefined): string | undefined => {
    if (!border || border.style === 'none') return undefined;

    const widthMap: Record<BorderStyle, string> = {
      none: '0',
      thin: '1px',
      medium: '2px',
      thick: '3px',
      dotted: '1px',
      dashed: '1px',
      double: '3px',
    };

    const styleMap: Record<BorderStyle, string> = {
      none: 'none',
      thin: 'solid',
      medium: 'solid',
      thick: 'solid',
      dotted: 'dotted',
      dashed: 'dashed',
      double: 'double',
    };

    return `${widthMap[border.style]} ${styleMap[border.style]} ${border.color}`;
  };

  if (borders.top) css.borderTop = borderToString(borders.top);
  if (borders.right) css.borderRight = borderToString(borders.right);
  if (borders.bottom) css.borderBottom = borderToString(borders.bottom);
  if (borders.left) css.borderLeft = borderToString(borders.left);

  return css;
}
