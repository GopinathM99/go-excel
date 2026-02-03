/**
 * Token types for the formula lexer
 */
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  ERROR = 'ERROR',

  // References
  CELL_REF = 'CELL_REF',
  RANGE_REF = 'RANGE_REF',
  NAMED_RANGE = 'NAMED_RANGE',
  SHEET_REF = 'SHEET_REF',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  POWER = 'POWER',
  PERCENT = 'PERCENT',
  CONCAT = 'CONCAT',

  // Comparison operators
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS_THAN = 'LESS_THAN',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',

  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMA = 'COMMA',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',

  // Special
  FUNCTION = 'FUNCTION',
  WHITESPACE = 'WHITESPACE',
  EOF = 'EOF',
  INVALID = 'INVALID',
}

/**
 * Represents a token in the formula
 */
export interface Token {
  type: TokenType;
  value: string;
  /** Starting position in the formula string */
  start: number;
  /** Ending position in the formula string */
  end: number;
  /** For NUMBER tokens, the parsed numeric value */
  numericValue?: number;
  /** For CELL_REF tokens, parsed reference info */
  reference?: {
    col: string;
    row: string;
    colAbsolute: boolean;
    rowAbsolute: boolean;
    sheetName?: string;
  };
}

/**
 * Creates a token
 */
export function createToken(
  type: TokenType,
  value: string,
  start: number,
  end: number,
  extra?: Partial<Token>
): Token {
  return {
    type,
    value,
    start,
    end,
    ...extra,
  };
}

/**
 * Operator precedence levels (higher = binds tighter)
 */
export const OPERATOR_PRECEDENCE: Partial<Record<TokenType, number>> = {
  [TokenType.COLON]: 1, // Range operator
  [TokenType.CONCAT]: 2,
  [TokenType.EQUALS]: 3,
  [TokenType.NOT_EQUALS]: 3,
  [TokenType.LESS_THAN]: 3,
  [TokenType.LESS_EQUAL]: 3,
  [TokenType.GREATER_THAN]: 3,
  [TokenType.GREATER_EQUAL]: 3,
  [TokenType.PLUS]: 4,
  [TokenType.MINUS]: 4,
  [TokenType.MULTIPLY]: 5,
  [TokenType.DIVIDE]: 5,
  [TokenType.POWER]: 6,
  [TokenType.PERCENT]: 7,
};

/**
 * Check if token type is a binary operator
 */
export function isBinaryOperator(type: TokenType): boolean {
  return (
    type === TokenType.PLUS ||
    type === TokenType.MINUS ||
    type === TokenType.MULTIPLY ||
    type === TokenType.DIVIDE ||
    type === TokenType.POWER ||
    type === TokenType.CONCAT ||
    type === TokenType.EQUALS ||
    type === TokenType.NOT_EQUALS ||
    type === TokenType.LESS_THAN ||
    type === TokenType.LESS_EQUAL ||
    type === TokenType.GREATER_THAN ||
    type === TokenType.GREATER_EQUAL ||
    type === TokenType.COLON
  );
}

/**
 * Check if token type is a comparison operator
 */
export function isComparisonOperator(type: TokenType): boolean {
  return (
    type === TokenType.EQUALS ||
    type === TokenType.NOT_EQUALS ||
    type === TokenType.LESS_THAN ||
    type === TokenType.LESS_EQUAL ||
    type === TokenType.GREATER_THAN ||
    type === TokenType.GREATER_EQUAL
  );
}
