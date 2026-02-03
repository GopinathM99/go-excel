import type { ASTNode, BinaryOperator, UnaryOperator } from './AST';
import type { CellAddress } from '../models/CellAddress';
import type { CellRange } from '../models/CellRange';
import type { Sheet } from '../models/Sheet';
import type { Workbook } from '../models/Workbook';
import {
  CellValue,
  CellErrorCode,
  numberValue,
  stringValue,
  booleanValue,
  errorValue,
  emptyValue,
  coerceToNumber,
  coerceToString,
  coerceToBoolean,
  isError,
} from '../models/CellValue';
import { getCell, getCellsInRange } from '../models/Sheet';
import { getSheetByName } from '../models/Workbook';
import { iterateRange } from '../models/CellRange';
import type { FormulaFunction } from './functions/types';
import { FUNCTION_REGISTRY } from './functions';

/**
 * Context for formula evaluation
 */
export interface EvaluationContext {
  /** The workbook containing all sheets */
  workbook: Workbook;
  /** The current sheet */
  currentSheet: Sheet;
  /** The cell being evaluated (for circular reference detection) */
  currentCell: CellAddress;
  /** Set of cells currently being evaluated (for circular reference detection) */
  evaluatingCells: Set<string>;
  /** Custom function registry (optional) */
  functions?: Map<string, FormulaFunction>;
}

/**
 * Result of evaluating a formula
 */
export type EvaluationResult =
  | { success: true; value: CellValue }
  | { success: false; error: CellValue };

/**
 * Evaluates a formula AST to produce a value
 */
