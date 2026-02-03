import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CELL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_CELL_FILL,
  DEFAULT_CELL_PROTECTION,
  NUMBER_FORMATS,
  createCellStyle,
  mergeCellStyles,
  cellStyleToCSS,
  bordersToCSS,
  isCellFill,
  getFillBackgroundColor,
} from '../CellStyle';
import type {
  CellStyle,
  FontStyle,
  CellFill,
  FillPattern,
  HorizontalAlign,
  VerticalAlign,
} from '../CellStyle';

describe('CellStyle defaults', () => {
  describe('DEFAULT_FONT_STYLE', () => {
    it('should have expected values', () => {
      expect(DEFAULT_FONT_STYLE.family).toBe('Arial');
      expect(DEFAULT_FONT_STYLE.size).toBe(11);
      expect(DEFAULT_FONT_STYLE.color).toBe('#000000');
      expect(DEFAULT_FONT_STYLE.bold).toBe(false);
      expect(DEFAULT_FONT_STYLE.italic).toBe(false);
      expect(DEFAULT_FONT_STYLE.underline).toBe(false);
      expect(DEFAULT_FONT_STYLE.strikethrough).toBe(false);
      expect(DEFAULT_FONT_STYLE.superscript).toBe(false);
      expect(DEFAULT_FONT_STYLE.subscript).toBe(false);
    });
  });

  describe('DEFAULT_CELL_FILL', () => {
    it('should have none pattern', () => {
      expect(DEFAULT_CELL_FILL.pattern).toBe('none');
      expect(DEFAULT_CELL_FILL.backgroundColor).toBeUndefined();
      expect(DEFAULT_CELL_FILL.foregroundColor).toBeUndefined();
    });
  });

  describe('DEFAULT_CELL_PROTECTION', () => {
    it('should have expected values', () => {
      expect(DEFAULT_CELL_PROTECTION.locked).toBe(true);
      expect(DEFAULT_CELL_PROTECTION.hidden).toBe(false);
    });
  });

  describe('DEFAULT_CELL_STYLE', () => {
    it('should have expected values', () => {
      expect(DEFAULT_CELL_STYLE.font).toEqual(DEFAULT_FONT_STYLE);
      expect(DEFAULT_CELL_STYLE.horizontalAlign).toBe('left');
      expect(DEFAULT_CELL_STYLE.verticalAlign).toBe('bottom');
      expect(DEFAULT_CELL_STYLE.wrapText).toBe(false);
      expect(DEFAULT_CELL_STYLE.textRotation).toBe(0);
      expect(DEFAULT_CELL_STYLE.indent).toBe(0);
      expect(DEFAULT_CELL_STYLE.shrinkToFit).toBe(false);
      expect(DEFAULT_CELL_STYLE.readingOrder).toBe(0);
      expect(DEFAULT_CELL_STYLE.quotePrefix).toBe(false);
    });
  });
});

describe('NUMBER_FORMATS', () => {
  it('should have General format', () => {
    expect(NUMBER_FORMATS.GENERAL.category).toBe('general');
    expect(NUMBER_FORMATS.GENERAL.formatString).toBe('General');
  });

  it('should have number formats', () => {
    expect(NUMBER_FORMATS.NUMBER.formatString).toBe('#,##0.00');
    expect(NUMBER_FORMATS.NUMBER_NO_DECIMAL.formatString).toBe('#,##0');
  });

  it('should have currency formats', () => {
    expect(NUMBER_FORMATS.CURRENCY.formatString).toBe('$#,##0.00');
    expect(NUMBER_FORMATS.CURRENCY.currencySymbol).toBe('$');
  });

  it('should have percentage formats', () => {
    expect(NUMBER_FORMATS.PERCENTAGE.formatString).toBe('0.00%');
    expect(NUMBER_FORMATS.PERCENTAGE_NO_DECIMAL.formatString).toBe('0%');
  });

  it('should have date formats', () => {
    expect(NUMBER_FORMATS.DATE_SHORT.formatString).toBe('m/d/yyyy');
    expect(NUMBER_FORMATS.DATE_LONG.formatString).toBe('mmmm d, yyyy');
  });

  it('should have time format', () => {
    expect(NUMBER_FORMATS.TIME.formatString).toBe('h:mm:ss AM/PM');
  });

  it('should have scientific format', () => {
    expect(NUMBER_FORMATS.SCIENTIFIC.formatString).toBe('0.00E+00');
  });
});

describe('createCellStyle', () => {
  it('should create style with overrides', () => {
    const style = createCellStyle({ font: { bold: true } });
    expect(style.font?.bold).toBe(true);
  });

  it('should create empty style', () => {
    const style = createCellStyle({});
    expect(style).toEqual({});
  });
});

