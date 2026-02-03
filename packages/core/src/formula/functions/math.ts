import type { FormulaFunction, FunctionArg } from './types';
import { getNumericValues, flattenArgs } from './types';
import { CellValue, numberValue, errorValue, CellErrorCode, coerceToNumber, isError } from '../../models/CellValue';

export const SUM: FormulaFunction = {
  name: 'SUM',
  minArgs: 1,
  maxArgs: -1,
  description: 'Adds all the numbers in a range of cells',
  execute(args: FunctionArg[]): CellValue {
    const numbers = getNumericValues(args);
    return numberValue(numbers.reduce((a, b) => a + b, 0));
  },
};

export const AVERAGE: FormulaFunction = {
  name: 'AVERAGE',
  minArgs: 1,
  maxArgs: -1,
  description: 'Returns the average of the arguments',
  execute(args: FunctionArg[]): CellValue {
    const numbers = getNumericValues(args);
    if (numbers.length === 0) return errorValue(CellErrorCode.DIV_ZERO);
    return numberValue(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  },
};

export const MIN: FormulaFunction = {
  name: 'MIN',
  minArgs: 1,
  maxArgs: -1,
  description: 'Returns the smallest number in a set of values',
  execute(args: FunctionArg[]): CellValue {
    const numbers = getNumericValues(args);
    if (numbers.length === 0) return numberValue(0);
    return numberValue(Math.min(...numbers));
  },
};

export const MAX: FormulaFunction = {
  name: 'MAX',
  minArgs: 1,
  maxArgs: -1,
  description: 'Returns the largest number in a set of values',
  execute(args: FunctionArg[]): CellValue {
    const numbers = getNumericValues(args);
    if (numbers.length === 0) return numberValue(0);
    return numberValue(Math.max(...numbers));
  },
};

export const ABS: FormulaFunction = {
  name: 'ABS',
  minArgs: 1,
  maxArgs: 1,
  description: 'Returns the absolute value of a number',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const num = coerceToNumber(val);
    if (isError(num)) return num;
    return numberValue(Math.abs((num as { type: 'number'; value: number }).value));
  },
};

export const ROUND: FormulaFunction = {
  name: 'ROUND',
  minArgs: 1,
  maxArgs: 2,
  description: 'Rounds a number to a specified number of digits',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const num = coerceToNumber(val);
    if (isError(num)) return num;

    let digits = 0;
    if (args.length > 1) {
      const digitsVal = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
      const digitsNum = coerceToNumber(digitsVal);
      if (isError(digitsNum)) return digitsNum;
      digits = Math.floor((digitsNum as { type: 'number'; value: number }).value);
    }

    const factor = Math.pow(10, digits);
    return numberValue(Math.round((num as { type: 'number'; value: number }).value * factor) / factor);
  },
};

export const SQRT: FormulaFunction = {
  name: 'SQRT',
  minArgs: 1,
  maxArgs: 1,
  description: 'Returns the square root of a number',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const num = coerceToNumber(val);
    if (isError(num)) return num;
    const value = (num as { type: 'number'; value: number }).value;
    if (value < 0) return errorValue(CellErrorCode.NUM);
    return numberValue(Math.sqrt(value));
  },
};

export const POWER: FormulaFunction = {
  name: 'POWER',
  minArgs: 2,
  maxArgs: 2,
  description: 'Returns the result of a number raised to a power',
  execute(args: FunctionArg[]): CellValue {
    const base = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const exp = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
    const baseNum = coerceToNumber(base);
    const expNum = coerceToNumber(exp);
    if (isError(baseNum)) return baseNum;
    if (isError(expNum)) return expNum;
    return numberValue(Math.pow(
      (baseNum as { type: 'number'; value: number }).value,
      (expNum as { type: 'number'; value: number }).value
    ));
  },
};
