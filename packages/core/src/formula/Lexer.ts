import { Token, TokenType, createToken } from './Token';
import { CellErrorCode } from '../models/CellValue';

/**
 * Lexer for Excel formula syntax
 */
export class Lexer {
  private input: string;
  private pos: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Token[] {
    this.pos = 0;
    this.tokens = [];

    while (this.pos < this.input.length) {
      const token = this.nextToken();
      if (token.type !== TokenType.WHITESPACE) {
        this.tokens.push(token);
      }
    }

    this.tokens.push(createToken(TokenType.EOF, '', this.pos, this.pos));
    return this.tokens;
  }

  /**
   * Get the next token
   */
  private nextToken(): Token {
    const start = this.pos;
    const char = this.input[this.pos]!;

    // Whitespace
    if (/\s/.test(char)) {
      return this.readWhitespace();
    }

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(this.peek(1)))) {
      return this.readNumber();
    }

    // Strings
    if (char === '"') {
      return this.readString();
    }

    // Operators and delimiters
    switch (char) {
      case '+':
        this.pos++;
        return createToken(TokenType.PLUS, '+', start, this.pos);
      case '-':
        this.pos++;
        return createToken(TokenType.MINUS, '-', start, this.pos);
      case '*':
        this.pos++;
        return createToken(TokenType.MULTIPLY, '*', start, this.pos);
      case '/':
        this.pos++;
        return createToken(TokenType.DIVIDE, '/', start, this.pos);
      case '^':
        this.pos++;
        return createToken(TokenType.POWER, '^', start, this.pos);
      case '%':
        this.pos++;
        return createToken(TokenType.PERCENT, '%', start, this.pos);
      case '&':
        this.pos++;
        return createToken(TokenType.CONCAT, '&', start, this.pos);
      case '=':
        this.pos++;
        return createToken(TokenType.EQUALS, '=', start, this.pos);
      case '<':
        if (this.peek(1) === '=') {
          this.pos += 2;
          return createToken(TokenType.LESS_EQUAL, '<=', start, this.pos);
        }
        if (this.peek(1) === '>') {
          this.pos += 2;
          return createToken(TokenType.NOT_EQUALS, '<>', start, this.pos);
        }
        this.pos++;
        return createToken(TokenType.LESS_THAN, '<', start, this.pos);
      case '>':
        if (this.peek(1) === '=') {
          this.pos += 2;
          return createToken(TokenType.GREATER_EQUAL, '>=', start, this.pos);
        }
        this.pos++;
        return createToken(TokenType.GREATER_THAN, '>', start, this.pos);
      case '(':
        this.pos++;
        return createToken(TokenType.LPAREN, '(', start, this.pos);
      case ')':
        this.pos++;
        return createToken(TokenType.RPAREN, ')', start, this.pos);
      case '{':
        this.pos++;
        return createToken(TokenType.LBRACE, '{', start, this.pos);
      case '}':
        this.pos++;
        return createToken(TokenType.RBRACE, '}', start, this.pos);
      case ',':
        this.pos++;
        return createToken(TokenType.COMMA, ',', start, this.pos);
      case ':':
        this.pos++;
        return createToken(TokenType.COLON, ':', start, this.pos);
      case ';':
        this.pos++;
        return createToken(TokenType.SEMICOLON, ';', start, this.pos);
      case '#':
        return this.readError();
      case '\'':
        return this.readSheetReference();
    }

    // Cell references, function names, named ranges
    if (/[A-Za-z_$]/.test(char)) {
      return this.readIdentifier();
    }

    // Invalid character
    this.pos++;
    return createToken(TokenType.INVALID, char, start, this.pos);
  }

  /**
   * Read whitespace
   */
  private readWhitespace(): Token {
    const start = this.pos;
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++;
    }
    return createToken(TokenType.WHITESPACE, this.input.slice(start, this.pos), start, this.pos);
  }

  /**
   * Read a number literal
   */
  private readNumber(): Token {
    const start = this.pos;
    let hasDecimal = false;
    let hasExponent = false;

    // Integer part
    while (this.pos < this.input.length && /\d/.test(this.input[this.pos]!)) {
      this.pos++;
    }

    // Decimal part
    if (this.input[this.pos] === '.' && /\d/.test(this.peek(1))) {
      hasDecimal = true;
      this.pos++; // Skip the decimal point
      while (this.pos < this.input.length && /\d/.test(this.input[this.pos]!)) {
        this.pos++;
      }
    }

    // Exponent part
    if (/[eE]/.test(this.input[this.pos] ?? '')) {
      const nextChar = this.peek(1);
      if (/\d/.test(nextChar) || ((nextChar === '+' || nextChar === '-') && /\d/.test(this.peek(2)))) {
        hasExponent = true;
        this.pos++; // Skip 'e' or 'E'
        if (this.input[this.pos] === '+' || this.input[this.pos] === '-') {
          this.pos++; // Skip sign
        }
        while (this.pos < this.input.length && /\d/.test(this.input[this.pos]!)) {
          this.pos++;
        }
      }
    }

    const value = this.input.slice(start, this.pos);
    return createToken(TokenType.NUMBER, value, start, this.pos, {
      numericValue: parseFloat(value),
    });
  }

  /**
   * Read a string literal
   */
  private readString(): Token {
    const start = this.pos;
    this.pos++; // Skip opening quote

    let value = '';
    while (this.pos < this.input.length) {
      const char = this.input[this.pos]!;
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (this.peek(1) === '"') {
          value += '"';
          this.pos += 2;
        } else {
          this.pos++; // Skip closing quote
          break;
        }
      } else {
        value += char;
        this.pos++;
      }
    }

    return createToken(TokenType.STRING, value, start, this.pos);
  }

  /**
   * Read an error value (#VALUE!, #REF!, etc.)
   */
  private readError(): Token {
    const start = this.pos;
    this.pos++; // Skip #

    while (
      this.pos < this.input.length &&
      /[A-Za-z0-9!?\/]/.test(this.input[this.pos]!)
    ) {
      this.pos++;
    }

    const value = this.input.slice(start, this.pos);

    // Validate error code
    const validErrors: string[] = Object.values(CellErrorCode);
    if (!validErrors.includes(value)) {
      return createToken(TokenType.INVALID, value, start, this.pos);
    }

    return createToken(TokenType.ERROR, value, start, this.pos);
  }

  /**
   * Read a sheet reference (quoted sheet name)
   */
  private readSheetReference(): Token {
    const start = this.pos;
    this.pos++; // Skip opening quote

    let sheetName = '';
    while (this.pos < this.input.length) {
      const char = this.input[this.pos]!;
      if (char === '\'') {
        // Check for escaped quote (double quote)
        if (this.peek(1) === '\'') {
          sheetName += '\'';
          this.pos += 2;
        } else {
          this.pos++; // Skip closing quote
          break;
        }
      } else {
        sheetName += char;
        this.pos++;
      }
    }

    // Expect ! after sheet name
    if (this.input[this.pos] === '!') {
      this.pos++;
    }

    return createToken(TokenType.SHEET_REF, sheetName, start, this.pos);
  }

  /**
   * Read an identifier (cell reference, function name, named range, boolean)
   */
  private readIdentifier(): Token {
    const start = this.pos;
    let hasAbsoluteCol = false;
    let hasAbsoluteRow = false;

    // Check for $ (absolute reference prefix)
    if (this.input[this.pos] === '$') {
      hasAbsoluteCol = true;
      this.pos++;
    }

    // Read column letters or identifier
    const colStart = this.pos;
    while (this.pos < this.input.length && /[A-Za-z_]/.test(this.input[this.pos]!)) {
      this.pos++;
    }
    const letters = this.input.slice(colStart, this.pos);

    // Check if this is followed by a row number (cell reference)
    if (/\d/.test(this.input[this.pos] ?? '') || this.input[this.pos] === '$') {
      // This looks like a cell reference
      if (this.input[this.pos] === '$') {
        hasAbsoluteRow = true;
        this.pos++;
      }

      if (/\d/.test(this.input[this.pos] ?? '')) {
        const rowStart = this.pos;
        while (this.pos < this.input.length && /\d/.test(this.input[this.pos]!)) {
          this.pos++;
        }
        const row = this.input.slice(rowStart, this.pos);

        const value = this.input.slice(start, this.pos);
        return createToken(TokenType.CELL_REF, value, start, this.pos, {
          reference: {
            col: letters.toUpperCase(),
            row,
            colAbsolute: hasAbsoluteCol,
            rowAbsolute: hasAbsoluteRow,
          },
        });
      }
    }

    // Continue reading identifier (could be function name, named range, or boolean)
    while (this.pos < this.input.length && /[A-Za-z0-9_.]/.test(this.input[this.pos]!)) {
      this.pos++;
    }

    const value = this.input.slice(start, this.pos);
    const upperValue = value.toUpperCase();

    // Check for boolean
    if (upperValue === 'TRUE' || upperValue === 'FALSE') {
      return createToken(TokenType.BOOLEAN, upperValue, start, this.pos);
    }

    // Check if followed by ( - then it's a function
    if (this.input[this.pos] === '(') {
      return createToken(TokenType.FUNCTION, upperValue, start, this.pos);
    }

    // Check if followed by ! - then it's a sheet reference
    if (this.input[this.pos] === '!') {
      this.pos++;
      return createToken(TokenType.SHEET_REF, value, start, this.pos);
    }

    // Otherwise it's a named range
    return createToken(TokenType.NAMED_RANGE, value, start, this.pos);
  }

  /**
   * Peek at a character ahead
   */
  private peek(offset: number): string {
    const pos = this.pos + offset;
    return pos < this.input.length ? this.input[pos]! : '';
  }
}

/**
 * Tokenize a formula string
 */
export function tokenize(formula: string): Token[] {
  const lexer = new Lexer(formula);
  return lexer.tokenize();
}