describe('mergeCellStyles', () => {
  it('should merge font properties', () => {
    const base: CellStyle = { font: { size: 12 } };
    const override: CellStyle = { font: { bold: true } };
    const result = mergeCellStyles(base, override);
    expect(result.font?.size).toBe(12);
    expect(result.font?.bold).toBe(true);
  });

  it('should override fill', () => {
    const base: CellStyle = { fill: '#FF0000' };
    const override: CellStyle = { fill: '#00FF00' };
    const result = mergeCellStyles(base, override);
    expect(result.fill).toBe('#00FF00');
  });

  it('should merge CellFill objects', () => {
    const base: CellStyle = {
      fill: { pattern: 'solid', backgroundColor: '#FFFFFF' },
    };
    const override: CellStyle = {
      fill: { pattern: 'solid', foregroundColor: '#FF0000' },
    };
    const result = mergeCellStyles(base, override);
    expect((result.fill as CellFill).backgroundColor).toBe('#FFFFFF');
    expect((result.fill as CellFill).foregroundColor).toBe('#FF0000');
  });

  it('should merge borders', () => {
    const base: CellStyle = {
      borders: { top: { style: 'thin', color: '#000' } },
    };
    const override: CellStyle = {
      borders: { bottom: { style: 'medium', color: '#000' } },
    };
    const result = mergeCellStyles(base, override);
    expect(result.borders?.top).toBeDefined();
    expect(result.borders?.bottom).toBeDefined();
  });

  it('should override alignment', () => {
    const base: CellStyle = { horizontalAlign: 'left' };
    const override: CellStyle = { horizontalAlign: 'center' };
    const result = mergeCellStyles(base, override);
    expect(result.horizontalAlign).toBe('center');
  });

  it('should merge protection', () => {
    const base: CellStyle = { protection: { locked: true } };
    const override: CellStyle = { protection: { hidden: true } };
    const result = mergeCellStyles(base, override);
    expect(result.protection?.locked).toBe(true);
    expect(result.protection?.hidden).toBe(true);
  });

  it('should override shrinkToFit', () => {
    const base: CellStyle = { shrinkToFit: false };
    const override: CellStyle = { shrinkToFit: true };
    const result = mergeCellStyles(base, override);
    expect(result.shrinkToFit).toBe(true);
  });

  it('should override readingOrder', () => {
    const base: CellStyle = { readingOrder: 0 };
    const override: CellStyle = { readingOrder: 1 };
    const result = mergeCellStyles(base, override);
    expect(result.readingOrder).toBe(1);
  });

  it('should override quotePrefix', () => {
    const base: CellStyle = { quotePrefix: false };
    const override: CellStyle = { quotePrefix: true };
    const result = mergeCellStyles(base, override);
    expect(result.quotePrefix).toBe(true);
  });
});

describe('isCellFill', () => {
  it('should identify CellFill objects', () => {
    const fill: CellFill = { pattern: 'solid', foregroundColor: '#FF0000' };
    expect(isCellFill(fill)).toBe(true);
  });

  it('should return false for strings', () => {
    expect(isCellFill('#FF0000')).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isCellFill(undefined)).toBe(false);
  });
});

describe('getFillBackgroundColor', () => {
  it('should return string fill', () => {
    expect(getFillBackgroundColor('#FF0000')).toBe('#FF0000');
  });

  it('should return undefined for transparent', () => {
    expect(getFillBackgroundColor('transparent')).toBeUndefined();
  });

  it('should return foregroundColor for solid fill', () => {
    const fill: CellFill = { pattern: 'solid', foregroundColor: '#FF0000' };
    expect(getFillBackgroundColor(fill)).toBe('#FF0000');
  });

  it('should return backgroundColor for pattern fill', () => {
    const fill: CellFill = {
      pattern: 'lightGray',
      backgroundColor: '#FFFFFF',
      foregroundColor: '#000000',
    };
    expect(getFillBackgroundColor(fill)).toBe('#FFFFFF');
  });

  it('should return undefined for no fill', () => {
    expect(getFillBackgroundColor(undefined)).toBeUndefined();
  });
});

