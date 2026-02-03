import type { FormulaFunction, FunctionArg } from './types';
import { flattenArgs } from './types';
import { CellValue, booleanValue, errorValue, CellErrorCode, coerceToBoolean, isError } from '../../models/CellValue';
import type { Evaluator } from '../Evaluator';

export const IF: FormulaFunction = {
  name: 'IF',
  minArgs: 2,
  maxArgs: 3,
  description: 'Returns one value if a condition is true and another if false',
  execute(args: FunctionArg[]): CellValue {
    const condition = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const bool = coerceToBoolean(condition);
    if (isError(bool)) return bool;

    const isTrue = (bool as { type: 'boolean'; value: boolean }).value;
    if (isTrue) {
      return Array.isArray(args[1]) ? args[1][0]! : args[1]!;
    } else {
      if (args.length > 2) {
        return Array.isArray(args[2]) ? args[2][0]! : args[2]!;
      }
      return booleanValue(false);
    }
  },
};

export const AND: FormulaFunction = {
  name: 'AND',
  minArgs: 1,
  maxArgs: -1,
  description: 'Returns TRUE if all arguments are TRUE',
  execute(args: FunctionArg[]): CellValue {
    for (const arg of flattenArgs(args)) {
      const bool = coerceToBoolean(arg);
      if (isError(bool)) return bool;
      if (!(bool as { type: 'boolean'; value: boolean }).value) {
        return booleanValue(false);
      }
    }
    return booleanValue(true);
  },
};

export const OR: FormulaFunction = {
  name: 'OR',
  minArgs: 1,
  maxArgs: -1,
  description: 'Returns TRUE if any argument is TRUE',
  execute(args: FunctionArg[]): CellValue {
    for (const arg of flattenArgs(args)) {
      const bool = coerceToBoolean(arg);
      if (isError(bool)) return bool;
      if ((bool as { type: 'boolean'; value: boolean }).value) {
        return booleanValue(true);
      }
    }
    return booleanValue(false);
  },
};

export const NOT: FormulaFunction = {
  name: 'NOT',
  minArgs: 1,
  maxArgs: 1,
  description: 'Reverses the logic of its argument',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    const bool = coerceToBoolean(val);
    if (isError(bool)) return bool;
    return booleanValue(!(bool as { type: 'boolean'; value: boolean }).value);
  },
};

export const TRUE_FN: FormulaFunction = {
  name: 'TRUE',
  minArgs: 0,
  maxArgs: 0,
  description: 'Returns the logical value TRUE',
  execute(): CellValue {
    return booleanValue(true);
  },
};

export const FALSE_FN: FormulaFunction = {
  name: 'FALSE',
  minArgs: 0,
  maxArgs: 0,
  description: 'Returns the logical value FALSE',
  execute(): CellValue {
    return booleanValue(false);
  },
};

export const IFERROR: FormulaFunction = {
  name: 'IFERROR',
  minArgs: 2,
  maxArgs: 2,
  description: 'Returns value if not an error, otherwise returns alternate value',
  execute(args: FunctionArg[]): CellValue {
    const val = Array.isArray(args[0]) ? args[0][0]! : args[0]!;
    if (isError(val)) {
      return Array.isArray(args[1]) ? args[1][0]! : args[1]!;
    }
    return val;
  },
};
