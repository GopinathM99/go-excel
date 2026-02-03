import type { FormulaFunction } from './types';
import * as math from './math';
import * as logical from './logical';
import * as text from './text';
import * as stats from './stats';

export * from './types';

/**
 * Registry of all built-in functions
 */
export const FUNCTION_REGISTRY = new Map<string, FormulaFunction>();

// Register math functions
FUNCTION_REGISTRY.set('SUM', math.SUM);
FUNCTION_REGISTRY.set('AVERAGE', math.AVERAGE);
FUNCTION_REGISTRY.set('MIN', math.MIN);
FUNCTION_REGISTRY.set('MAX', math.MAX);
FUNCTION_REGISTRY.set('ABS', math.ABS);
FUNCTION_REGISTRY.set('ROUND', math.ROUND);
FUNCTION_REGISTRY.set('SQRT', math.SQRT);
FUNCTION_REGISTRY.set('POWER', math.POWER);

// Register logical functions
FUNCTION_REGISTRY.set('IF', logical.IF);
FUNCTION_REGISTRY.set('AND', logical.AND);
FUNCTION_REGISTRY.set('OR', logical.OR);
FUNCTION_REGISTRY.set('NOT', logical.NOT);
FUNCTION_REGISTRY.set('TRUE', logical.TRUE_FN);
FUNCTION_REGISTRY.set('FALSE', logical.FALSE_FN);
FUNCTION_REGISTRY.set('IFERROR', logical.IFERROR);

// Register text functions
FUNCTION_REGISTRY.set('LEN', text.LEN);
FUNCTION_REGISTRY.set('LEFT', text.LEFT);
FUNCTION_REGISTRY.set('RIGHT', text.RIGHT);
FUNCTION_REGISTRY.set('MID', text.MID);
FUNCTION_REGISTRY.set('CONCATENATE', text.CONCATENATE);
FUNCTION_REGISTRY.set('UPPER', text.UPPER);
FUNCTION_REGISTRY.set('LOWER', text.LOWER);
FUNCTION_REGISTRY.set('TRIM', text.TRIM);
FUNCTION_REGISTRY.set('TEXT', text.TEXT);

// Register stats functions
FUNCTION_REGISTRY.set('COUNT', stats.COUNT);
FUNCTION_REGISTRY.set('COUNTA', stats.COUNTA);
FUNCTION_REGISTRY.set('COUNTBLANK', stats.COUNTBLANK);
FUNCTION_REGISTRY.set('COUNTIF', stats.COUNTIF);
FUNCTION_REGISTRY.set('SUMIF', stats.SUMIF);

/**
 * Get a function by name
 */
export function getFunction(name: string): FormulaFunction | undefined {
  return FUNCTION_REGISTRY.get(name.toUpperCase());
}

/**
 * Register a custom function
 */
export function registerFunction(fn: FormulaFunction): void {
  FUNCTION_REGISTRY.set(fn.name.toUpperCase(), fn);
}

/**
 * Get all registered function names
 */
export function getFunctionNames(): string[] {
  return Array.from(FUNCTION_REGISTRY.keys());
}