describe('cellStyleToCSS', () => {
  it('should convert font properties', () => {
    const style: CellStyle = {
      font: {
        family: 'Times New Roman',
        size: 14,
        color: '#FF0000',
        bold: true,
        italic: true,
      },
    };
    const css = cellStyleToCSS(style);
    expect(css.fontFamily).toBe('Times New Roman');
    expect(css.fontSize).toBe('14px');
    expect(css.color).toBe('#FF0000');
    expect(css.fontWeight).toBe('bold');
    expect(css.fontStyle).toBe('italic');
  });

  it('should convert text decorations', () => {
    const style: CellStyle = {
      font: { underline: true, strikethrough: true },
    };
    const css = cellStyleToCSS(style);
    expect(css.textDecoration).toContain('underline');
    expect(css.textDecoration).toContain('line-through');
  });

  it('should convert superscript', () => {
    const style: CellStyle = {
      font: { superscript: true, size: 11 },
    };
    const css = cellStyleToCSS(style);
    expect(css.verticalAlign).toBe('super');
  });

  it('should convert subscript', () => {
    const style: CellStyle = {
      font: { subscript: true },
    };
    const css = cellStyleToCSS(style);
    expect(css.verticalAlign).toBe('sub');
  });

  it('should convert shadow', () => {
    const style: CellStyle = {
      font: { shadow: true },
    };
    const css = cellStyleToCSS(style);
    expect(css.textShadow).toBeDefined();
  });

  it('should convert fill', () => {
    const style: CellStyle = { fill: '#FFFF00' };
    const css = cellStyleToCSS(style);
    expect(css.backgroundColor).toBe('#FFFF00');
  });

  it('should convert CellFill', () => {
    const style: CellStyle = {
      fill: { pattern: 'solid', foregroundColor: '#00FF00' },
    };
    const css = cellStyleToCSS(style);
    expect(css.backgroundColor).toBe('#00FF00');
  });

  it('should convert horizontal alignment', () => {
    const alignments: HorizontalAlign[] = ['left', 'center', 'right', 'justify'];
    for (const align of alignments) {
      const css = cellStyleToCSS({ horizontalAlign: align });
      expect(css.textAlign).toBeDefined();
    }
  });

  it('should convert vertical alignment', () => {
    const style: CellStyle = { verticalAlign: 'middle' };
    const css = cellStyleToCSS(style);
    expect(css.verticalAlign).toBe('middle');
  });

  it('should convert wrap text', () => {
    const style: CellStyle = { wrapText: true };
    const css = cellStyleToCSS(style);
    expect(css.whiteSpace).toBe('pre-wrap');
    expect(css.wordWrap).toBe('break-word');
  });

  it('should convert text rotation', () => {
    const style: CellStyle = { textRotation: 45 };
    const css = cellStyleToCSS(style);
    expect(css.transform).toBe('rotate(-45deg)');
  });

  it('should convert vertical text rotation (255)', () => {
    const style: CellStyle = { textRotation: 255 };
    const css = cellStyleToCSS(style);
    expect(css.writingMode).toBe('vertical-rl');
  });

  it('should convert indent', () => {
    const style: CellStyle = { indent: 2 };
    const css = cellStyleToCSS(style);
    expect(css.paddingLeft).toBe('16px');
  });

  it('should convert shrink to fit', () => {
    const style: CellStyle = { shrinkToFit: true };
    const css = cellStyleToCSS(style);
    expect(css.overflow).toBe('hidden');
    expect(css.textOverflow).toBe('ellipsis');
  });

  it('should convert reading order LTR', () => {
    const style: CellStyle = { readingOrder: 1 };
    const css = cellStyleToCSS(style);
    expect(css.direction).toBe('ltr');
  });

  it('should convert reading order RTL', () => {
    const style: CellStyle = { readingOrder: 2 };
    const css = cellStyleToCSS(style);
    expect(css.direction).toBe('rtl');
  });
});

describe('bordersToCSS', () => {
  it('should convert thin border', () => {
    const css = bordersToCSS({
      top: { style: 'thin', color: '#000000' },
    });
    expect(css.borderTop).toBe('1px solid #000000');
  });

  it('should convert medium border', () => {
    const css = bordersToCSS({
      bottom: { style: 'medium', color: '#FF0000' },
    });
    expect(css.borderBottom).toBe('2px solid #FF0000');
  });

  it('should convert thick border', () => {
    const css = bordersToCSS({
      left: { style: 'thick', color: '#0000FF' },
    });
    expect(css.borderLeft).toBe('3px solid #0000FF');
  });

  it('should convert dashed border', () => {
    const css = bordersToCSS({
      right: { style: 'dashed', color: '#000000' },
    });
    expect(css.borderRight).toBe('1px dashed #000000');
  });

  it('should convert dotted border', () => {
    const css = bordersToCSS({
      top: { style: 'dotted', color: '#000000' },
    });
    expect(css.borderTop).toBe('1px dotted #000000');
  });

  it('should convert double border', () => {
    const css = bordersToCSS({
      bottom: { style: 'double', color: '#000000' },
    });
    expect(css.borderBottom).toBe('3px double #000000');
  });

  it('should return empty for no borders', () => {
    expect(bordersToCSS(undefined)).toEqual({});
    expect(bordersToCSS({})).toEqual({});
  });

  it('should skip none borders', () => {
    const css = bordersToCSS({
      top: { style: 'none', color: '#000000' },
    });
    expect(css.borderTop).toBeUndefined();
  });
});

describe('Type definitions', () => {
  it('should accept all HorizontalAlign values', () => {
    const values: HorizontalAlign[] = [
      'left',
      'center',
      'right',
      'justify',
      'fill',
      'centerContinuous',
      'distributed',
    ];
    expect(values).toHaveLength(7);
  });

  it('should accept all VerticalAlign values', () => {
    const values: VerticalAlign[] = [
      'top',
      'middle',
      'bottom',
      'justify',
      'distributed',
    ];
    expect(values).toHaveLength(5);
  });

  it('should accept all FillPattern values', () => {
    const values: FillPattern[] = [
      'none',
      'solid',
      'darkGray',
      'mediumGray',
      'lightGray',
      'gray125',
      'gray0625',
      'darkHorizontal',
      'darkVertical',
      'darkDown',
      'darkUp',
      'darkGrid',
      'darkTrellis',
      'lightHorizontal',
      'lightVertical',
      'lightDown',
      'lightUp',
      'lightGrid',
      'lightTrellis',
    ];
    expect(values).toHaveLength(19);
  });
});
