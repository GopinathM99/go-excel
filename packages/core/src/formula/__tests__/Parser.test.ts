import { describe, it, expect } from 'vitest';
import { parseFormula } from '../Parser';

describe('Parser', () => {
  describe('parseFormula', () => {
    it('should parse number literals', () => {
      const result = parseFormula('123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('number');
        expect((result.ast as { type: 'number'; value: number }).value).toBe(123);
      }
    });

    it('should parse string literals', () => {
      const result = parseFormula('"hello"');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('string');
        expect((result.ast as { type: 'string'; value: string }).value).toBe('hello');
      }
    });

    it('should parse boolean literals', () => {
      const result = parseFormula('TRUE');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('boolean');
        expect((result.ast as { type: 'boolean'; value: boolean }).value).toBe(true);
      }
    });

    it('should parse cell references', () => {
      const result = parseFormula('A1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('cellRef');
      }
    });

    it('should parse range references', () => {
      const result = parseFormula('A1:B10');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('rangeRef');
      }
    });

    it('should parse binary operations', () => {
      const result = parseFormula('1+2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('binaryOp');
        const node = result.ast as {
          type: 'binaryOp';
          operator: string;
          left: { type: string };
          right: { type: string };
        };
        expect(node.operator).toBe('+');
        expect(node.left.type).toBe('number');
        expect(node.right.type).toBe('number');
      }
    });

    it('should respect operator precedence', () => {
      const result = parseFormula('1+2*3');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should parse as 1 + (2 * 3)
        expect(result.ast.type).toBe('binaryOp');
        const node = result.ast as {
          type: 'binaryOp';
          operator: string;
          right: { type: string; operator: string };
        };
        expect(node.operator).toBe('+');
        expect(node.right.type).toBe('binaryOp');
        expect(node.right.operator).toBe('*');
      }
    });

    it('should parse function calls', () => {
      const result = parseFormula('SUM(A1, B1, C1)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('functionCall');
        const node = result.ast as {
          type: 'functionCall';
          name: string;
          args: unknown[];
        };
        expect(node.name).toBe('SUM');
        expect(node.args.length).toBe(3);
      }
    });

    it('should parse nested function calls', () => {
      const result = parseFormula('IF(A1>0, SUM(B1:B10), 0)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('functionCall');
        const node = result.ast as {
          type: 'functionCall';
          name: string;
          args: { type: string }[];
        };
        expect(node.name).toBe('IF');
        expect(node.args.length).toBe(3);
        expect(node.args[1]?.type).toBe('functionCall');
      }
    });

    it('should parse parenthesized expressions', () => {
      const result = parseFormula('(1+2)*3');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should parse as (1 + 2) * 3
        expect(result.ast.type).toBe('binaryOp');
        const node = result.ast as {
          type: 'binaryOp';
          operator: string;
          left: { type: string; operator: string };
        };
        expect(node.operator).toBe('*');
        expect(node.left.type).toBe('binaryOp');
        expect(node.left.operator).toBe('+');
      }
    });

    it('should parse unary operators', () => {
      const result = parseFormula('-5');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('unaryOp');
        const node = result.ast as {
          type: 'unaryOp';
          operator: string;
        };
        expect(node.operator).toBe('-');
      }
    });

    it('should parse comparison operators', () => {
      const result = parseFormula('A1>10');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('binaryOp');
        const node = result.ast as {
          type: 'binaryOp';
          operator: string;
        };
        expect(node.operator).toBe('>');
      }
    });

    it('should parse string concatenation', () => {
      const result = parseFormula('"hello"&" "&"world"');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.type).toBe('binaryOp');
        const node = result.ast as {
          type: 'binaryOp';
          operator: string;
        };
        expect(node.operator).toBe('&');
      }
    });

    it('should return error for invalid formulas', () => {
      const result = parseFormula('SUM(');
      expect(result.success).toBe(false);
    });
  });
});
