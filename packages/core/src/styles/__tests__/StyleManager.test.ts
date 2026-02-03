import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StyleManager,
  createStyleManager,
  defaultStyleManager,
  BorderStyles,
  AlignmentPresets,
  Colors,
} from '../StyleManager';
import type { CellStyle, FontStyle, CellBorders } from '../../models/CellStyle';

describe('StyleManager', () => {
  let styleManager: StyleManager;

  beforeEach(() => {
    styleManager = new StyleManager();
  });

  describe('Named styles', () => {
    it('should have built-in styles', () => {
      const styles = styleManager.getBuiltInStyles();
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should get Normal style', () => {
      const normal = styleManager.getNamedStyle('Normal');
      expect(normal).toBeDefined();
      expect(normal?.builtIn).toBe(true);
    });

    it('should get heading styles', () => {
      expect(styleManager.getNamedStyle('Heading 1')).toBeDefined();
      expect(styleManager.getNamedStyle('Heading 2')).toBeDefined();
      expect(styleManager.getNamedStyle('Heading 3')).toBeDefined();
      expect(styleManager.getNamedStyle('Heading 4')).toBeDefined();
    });

    it('should get accent styles', () => {
      expect(styleManager.getNamedStyle('Accent1')).toBeDefined();
      expect(styleManager.getNamedStyle('Accent2')).toBeDefined();
    });

    it('should get Good/Bad/Neutral styles', () => {
      expect(styleManager.getNamedStyle('Good')).toBeDefined();
      expect(styleManager.getNamedStyle('Bad')).toBeDefined();
      expect(styleManager.getNamedStyle('Neutral')).toBeDefined();
    });

    it('should create custom named style', () => {
      const style: CellStyle = {
        font: { bold: true },
        fill: '#FFFF00',
      };

      const namedStyle = styleManager.createNamedStyle('MyStyle', style);
      expect(namedStyle.name).toBe('MyStyle');
      expect(namedStyle.builtIn).toBe(false);
      expect(namedStyle.style).toEqual(style);
    });

    it('should throw when creating duplicate style', () => {
      styleManager.createNamedStyle('MyStyle', {});
      expect(() => styleManager.createNamedStyle('MyStyle', {})).toThrow();
    });

    it('should update custom style', () => {
      styleManager.createNamedStyle('MyStyle', { font: { bold: true } });
      const updated = styleManager.updateNamedStyle('MyStyle', {
        font: { italic: true },
      });
      expect(updated.style.font?.italic).toBe(true);
    });

    it('should not update built-in style', () => {
      expect(() =>
        styleManager.updateNamedStyle('Normal', { font: { bold: true } })
      ).toThrow();
    });

    it('should delete custom style', () => {
      styleManager.createNamedStyle('MyStyle', {});
      expect(styleManager.deleteNamedStyle('MyStyle')).toBe(true);
      expect(styleManager.getNamedStyle('MyStyle')).toBeUndefined();
    });

    it('should not delete built-in style', () => {
      expect(() => styleManager.deleteNamedStyle('Normal')).toThrow();
    });

    it('should get all named styles', () => {
      const all = styleManager.getAllNamedStyles();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should get custom styles', () => {
      styleManager.createNamedStyle('MyStyle', {});
      const custom = styleManager.getCustomStyles();
      expect(custom.some((s) => s.name === 'MyStyle')).toBe(true);
    });
  });

  describe('Style operations', () => {
    it('should apply style to undefined base', () => {
      const result = styleManager.applyStyle(undefined, { font: { bold: true } });
      expect(result.font?.bold).toBe(true);
    });

    it('should merge styles', () => {
      const base: CellStyle = { font: { size: 12 } };
      const override: CellStyle = { font: { bold: true } };
      const result = styleManager.applyStyle(base, override);
      expect(result.font?.size).toBe(12);
      expect(result.font?.bold).toBe(true);
    });

    it('should apply named style', () => {
      const result = styleManager.applyNamedStyle(undefined, 'Heading 1');
      expect(result.font?.bold).toBe(true);
    });

    it('should throw for unknown named style', () => {
      expect(() => styleManager.applyNamedStyle(undefined, 'Unknown')).toThrow();
    });

    it('should clone style', () => {
      const original: CellStyle = {
        font: { bold: true },
        borders: { top: { style: 'thin', color: '#000' } },
      };
      const cloned = styleManager.cloneStyle(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.borders).not.toBe(original.borders);
    });
  });

  describe('Style creation helpers', () => {
    it('should create font style', () => {
      const style = styleManager.createFontStyle({ bold: true, size: 14 });
      expect(style.font?.bold).toBe(true);
      expect(style.font?.size).toBe(14);
    });

    it('should create fill style with string', () => {
      const style = styleManager.createFillStyle('#FF0000');
      expect(style.fill).toBe('#FF0000');
    });

    it('should create fill style with CellFill', () => {
      const style = styleManager.createFillStyle({
        pattern: 'solid',
        foregroundColor: '#FF0000',
      });
      expect(style.fill).toEqual({
        pattern: 'solid',
        foregroundColor: '#FF0000',
      });
    });

    it('should create solid fill', () => {
      const style = styleManager.createSolidFill('#00FF00');
      expect(style.fill).toEqual({
        pattern: 'solid',
        foregroundColor: '#00FF00',
      });
    });

    it('should create pattern fill', () => {
      const style = styleManager.createPatternFill('lightGray', '#000000', '#FFFFFF');
      expect(style.fill).toEqual({
        pattern: 'lightGray',
        foregroundColor: '#000000',
        backgroundColor: '#FFFFFF',
      });
    });

    it('should create border style', () => {
      const borders: CellBorders = {
        top: { style: 'thin', color: '#000000' },
      };
      const style = styleManager.createBorderStyle(borders);
      expect(style.borders).toEqual(borders);
    });

    it('should create outside border', () => {
      const style = styleManager.createOutsideBorder('medium', '#0000FF');
      expect(style.borders?.top).toEqual({ style: 'medium', color: '#0000FF' });
      expect(style.borders?.right).toEqual({ style: 'medium', color: '#0000FF' });
      expect(style.borders?.bottom).toEqual({ style: 'medium', color: '#0000FF' });
      expect(style.borders?.left).toEqual({ style: 'medium', color: '#0000FF' });
    });

    it('should create alignment style', () => {
      const style = styleManager.createAlignmentStyle({
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      });
      expect(style.horizontalAlign).toBe('center');
      expect(style.verticalAlign).toBe('middle');
      expect(style.wrapText).toBe(true);
    });

    it('should create number format style from string', () => {
      const style = styleManager.createNumberFormatStyle('#,##0.00');
      expect(style.numberFormat?.formatString).toBe('#,##0.00');
      expect(style.numberFormat?.category).toBe('custom');
    });

    it('should create number format style from object', () => {
      const style = styleManager.createNumberFormatStyle({
        category: 'currency',
        formatString: '$#,##0.00',
        currencySymbol: '$',
      });
      expect(style.numberFormat?.category).toBe('currency');
    });

    it('should create protection style', () => {
      const style = styleManager.createProtectionStyle({
        locked: false,
        hidden: true,
      });
      expect(style.protection?.locked).toBe(false);
      expect(style.protection?.hidden).toBe(true);
    });
  });

  describe('Effective style', () => {
    it('should return defaults for undefined style', () => {
      const effective = styleManager.getEffectiveStyle(undefined);
      expect(effective.font.family).toBe('Arial');
      expect(effective.font.size).toBe(11);
      expect(effective.horizontalAlign).toBe('left');
    });

    it('should merge with defaults', () => {
      const effective = styleManager.getEffectiveStyle({ font: { bold: true } });
      expect(effective.font.bold).toBe(true);
      expect(effective.font.family).toBe('Arial');
    });
  });

  describe('Style comparison', () => {
    it('should compare equal styles', () => {
      const style1: CellStyle = { font: { bold: true } };
      const style2: CellStyle = { font: { bold: true } };
      expect(styleManager.areStylesEqual(style1, style2)).toBe(true);
    });

    it('should compare different styles', () => {
      const style1: CellStyle = { font: { bold: true } };
      const style2: CellStyle = { font: { italic: true } };
      expect(styleManager.areStylesEqual(style1, style2)).toBe(false);
    });

    it('should handle undefined styles', () => {
      expect(styleManager.areStylesEqual(undefined, undefined)).toBe(true);
      expect(styleManager.areStylesEqual({ font: {} }, undefined)).toBe(false);
    });

    it('should check if style is empty', () => {
      expect(styleManager.isStyleEmpty(undefined)).toBe(true);
      expect(styleManager.isStyleEmpty({})).toBe(true);
      expect(styleManager.isStyleEmpty({ font: {} })).toBe(false);
    });
  });

  describe('Style diff', () => {
    it('should get diff between styles', () => {
      const oldStyle: CellStyle = { font: { bold: true }, fill: '#FF0000' };
      const newStyle: CellStyle = { font: { bold: true }, fill: '#00FF00' };
      const diff = styleManager.getStyleDiff(oldStyle, newStyle);
      expect(diff.fill).toBe('#00FF00');
      expect(diff.font).toBeUndefined();
    });

    it('should handle undefined old style', () => {
      const newStyle: CellStyle = { font: { bold: true } };
      const diff = styleManager.getStyleDiff(undefined, newStyle);
      expect(diff).toEqual(newStyle);
    });
  });

  describe('Style property extraction', () => {
    it('should extract font', () => {
      const style: CellStyle = { font: { bold: true }, fill: '#FF0000' };
      expect(styleManager.extractFont(style)).toEqual({ bold: true });
    });

    it('should extract fill', () => {
      const style: CellStyle = { fill: '#FF0000' };
      expect(styleManager.extractFill(style)).toBe('#FF0000');
    });

    it('should extract borders', () => {
      const borders: CellBorders = { top: { style: 'thin', color: '#000' } };
      const style: CellStyle = { borders };
      expect(styleManager.extractBorders(style)).toEqual(borders);
    });

    it('should extract number format', () => {
      const style: CellStyle = {
        numberFormat: { category: 'number', formatString: '0.00' },
      };
      expect(styleManager.extractNumberFormat(style)).toEqual({
        category: 'number',
        formatString: '0.00',
      });
    });
  });

  describe('Clear style property', () => {
    it('should clear a property', () => {
      const style: CellStyle = { font: { bold: true }, fill: '#FF0000' };
      const result = styleManager.clearStyleProperty(style, 'fill');
      expect(result.font).toEqual({ bold: true });
      expect(result.fill).toBeUndefined();
    });
  });

  describe('Format value', () => {
    it('should format with style number format', () => {
      const style: CellStyle = {
        numberFormat: { category: 'currency', formatString: '$#,##0.00' },
      };
      expect(styleManager.formatValue(1234.56, style)).toBe('$1,234.56');
    });

    it('should format with General for no style', () => {
      expect(styleManager.formatValue(1234.56, undefined)).toBe('1234.56');
    });
  });

  describe('Number formatter', () => {
    it('should get formatter instance', () => {
      const formatter = styleManager.getNumberFormatter();
      expect(formatter).toBeDefined();
      expect(formatter.format(1234, '#,##0')).toBe('1,234');
    });
  });

  describe('Listeners', () => {
    it('should add and remove listeners', () => {
      const listener = vi.fn();
      styleManager.addListener(listener);
      styleManager.removeListener(listener);
      // Verify no errors
    });
  });
});

