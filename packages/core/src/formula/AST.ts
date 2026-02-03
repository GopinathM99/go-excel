import type { CellAddress } from '../models/CellAddress';
import type { CellRange } from '../models/CellRange';
import type { CellErrorCode } from '../models/CellValue';

/**
 * AST node types
 */
export type ASTNode =
  | NumberNode
  | StringNode
  | BooleanNode
  | ErrorNode
  | CellRefNode
  | RangeRefNode
  | NamedRangeNode
  | BinaryOpNode
  | UnaryOpNode
  | FunctionCallNode
  | ArrayNode;

/**
 * Number literal
 */
export interface NumberNode {
  type: 'number';
  value: number;
}

/**
 * String literal
 */
export interface StringNode {
  type: 'string';
  value: string;
}

/**
 * Boolean literal
 */
export interface BooleanNode {
  type: 'boolean';
  value: boolean;
}

/**
 * Error value
 */
export interface ErrorNode {
  type: 'error';
  code: CellErrorCode;
}

/**
 * Cell reference (e.g., A1, $A$1)
 */
export interface CellRefNode {
  type: 'cellRef';
  address: CellAddress;
}

/**
 * Range reference (e.g., A1:B10)
 */
export interface RangeRefNode {
  type: 'rangeRef';
  range: CellRange;
}

/**
 * Named range reference
 */
export interface NamedRangeNode {
  type: 'namedRange';
  name: string;
}

/**
 * Binary operation
 */
export interface BinaryOpNode {
  type: 'binaryOp';
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '&'
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | ':';

/**
 * Unary operation
 */
export interface UnaryOpNode {
  type: 'unaryOp';
  operator: UnaryOperator;
  operand: ASTNode;
}

export type UnaryOperator = '+' | '-' | '%';

/**
 * Function call
 */
export interface FunctionCallNode {
  type: 'functionCall';
  name: string;
  args: ASTNode[];
}

/**
 * Array literal (e.g., {1,2,3;4,5,6})
 */
export interface ArrayNode {
  type: 'array';
  rows: ASTNode[][];
}

/**
 * Create a number node
 */
export function numberNode(value: number): NumberNode {
  return { type: 'number', value };
}

/**
 * Create a string node
 */
export function stringNode(value: string): StringNode {
  return { type: 'string', value };
}

/**
 * Create a boolean node
 */
export function booleanNode(value: boolean): BooleanNode {
  return { type: 'boolean', value };
}

/**
 * Create an error node
 */
export function errorNode(code: CellErrorCode): ErrorNode {
  return { type: 'error', code };
}

/**
 * Create a cell reference node
 */
export function cellRefNode(address: CellAddress): CellRefNode {
  return { type: 'cellRef', address };
}

/**
 * Create a range reference node
 */
export function rangeRefNode(range: CellRange): RangeRefNode {
  return { type: 'rangeRef', range };
}

/**
 * Create a named range node
 */
export function namedRangeNode(name: string): NamedRangeNode {
  return { type: 'namedRange', name };
}

/**
 * Create a binary operation node
 */
export function binaryOpNode(
  operator: BinaryOperator,
  left: ASTNode,
  right: ASTNode
): BinaryOpNode {
  return { type: 'binaryOp', operator, left, right };
}

/**
 * Create a unary operation node
 */
export function unaryOpNode(operator: UnaryOperator, operand: ASTNode): UnaryOpNode {
  return { type: 'unaryOp', operator, operand };
}

/**
 * Create a function call node
 */
export function functionCallNode(name: string, args: ASTNode[]): FunctionCallNode {
  return { type: 'functionCall', name, args };
}

/**
 * Create an array node
 */
export function arrayNode(rows: ASTNode[][]): ArrayNode {
  return { type: 'array', rows };
}

/**
 * Visit all nodes in an AST
 */
export function visitAST(
  node: ASTNode,
  visitor: (node: ASTNode) => void
): void {
  visitor(node);

  switch (node.type) {
    case 'binaryOp':
      visitAST(node.left, visitor);
      visitAST(node.right, visitor);
      break;
    case 'unaryOp':
      visitAST(node.operand, visitor);
      break;
    case 'functionCall':
      for (const arg of node.args) {
        visitAST(arg, visitor);
      }
      break;
    case 'array':
      for (const row of node.rows) {
        for (const cell of row) {
          visitAST(cell, visitor);
        }
      }
      break;
  }
}

/**
 * Get all cell references in an AST
 */
export function getCellReferences(node: ASTNode): CellAddress[] {
  const refs: CellAddress[] = [];

  visitAST(node, (n) => {
    if (n.type === 'cellRef') {
      refs.push(n.address);
    }
  });

  return refs;
}

/**
 * Get all range references in an AST
 */
export function getRangeReferences(node: ASTNode): CellRange[] {
  const refs: CellRange[] = [];

  visitAST(node, (n) => {
    if (n.type === 'rangeRef') {
      refs.push(n.range);
    }
  });

  return refs;
}

/**
 * Get all function calls in an AST
 */
export function getFunctionCalls(node: ASTNode): string[] {
  const funcs: string[] = [];

  visitAST(node, (n) => {
    if (n.type === 'functionCall') {
      funcs.push(n.name);
    }
  });

  return funcs;
}
