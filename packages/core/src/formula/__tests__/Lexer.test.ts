import { describe, it, expect } from 'vitest';
import { tokenize } from '../Lexer';
import { TokenType } from '../Token';

describe('Lexer', () => {
  describe('tokenize', () => {
    it('should tokenize numbers', () => {
      const tokens = tokenize('123');
      expect(tokens[0]?.type).toBe(TokenType.NUMBER);
      expect(tokens[0]?.numericValue).toBe(123);
    });

    it('should tokenize decimal numbers', () => {
      const tokens = tokenize('123.456');
      expect(tokens[0]?.type).toBe(TokenType.NUMBER);
      expect(tokens[0]?.numericValue).toBe(123.456);
    });

    it('should tokenize scientific notation', () => {
      const tokens = tokenize('1.5e10');
      expect(tokens[0]?.type).toBe(TokenType.NUMBER);
      expect(tokens[0]?.numericValue).toBe(1.5e10);
    });

    it('should tokenize strings', () => {
      const tokens = tokenize('"hello world"');
      expect(tokens[0]?.type).toBe(TokenType.STRING);
      expect(tokens[0]?.value).toBe('hello world');
    });

    it('should tokenize strings with escaped quotes', () => {
      const tokens = tokenize('"say ""hello"""');
      expect(tokens[0]?.type).toBe(TokenType.STRING);
      expect(tokens[0]?.value).toBe('say "hello"');
    });

    it('should tokenize booleans', () => {
      const tokens = tokenize('TRUE');
      expect(tokens[0]?.type).toBe(TokenType.BOOLEAN);
      expect(tokens[0]?.value).toBe('TRUE');

      const tokens2 = tokenize('FALSE');
      expect(tokens2[0]?.type).toBe(TokenType.BOOLEAN);
    });

    it('should tokenize cell references', () => {
      const tokens = tokenize('A1');
      expect(tokens[0]?.type).toBe(TokenType.CELL_REF);
      expect(tokens[0]?.reference?.col).toBe('A');
      expect(tokens[0]?.reference?.row).toBe('1');
    });

    it('should tokenize absolute cell references', () => {
      const tokens = tokenize('$A$1');
      expect(tokens[0]?.type).toBe(TokenType.CELL_REF);
      expect(tokens[0]?.reference?.colAbsolute).toBe(true);
      expect(tokens[0]?.reference?.rowAbsolute).toBe(true);
    });

    it('should tokenize function names', () => {
      const tokens = tokenize('SUM(');
      expect(tokens[0]?.type).toBe(TokenType.FUNCTION);
      expect(tokens[0]?.value).toBe('SUM');
    });

    it('should tokenize operators', () => {
      const tokens = tokenize('+ - * / ^ & = <> < <= > >=');
      const expectedTypes = [
        TokenType.PLUS,
        TokenType.MINUS,
        TokenType.MULTIPLY,
        TokenType.DIVIDE,
        TokenType.POWER,
        TokenType.CONCAT,
        TokenType.EQUALS,
        TokenType.NOT_EQUALS,
        TokenType.LESS_THAN,
        TokenType.LESS_EQUAL,
        TokenType.GREATER_THAN,
        TokenType.GREATER_EQUAL,
      ];

      for (let i = 0; i < expectedTypes.length; i++) {
        expect(tokens[i]?.type).toBe(expectedTypes[i]);
      }
    });

    it('should tokenize complex formulas', () => {
      const tokens = tokenize('SUM(A1:B10, 100) + IF(C1>0, "yes", "no")');

      expect(tokens[0]?.type).toBe(TokenType.FUNCTION);
      expect(tokens[0]?.value).toBe('SUM');

      expect(tokens[1]?.type).toBe(TokenType.LPAREN);

      expect(tokens[2]?.type).toBe(TokenType.CELL_REF);
      expect(tokens[2]?.reference?.col).toBe('A');

      expect(tokens[3]?.type).toBe(TokenType.COLON);

      expect(tokens[4]?.type).toBe(TokenType.CELL_REF);
      expect(tokens[4]?.reference?.col).toBe('B');
    });

    it('should tokenize error values', () => {
      const tokens = tokenize('#VALUE!');
      expect(tokens[0]?.type).toBe(TokenType.ERROR);
      expect(tokens[0]?.value).toBe('#VALUE!');
    });
  });
});