describe('BorderStyles', () => {
  it('should create thin border', () => {
    expect(BorderStyles.thin('#FF0000')).toEqual({ style: 'thin', color: '#FF0000' });
  });

  it('should use default color', () => {
    expect(BorderStyles.thin()).toEqual({ style: 'thin', color: '#000000' });
  });

  it('should create all border types', () => {
    expect(BorderStyles.medium().style).toBe('medium');
    expect(BorderStyles.thick().style).toBe('thick');
    expect(BorderStyles.dashed().style).toBe('dashed');
    expect(BorderStyles.dotted().style).toBe('dotted');
    expect(BorderStyles.double().style).toBe('double');
    expect(BorderStyles.none().style).toBe('none');
  });
});

describe('AlignmentPresets', () => {
  it('should have all combinations', () => {
    expect(AlignmentPresets.topLeft).toEqual({ horizontal: 'left', vertical: 'top' });
    expect(AlignmentPresets.topCenter).toEqual({ horizontal: 'center', vertical: 'top' });
    expect(AlignmentPresets.topRight).toEqual({ horizontal: 'right', vertical: 'top' });
    expect(AlignmentPresets.middleLeft).toEqual({ horizontal: 'left', vertical: 'middle' });
    expect(AlignmentPresets.middleCenter).toEqual({ horizontal: 'center', vertical: 'middle' });
    expect(AlignmentPresets.middleRight).toEqual({ horizontal: 'right', vertical: 'middle' });
    expect(AlignmentPresets.bottomLeft).toEqual({ horizontal: 'left', vertical: 'bottom' });
    expect(AlignmentPresets.bottomCenter).toEqual({ horizontal: 'center', vertical: 'bottom' });
    expect(AlignmentPresets.bottomRight).toEqual({ horizontal: 'right', vertical: 'bottom' });
  });
});

describe('Colors', () => {
  it('should have standard colors', () => {
    expect(Colors.black).toBe('#000000');
    expect(Colors.white).toBe('#FFFFFF');
    expect(Colors.red).toBe('#FF0000');
    expect(Colors.green).toBe('#00FF00');
    expect(Colors.blue).toBe('#0000FF');
  });

  it('should have theme colors', () => {
    expect(Colors.accent1).toBeDefined();
    expect(Colors.darkBlue).toBeDefined();
  });

  it('should have conditional formatting colors', () => {
    expect(Colors.goodGreen).toBeDefined();
    expect(Colors.badRed).toBeDefined();
    expect(Colors.neutralYellow).toBeDefined();
  });

  it('should have gray scale', () => {
    expect(Colors.gray50).toBe('#808080');
  });
});

describe('Factory functions', () => {
  it('createStyleManager should create instance', () => {
    const manager = createStyleManager();
    expect(manager).toBeInstanceOf(StyleManager);
  });

  it('defaultStyleManager should be available', () => {
    expect(defaultStyleManager).toBeInstanceOf(StyleManager);
  });
});
