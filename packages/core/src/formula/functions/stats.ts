import type { FormulaFunction, FunctionArg } from './types';
import { flattenArgs, getNumericValues } from './types';
import { CellValue, numberValue, errorValue, CellErrorCode, coerceToNumber, coerceToString, isError } from '../../models/CellValue';

export const COUNT: FormulaFunction = {
  name: 'COUNT',
  minArgs: 1,
  maxArgs: -1,
  description: 'Counts the number of cells that contain numbers',
  execute(args: FunctionArg[]): CellValue {
    let count = 0;
    for (const arg of flattenArgs(args)) {
      if (arg.type === 'number') count++;
    }
    return numberValue(count);
  },
};

export const COUNTA: FormulaFunction = {
  name: 'COUNTA',
  minArgs: 1,
  maxArgs: -1,
  description: 'Counts the number of cells that are not empty',
  execute(args: FunctionArg[]): CellValue {
    let count = 0;
    for (const arg of flattenArgs(args)) {
      if (arg.type !== 'empty') count++;
    }
    return numberValue(count);
  },
};

export const COUNTBLANK: FormulaFunction = {
  name: 'COUNTBLANK',
  minArgs: 1,
  maxArgs: 1,
  description: 'Counts empty cells in a range',
  execute(args: FunctionArg[]): CellValue {
    let count = 0;
    const values = Array.isArray(args[0]) ? args[0] : [args[0]!];
    for (const val of values) {
      if (val.type === 'empty') count++;
    }
    return numberValue(count);
  },
};

export const COUNTIF: FormulaFunction = {
  name: 'COUNTIF',
  minArgs: 2,
  maxArgs: 2,
  description: 'Counts cells that meet a condition',
  execute(args: FunctionArg[]): CellValue {
    const values = Array.isArray(args[0]) ? args[0] : [args[0]!];
    const criteria = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
    const criteriaStr = coerceToString(criteria);

    let count = 0;
    for (const val of values) {
      if (matchesCriteria(val, criteriaStr)) count++;
    }
    return numberValue(count);
  },
};

export const SUMIF: FormulaFunction = {
  name: 'SUMIF',
  minArgs: 2,
  maxArgs: 3,
  description: 'Sums cells that meet a condition',
  execute(args: FunctionArg[]): CellValue {
    const range = Array.isArray(args[0]) ? args[0] : [args[0]!];
    const criteria = Array.isArray(args[1]) ? args[1][0]! : args[1]!;
    const criteriaStr = coerceToString(criteria);
    const sumRange = args.length > 2
      ? (Array.isArray(args[2]) ? args[2] : [args[2]!])
      : range;

    let sum = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriteria(range[i]!, criteriaStr)) {
        const val = sumRange[i];
        if (val && val.type === 'number') {
          sum += val.value;
        }
      }
    }
    return numberValue(sum);
  },
};

function matchesCriteria(value: CellValue, criteria: string): boolean {
  const valStr = coerceToString(value);

  // Check for comparison operators
  if (criteria.startsWith('>=')) {
    const num = parseFloat(criteria.slice(2));
    const valNum = coerceToNumber(value);
    if (valNum.type === 'number') {
      return valNum.value >= num;
    }
    return false;
  }
  if (criteria.startsWith('<=')) {
    const num = parseFloat(criteria.slice(2));
    const valNum = coerceToNumber(value);
    if (valNum.type === 'number') {
      return valNum.value <= num;
    }
    return false;
  }
  if (criteria.startsWith('<>')) {
    return valStr !== criteria.slice(2);
  }
  if (criteria.startsWith('>')) {
    const num = parseFloat(criteria.slice(1));
    const valNum = coerceToNumber(value);
    if (valNum.type === 'number') {
      return valNum.value > num;
    }
    return false;
  }
  if (criteria.startsWith('<')) {
    const num = parseFloat(criteria.slice(1));
    const valNum = coerceToNumber(value);
    if (valNum.type === 'number') {
      return valNum.value < num;
    }
    return false;
  }
  if (criteria.startsWith('=')) {
    return valStr === criteria.slice(1);
  }

  // Wildcard matching
  if (criteria.includes('*') || criteria.includes('?')) {
    const regex = new RegExp(
      '^' + criteria.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return regex.test(valStr);
  }

  // Exact match
  return valStr.toLowerCase() === criteria.toLowerCase();
}
