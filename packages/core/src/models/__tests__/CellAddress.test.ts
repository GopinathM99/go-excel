import { describe, it, expect } from 'vitest';
import {
  columnIndexToLabel,
  columnLabelToIndex,
  parseA1Reference,
  formatA1Reference,
  parseR1C1Reference,
  formatR1C1Reference,
} from '../CellAddress';

describe('CellAddress', () => {
  describe('columnIndexToLabel', () => {
    it('should convert single letter columns', () => {
      expect(columnIndexToLabel(0)).toBe('A');
      expect(columnIndexToLabel(1)).toBe('B');
      expect(columnIndexToLabel(25)).toBe('Z');
    });

    it('should convert double letter columns', () => {
      expect(columnIndexToLabel(26)).toBe('AA');
      expect(columnIndexToLabel(27)).toBe('AB');
      expect(columnIndexToLabel(51)).toBe('AZ');
      expect(columnIndexToLabel(52)).toBe('BA');
    });

    it('should convert triple letter columns', () => {
      expect(columnIndexToLabel(702)).toBe('AAA');
    });
  });

  describe('columnLabelToIndex', () => {
    it('should convert single letter columns', () => {
      expect(columnLabelToIndex('A')).toBe(0);
      expect(columnLabelToIndex('B')).toBe(1);
      expect(columnLabelToIndex('Z')).toBe(25);
    });

    it('should convert double letter columns', () => {
      expect(columnLabelToIndex('AA')).toBe(26);
      expect(columnLabelToIndex('AB')).toBe(27);
      expect(columnLabelToIndex('AZ')).toBe(51);
      expect(columnLabelToIndex('BA')).toBe(52);
    });

    it('should be case insensitive', () => {
      expect(columnLabelToIndex('a')).toBe(0);
      expect(columnLabelToIndex('aa')).toBe(26);
    });
  });

  describe('parseA1Reference', () => {
    it('should parse simple cell references', () => {
      const result = parseA1Reference('A1');
      expect(result).toEqual({
        row: 0,
        col: 0,
        rowAbsolute: false,
        colAbsolute: false,
        sheetName: undefined,
      });
    });

    it('should parse absolute cell references', () => {
      const result = parseA1Reference('$A$1');
      expect(result).toEqual({
        row: 0,
        col: 0,
        rowAbsolute: true,
        colAbsolute: true,
        sheetName: undefined,
      });
    });

    it('should parse mixed absolute references', () => {
      const resultColAbs = parseA1Reference('$A1');
      expect(resultColAbs?.colAbsolute).toBe(true);
      expect(resultColAbs?.rowAbsolute).toBe(false);

      const resultRowAbs = parseA1Reference('A$1');
      expect(resultRowAbs?.colAbsolute).toBe(false);
      expect(resultRowAbs?.rowAbsolute).toBe(true);
    });

    it('should return null for invalid references', () => {
      expect(parseA1Reference('invalid')).toBeNull();
      expect(parseA1Reference('')).toBeNull();
      expect(parseA1Reference('A')).toBeNull();
      expect(parseA1Reference('1')).toBeNull();
    });
  });

  describe('formatA1Reference', () => {
    it('should format simple cell references', () => {
      expect(formatA1Reference({ row: 0, col: 0 })).toBe('A1');
      expect(formatA1Reference({ row: 9, col: 25 })).toBe('Z10');
    });

    it('should format absolute cell references', () => {
      expect(
        formatA1Reference({ row: 0, col: 0, rowAbsolute: true, colAbsolute: true })
      ).toBe('$A$1');
    });
  });

  describe('parseR1C1Reference', () => {
    it('should parse absolute R1C1 references', () => {
      const result = parseR1C1Reference('R1C1');
      expect(result).toEqual({
        row: 0,
        col: 0,
        rowAbsolute: true,
        colAbsolute: true,
        sheetName: undefined,
      });
    });

    it('should parse relative R1C1 references', () => {
      const result = parseR1C1Reference('R[1]C[1]', { row: 5, col: 5 });
      expect(result).toEqual({
        row: 6,
        col: 6,
        rowAbsolute: false,
        colAbsolute: false,
        sheetName: undefined,
      });
    });
  });
});
