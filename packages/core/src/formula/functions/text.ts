import type { FormulaFunction, FunctionArg } from './types';
import { flattenArgs } from './types';
import { CellValue, stringValue, numberValue, errorValue, CellErrorCode, coerceToString, coerceToNumber, isError } from '../../models/CellValue';

export const LEN: FormulaFunction = {
  name: 'LEN',
  minArgs: 1,
  maxArgs: 1,
  description: 'Returns the number of characters in a text string',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    return numberValue(coerceToString(val).length);
  },
};

export const LEFT: FormulaFunction = {
  name: 'LEFT',
  minArgs: 1,
  maxArgs: 2,
  description: 'Returns the leftmost characters from a text value',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const text = coerceToString(val);

    let numChars = 1;
    if (args.length > 1) {
      const numVal = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
      const num = coerceToNumber(numVal);
      if (isError(num)) return num;
      numChars = Math.floor((num as { type: 'number'; value: number }).value);
    }

    if (numChars < 0) return errorValue(CellErrorCode.VALUE);
    return stringValue(text.substring(0, numChars));
  },
};

export const RIGHT: FormulaFunction = {
  name: 'RIGHT',
  minArgs: 1,
  maxArgs: 2,
  description: 'Returns the rightmost characters from a text value',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const text = coerceToString(val);

    let numChars = 1;
    if (args.length > 1) {
      const numVal = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
      const num = coerceToNumber(numVal);
      if (isError(num)) return num;
      numChars = Math.floor((num as { type: 'number'; value: number }).value);
    }

    if (numChars < 0) return errorValue(CellErrorCode.VALUE);
    return stringValue(text.substring(text.length - numChars));
  },
};

export const MID: FormulaFunction = {
  name: 'MID',
  minArgs: 3,
  maxArgs: 3,
  description: 'Returns a specific number of characters from a text string',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const text = coerceToString(val);

    const startVal = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
    const startNum = coerceToNumber(startVal);
    if (isError(startNum)) return startNum;
    const start = Math.floor((startNum as { type: 'number'; value: number }).value);

    const numVal = Array.isArray(args[2]) ? args[2][0]! : args[2]!;
    const numNum = coerceToNumber(numVal);
    if (isError(numNum)) return numNum;
    const numChars = Math.floor((numNum as { type: 'number'; value: number }).value);

    if (start < 1 || numChars < 0) return errorValue(CellErrorCode.VALUE);
    return stringValue(text.substring(start - 1, start - 1 + numChars));
  },
};

export const CONCATENATE: FormulaFunction = {
  name: 'CONCATENATE',
  minArgs: 1,
  maxArgs: -1,
  description: 'Joins several text strings into one text string',
  execute(args: FunctionArg[]): CellValue {
    const parts = flattenArgs(args).map(coerceToString);
    return stringValue(parts.join(''));
  },
};

export const UPPER: FormulaFunction = {
  name: 'UPPER',
  minArgs: 1,
  maxArgs: 1,
  description: 'Converts text to uppercase',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    return stringValue(coerceToString(val).toUpperCase());
  },
};

export const LOWER: FormulaFunction = {
  name: 'LOWER',
  minArgs: 1,
  maxArgs: 1,
  description: 'Converts text to lowercase',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    return stringValue(coerceToString(val).toLowerCase());
  },
};

export const TRIM: FormulaFunction = {
  name: 'TRIM',
  minArgs: 1,
  maxArgs: 1,
  description: 'Removes spaces from text',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    return stringValue(coerceToString(val).trim().replace(/\s+/g, ' '));
  },
};

export const TEXT: FormulaFunction = {
  name: 'TEXT',
  minArgs: 2,
  maxArgs: 2,
  description: 'Formats a number as text with a specified format',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const num = coerceToNumber(val);
    if (isError(num)) return num;
    // Simplified - just convert to string for now
    return stringValue((num as { type: 'number'; value: number }).value.toString());
  },
};
