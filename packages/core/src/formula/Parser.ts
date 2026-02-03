import { Token, TokenType, OPERATOR_PRECEDENCE, isBinaryOperator } from './Token';
import {
  ASTNode,
  BinaryOperator,
  numberNode,
  stringNode,
  booleanNode,
  errorNode,
  cellRefNode,
  rangeRefNode,
  namedRangeNode,
  binaryOpNode,
  unaryOpNode,
  functionCallNode,
  arrayNode,
} from './AST';
import { tokenize } from './Lexer';
import { columnLabelToIndex } from '../models/CellAddress';
import { CellErrorCode } from '../models/CellValue';

/**
 * Parse error
 */
export class ParseError extends Error {
  readonly position: number;
  readonly token: Token;

  constructor(message: string, token: Token) {
    super(message);
    this.name = 'ParseError';
    this.position = token.start;
    this.token = token;
  }
}

/**
 * Result of parsing a formula
 */
export type ParseResult =
  | {
      success: true;
      ast: ASTNode;
    }
  | {
      success: false;
      error: ParseError;
    };

/**
 * Parser for Excel formula syntax
 */
export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private currentSheetName?: string;

  /**
   * Parse a formula string into an AST
   */
  parse(formula: string, currentSheetName?: string): ParseResult {
    this.tokens = tokenize(formula);
    this.pos = 0;
    this.currentSheetName = currentSheetName;

    try {
      const ast = this.parseExpression(0);
      this.expect(TokenType.EOF);
      return { success: true, ast };
    } catch (e) {
      if (e instanceof ParseError) {
        return { success: false, error: e };
      }
      throw e;
    }
  }

  /**
   * Parse an expression with operator precedence
   */
  private parseExpression(minPrecedence: number): ASTNode {
    let left = this.parsePrimary();

    while (true) {
      const token = this.peek();
      if (!isBinaryOperator(token.type)) break;

      const precedence = OPERATOR_PRECEDENCE[token.type] ?? 0;
      if (precedence < minPrecedence) break;

      this.advance();
      const operator = this.tokenToOperator(token);
      const right = this.parseExpression(precedence + 1);

      // Special handling for range operator
      if (operator === ':') {
        left = this.createRangeNode(left, right);
      } else {
        left = binaryOpNode(operator, left, right);
      }
    }

    // Handle postfix percent operator
    if (this.peek().type === TokenType.PERCENT) {
      this.advance();
      left = unaryOpNode('%', left);
    }

    return left;
  }

  /**
   * Parse a primary expression (literals, references, function calls, parentheses)
   */
  private parsePrimary(): ASTNode {
    const token = this.peek();

    switch (token.type) {
      case TokenType.NUMBER:
        this.advance();
        return numberNode(token.numericValue!);

      case TokenType.STRING:
        this.advance();
        return stringNode(token.value);

      case TokenType.BOOLEAN:
        this.advance();
        return booleanNode(token.value === 'TRUE');

      case TokenType.ERROR:
        this.advance();
        return errorNode(token.value as CellErrorCode);

      case TokenType.CELL_REF:
        return this.parseCellRef();

      case TokenType.NAMED_RANGE:
        this.advance();
        return namedRangeNode(token.value);

      case TokenType.SHEET_REF:
        return this.parseSheetRef();

      case TokenType.FUNCTION:
        return this.parseFunctionCall();

      case TokenType.LPAREN:
        return this.parseParenthesized();

      case TokenType.LBRACE:
        return this.parseArray();

      case TokenType.PLUS:
      case TokenType.MINUS:
        return this.parseUnary();

      default:
        throw new ParseError(`Unexpected token: ${token.value}`, token);
    }
  }

  /**
   * Parse a cell reference
   */
  private parseCellRef(): ASTNode {
    const token = this.advance();
    const ref = token.reference!;

    return cellRefNode({
      row: parseInt(ref.row, 10) - 1,
      col: columnLabelToIndex(ref.col),
      rowAbsolute: ref.rowAbsolute,
      colAbsolute: ref.colAbsolute,
      sheetName: this.currentSheetName,
    });
  }

  /**
   * Parse a sheet reference (Sheet1!A1 or 'Sheet Name'!A1)
   */
  private parseSheetRef(): ASTNode {
    const sheetToken = this.advance();
    const sheetName = sheetToken.value;

    // Next should be a cell reference
    const nextToken = this.peek();
    if (nextToken.type !== TokenType.CELL_REF) {
      throw new ParseError('Expected cell reference after sheet name', nextToken);
    }

    const cellToken = this.advance();
    const ref = cellToken.reference!;

    return cellRefNode({
      row: parseInt(ref.row, 10) - 1,
      col: columnLabelToIndex(ref.col),
      rowAbsolute: ref.rowAbsolute,
      colAbsolute: ref.colAbsolute,
      sheetName,
    });
  }

  /**
   * Parse a function call
   */
  private parseFunctionCall(): ASTNode {
    const nameToken = this.advance();
    const name = nameToken.value;

    this.expect(TokenType.LPAREN);
    const args = this.parseArgumentList();
    this.expect(TokenType.RPAREN);

    return functionCallNode(name, args);
  }

  /**
   * Parse a function argument list
   */
  private parseArgumentList(): ASTNode[] {
    const args: ASTNode[] = [];

    if (this.peek().type === TokenType.RPAREN) {
      return args; // Empty argument list
    }

    args.push(this.parseExpression(0));

    while (this.peek().type === TokenType.COMMA || this.peek().type === TokenType.SEMICOLON) {
      this.advance();
      args.push(this.parseExpression(0));
    }

    return args;
  }

  /**
   * Parse a parenthesized expression
   */
  private parseParenthesized(): ASTNode {
    this.expect(TokenType.LPAREN);
    const expr = this.parseExpression(0);
    this.expect(TokenType.RPAREN);
    return expr;
  }

  /**
   * Parse an array literal
   */
  private parseArray(): ASTNode {
    this.expect(TokenType.LBRACE);
    const rows: ASTNode[][] = [];
    let currentRow: ASTNode[] = [];

    if (this.peek().type !== TokenType.RBRACE) {
      currentRow.push(this.parseExpression(0));

      while (this.peek().type === TokenType.COMMA || this.peek().type === TokenType.SEMICOLON) {
        const sep = this.advance();
        if (sep.type === TokenType.SEMICOLON) {
          rows.push(currentRow);
          currentRow = [];
        }
        currentRow.push(this.parseExpression(0));
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    this.expect(TokenType.RBRACE);
    return arrayNode(rows);
  }

  /**
   * Parse a unary expression
   */
  private parseUnary(): ASTNode {
    const token = this.advance();
    const operator = token.type === TokenType.PLUS ? '+' : '-';
    const operand = this.parsePrimary();
    return unaryOpNode(operator, operand);
  }

  /**
   * Create a range node from two cell references
   */
  private createRangeNode(left: ASTNode, right: ASTNode): ASTNode {
    if (left.type !== 'cellRef' || right.type !== 'cellRef') {
      throw new ParseError(
        'Range operator requires cell references on both sides',
        this.tokens[this.pos - 1]!
      );
    }

    return rangeRefNode({
      start: left.address,
      end: right.address,
    });
  }

  /**
   * Convert a token to a binary operator
   */
  private tokenToOperator(token: Token): BinaryOperator {
    switch (token.type) {
      case TokenType.PLUS:
        return '+';
      case TokenType.MINUS:
        return '-';
      case TokenType.MULTIPLY:
        return '*';
      case TokenType.DIVIDE:
        return '/';
      case TokenType.POWER:
        return '^';
      case TokenType.CONCAT:
        return '&';
      case TokenType.EQUALS:
        return '=';
      case TokenType.NOT_EQUALS:
        return '<>';
      case TokenType.LESS_THAN:
        return '<';
      case TokenType.LESS_EQUAL:
        return '<=';
      case TokenType.GREATER_THAN:
        return '>';
      case TokenType.GREATER_EQUAL:
        return '>=';
      case TokenType.COLON:
        return ':';
      default:
        throw new ParseError(`Unknown operator: ${token.value}`, token);
    }
  }

  /**
   * Get the current token without advancing
   */
  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  /**
   * Advance to the next token and return the current one
   */
  private advance(): Token {
    const token = this.tokens[this.pos]!;
    this.pos++;
    return token;
  }

  /**
   * Expect a specific token type, throw if not found
   */
  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new ParseError(`Expected ${type}, got ${token.type}`, token);
    }
    return this.advance();
  }
}

/**
 * Parse a formula string into an AST
 */
export function parseFormula(formula: string, currentSheetName?: string): ParseResult {
  const parser = new Parser();
  return parser.parse(formula, currentSheetName);
}
