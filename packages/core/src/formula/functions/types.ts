import type { CellValue } from '../../models/CellValue';
import type { Evaluator } from '../Evaluator';

/**
 * Function argument type - either a single value or array of values (from range)
 */
export type FunctionArg = CellValue | CellValue[];

/**
 * Interface for formula functions
 */
export interface FormulaFunction {
  /** Function name */
  name: string;
  /** Minimum number of arguments */
  minArgs: number;
  /** Maximum number of arguments (-1 for unlimited) */
  maxArgs: number;
  /** Function description */
  description: string;
  /** Execute the function */
  execute(args: FunctionArg[], evaluator: Evaluator): CellValue;
}

/**
 * Flattens an array of function arguments into a single array of CellValues
 */
export function flattenArgs(args: FunctionArg[]): CellValue[] {
  const result: CellValue[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      result.push(...arg);
    } else {
      result.push(arg);
    }
  }
  return result;
}

/**
 * Gets numeric values from arguments, ignoring non-numeric values
 */
export function getNumericValues(args: FunctionArg[]): number[] {
  const values: number[] = [];
  for (const arg of flattenArgs(args)) {
    if (arg.type === 'number') {
      values.push(arg.value);
    } else if (arg.type === 'boolean') {
      values.push(arg.value ? 1 : 0);
    }
  }
  return values;
}