export class Evaluator {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
  }

  /**
   * Evaluate an AST node
   */
  evaluate(node: ASTNode): CellValue {
    switch (node.type) {
      case 'number':
        return numberValue(node.value);

      case 'string':
        return stringValue(node.value);

      case 'boolean':
        return booleanValue(node.value);

      case 'error':
        return errorValue(node.code);

      case 'cellRef':
        return this.evaluateCellRef(node.address);

      case 'rangeRef':
        // Range references return an array of values when used directly
        // Most of the time they're used in function arguments
        return this.evaluateRange(node.range)[0] ?? emptyValue();

      case 'namedRange':
        return this.evaluateNamedRange(node.name);

      case 'binaryOp':
        return this.evaluateBinaryOp(node.operator, node.left, node.right);

      case 'unaryOp':
        return this.evaluateUnaryOp(node.operator, node.operand);

      case 'functionCall':
        return this.evaluateFunctionCall(node.name, node.args);

      case 'array':
        // For now, return first value of array
        if (node.rows.length > 0 && node.rows[0]!.length > 0) {
          return this.evaluate(node.rows[0]![0]!);
        }
        return emptyValue();

      default:
        return errorValue(CellErrorCode.VALUE, 'Unknown node type');
    }
  }

  /**
   * Evaluate a cell reference
   */
  private evaluateCellRef(address: CellAddress): CellValue {
    const key = `${address.sheetName ?? ''}!${address.row},${address.col}`;

    // Check for circular reference
    if (this.context.evaluatingCells.has(key)) {
      return errorValue(CellErrorCode.CIRCULAR);
    }

    // Get the sheet
    let sheet = this.context.currentSheet;
    if (address.sheetName && address.sheetName !== sheet.name) {
      const otherSheet = getSheetByName(this.context.workbook, address.sheetName);
      if (!otherSheet) {
        return errorValue(CellErrorCode.REF, `Sheet not found: ${address.sheetName}`);
      }
      sheet = otherSheet;
    }

    // Get the cell
    const cell = getCell(sheet, address);
    return cell.value;
  }

  /**
   * Evaluate a range reference and return all values
   */
  evaluateRange(range: CellRange): CellValue[] {
    let sheet = this.context.currentSheet;
    if (range.start.sheetName && range.start.sheetName !== sheet.name) {
      const otherSheet = getSheetByName(this.context.workbook, range.start.sheetName);
      if (!otherSheet) {
        return [errorValue(CellErrorCode.REF, `Sheet not found: ${range.start.sheetName}`)];
      }
      sheet = otherSheet;
    }

    const values: CellValue[] = [];
    for (const addr of iterateRange(range)) {
      const cell = getCell(sheet, addr);
      values.push(cell.value);
    }

    return values;
  }

  /**
   * Evaluate a named range
   */
  private evaluateNamedRange(name: string): CellValue {
    const namedRange = this.context.workbook.namedRanges.find(
      (nr) => nr.name.toLowerCase() === name.toLowerCase()
    );

    if (!namedRange) {
      return errorValue(CellErrorCode.NAME, `Named range not found: ${name}`);
    }

    // Parse the reference and evaluate
    // For now, return an error as named range resolution requires more implementation
    return errorValue(CellErrorCode.NAME, 'Named range not yet implemented');
  }

  /**
   * Evaluate a binary operation
   */
  private evaluateBinaryOp(
    operator: BinaryOperator,
    left: ASTNode,
    right: ASTNode
  ): CellValue {
    const leftValue = this.evaluate(left);
    const rightValue = this.evaluate(right);

    // Propagate errors
    if (isError(leftValue)) return leftValue;
    if (isError(rightValue)) return rightValue;

    switch (operator) {
      case '+':
        return this.addValues(leftValue, rightValue);
      case '-':
        return this.subtractValues(leftValue, rightValue);
      case '*':
        return this.multiplyValues(leftValue, rightValue);
      case '/':
        return this.divideValues(leftValue, rightValue);
      case '^':
        return this.powerValues(leftValue, rightValue);
      case '&':
        return stringValue(coerceToString(leftValue) + coerceToString(rightValue));
      case '=':
        return booleanValue(this.compareValues(leftValue, rightValue) === 0);
      case '<>':
        return booleanValue(this.compareValues(leftValue, rightValue) !== 0);
      case '<':
        return booleanValue(this.compareValues(leftValue, rightValue) < 0);
      case '<=':
        return booleanValue(this.compareValues(leftValue, rightValue) <= 0);
      case '>':
        return booleanValue(this.compareValues(leftValue, rightValue) > 0);
      case '>=':
        return booleanValue(this.compareValues(leftValue, rightValue) >= 0);
      default:
        return errorValue(CellErrorCode.VALUE, `Unknown operator: ${operator}`);
    }
  }

  /**
   * Evaluate a unary operation
   */
  private evaluateUnaryOp(operator: UnaryOperator, operand: ASTNode): CellValue {
    const value = this.evaluate(operand);

    if (isError(value)) return value;

    switch (operator) {
      case '+': {
        const num = coerceToNumber(value);
        return num;
      }
      case '-': {
        const num = coerceToNumber(value);
        if (isError(num)) return num;
        return numberValue(-(num as { type: 'number'; value: number }).value);
      }
      case '%': {
        const num = coerceToNumber(value);
        if (isError(num)) return num;
        return numberValue((num as { type: 'number'; value: number }).value / 100);
      }
      default:
        return errorValue(CellErrorCode.VALUE, `Unknown operator: ${operator}`);
    }
  }

  /**
   * Evaluate a function call
   */
  private evaluateFunctionCall(name: string, args: ASTNode[]): CellValue {
    const upperName = name.toUpperCase();

    // Look up function in registry
    const fn = this.context.functions?.get(upperName) ?? FUNCTION_REGISTRY.get(upperName);

    if (!fn) {
      return errorValue(CellErrorCode.NAME, `Unknown function: ${name}`);
    }

    // Evaluate arguments
    const evaluatedArgs: (CellValue | CellValue[])[] = args.map((arg) => {
      if (arg.type === 'rangeRef') {
        return this.evaluateRange(arg.range);
      }
      return this.evaluate(arg);
    });

    // Call function
    try {
      return fn.execute(evaluatedArgs, this);
    } catch (e) {
      return errorValue(CellErrorCode.VALUE, e instanceof Error ? e.message : 'Function error');
    }
  }

  /**
   * Add two values
   */
  private addValues(left: CellValue, right: CellValue): CellValue {
    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (isError(leftNum)) return leftNum;
    if (isError(rightNum)) return rightNum;

    const leftVal = (leftNum as { type: 'number'; value: number }).value;
    const rightVal = (rightNum as { type: 'number'; value: number }).value;

    return numberValue(leftVal + rightVal);
  }

  /**
   * Subtract two values
   */
  private subtractValues(left: CellValue, right: CellValue): CellValue {
    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (isError(leftNum)) return leftNum;
    if (isError(rightNum)) return rightNum;

    const leftVal = (leftNum as { type: 'number'; value: number }).value;
    const rightVal = (rightNum as { type: 'number'; value: number }).value;

    return numberValue(leftVal - rightVal);
  }

  /**
   * Multiply two values
   */
  private multiplyValues(left: CellValue, right: CellValue): CellValue {
    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (isError(leftNum)) return leftNum;
    if (isError(rightNum)) return rightNum;

    const leftVal = (leftNum as { type: 'number'; value: number }).value;
    const rightVal = (rightNum as { type: 'number'; value: number }).value;

    return numberValue(leftVal * rightVal);
  }

  /**
   * Divide two values
   */
  private divideValues(left: CellValue, right: CellValue): CellValue {
    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (isError(leftNum)) return leftNum;
    if (isError(rightNum)) return rightNum;

    const leftVal = (leftNum as { type: 'number'; value: number }).value;
    const rightVal = (rightNum as { type: 'number'; value: number }).value;

    if (rightVal === 0) {
      return errorValue(CellErrorCode.DIV_ZERO);
    }

    return numberValue(leftVal / rightVal);
  }

  /**
   * Raise to power
   */
  private powerValues(left: CellValue, right: CellValue): CellValue {
    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (isError(leftNum)) return leftNum;
    if (isError(rightNum)) return rightNum;

    const leftVal = (leftNum as { type: 'number'; value: number }).value;
    const rightVal = (rightNum as { type: 'number'; value: number }).value;

    const result = Math.pow(leftVal, rightVal);

    if (!isFinite(result)) {
      return errorValue(CellErrorCode.NUM);
    }

    return numberValue(result);
  }

  /**
   * Compare two values
   * Returns negative if a < b, positive if a > b, 0 if equal
   */
  private compareValues(left: CellValue, right: CellValue): number {
    // Same type comparison
    if (left.type === right.type) {
      switch (left.type) {
        case 'number':
          return left.value - (right as { type: 'number'; value: number }).value;
        case 'string':
          return left.value.localeCompare((right as { type: 'string'; value: string }).value);
        case 'boolean':
          return (left.value ? 1 : 0) - ((right as { type: 'boolean'; value: boolean }).value ? 1 : 0);
        case 'empty':
          return 0;
        default:
          return 0;
      }
    }

    // Cross-type comparison - try numeric comparison
    const leftNum = coerceToNumber(left);
    const rightNum = coerceToNumber(right);

    if (!isError(leftNum) && !isError(rightNum)) {
      return (
        (leftNum as { type: 'number'; value: number }).value -
        (rightNum as { type: 'number'; value: number }).value
      );
    }

    // Fall back to string comparison
    return coerceToString(left).localeCompare(coerceToString(right));
  }
}

/**
 * Evaluate a formula AST in the given context
 */
export function evaluateFormula(ast: ASTNode, context: EvaluationContext): CellValue {
  const evaluator = new Evaluator(context);
  return evaluator.evaluate(ast);
}
