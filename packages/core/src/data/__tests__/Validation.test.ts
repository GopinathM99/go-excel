import { describe, it, expect, beforeEach } from 'vitest';
import {
  createValidation,
  validateValue,
  getDropdownValues,
  applyValidationToRange,
  getValidationForCell,
  removeValidation,
  hasValidation,
  validateCell,
  createListValidation,
  createNumberRangeValidation,
  createTextLengthValidation,
  createCustomValidation,
  serializeValidations,
  deserializeValidations,
  type DataValidation,
  type ValidationResult,
} from '../Validation';
import { createSheet, setCell, getCell, type Sheet } from '../../models/Sheet';
import { createCell } from '../../models/Cell';
import {
  numberValue,
  stringValue,
  booleanValue,
  emptyValue,
  type CellValue,
} from '../../models/CellValue';
import type { CellRange } from '../../models/CellRange';

describe('Validation', () => {
  let sheet: Sheet;

  beforeEach(() => {
    sheet = createSheet('Test');
  });

  describe('createValidation', () => {
    it('should create a validation with default values', () => {
      const validation = createValidation({ type: 'any' });

      expect(validation.type).toBe('any');
      expect(validation.allowBlank).toBe(true);
      expect(validation.showError).toBe(true);
      expect(validation.errorStyle).toBe('stop');
    });

    it('should create a list validation with dropdown enabled', () => {
      const validation = createValidation({
        type: 'list',
        values: ['Yes', 'No'],
      });

      expect(validation.type).toBe('list');
      expect(validation.values).toEqual(['Yes', 'No']);
      expect(validation.showDropdown).toBe(true);
      expect(validation.inCellDropdown).toBe(true);
    });

    it('should create a number validation with operator', () => {
      const validation = createValidation({
        type: 'whole',
        operator: 'between',
        formula1: '1',
        formula2: '100',
      });

      expect(validation.type).toBe('whole');
      expect(validation.operator).toBe('between');
      expect(validation.formula1).toBe('1');
      expect(validation.formula2).toBe('100');
    });

    it('should throw error for number type without operator', () => {
      expect(() =>
        createValidation({
          type: 'whole',
        })
      ).toThrow("Validation type 'whole' requires an operator");
    });

    it('should throw error for between operator without formula2', () => {
      expect(() =>
        createValidation({
          type: 'decimal',
          operator: 'between',
          formula1: '0',
        })
      ).toThrow("Operator 'between' requires formula2");
    });

    it('should throw error for list without values or formula1', () => {
      expect(() =>
        createValidation({
          type: 'list',
        })
      ).toThrow("List validation requires either 'values' array or 'formula1'");
    });

    it('should throw error for custom validation without formula1', () => {
      expect(() =>
        createValidation({
          type: 'custom',
        })
      ).toThrow('Custom validation requires formula1');
    });
  });

  describe('validateValue - any type', () => {
    it('should always return valid for any type', () => {
      const validation = createValidation({ type: 'any' });

      expect(validateValue(numberValue(123), validation).valid).toBe(true);
      expect(validateValue(stringValue('hello'), validation).valid).toBe(true);
      expect(validateValue(booleanValue(true), validation).valid).toBe(true);
    });
  });

  describe('validateValue - blank handling', () => {
    it('should allow blank when allowBlank is true', () => {
      const validation = createValidation({
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
        allowBlank: true,
      });

      const result = validateValue(emptyValue(), validation);
      expect(result.valid).toBe(true);
    });

    it('should reject blank when allowBlank is false', () => {
      const validation = createValidation({
        type: 'whole',
        operator: 'greaterThan',
        formula1: '0',
        allowBlank: false,
      });

      const result = validateValue(emptyValue(), validation);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('requires a value');
    });
  });

  describe('validateValue - whole number', () => {
    const validation = createValidation({
      type: 'whole',
      operator: 'between',
      formula1: '1',
      formula2: '100',
      errorMessage: 'Value must be a whole number between 1 and 100',
    });

    it('should accept valid whole numbers in range', () => {
      expect(validateValue(numberValue(1), validation).valid).toBe(true);
      expect(validateValue(numberValue(50), validation).valid).toBe(true);
      expect(validateValue(numberValue(100), validation).valid).toBe(true);
    });

    it('should reject decimal numbers', () => {
      const result = validateValue(numberValue(50.5), validation);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('whole number');
    });

    it('should reject numbers out of range', () => {
      expect(validateValue(numberValue(0), validation).valid).toBe(false);
      expect(validateValue(numberValue(101), validation).valid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      const result = validateValue(stringValue('abc'), validation);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateValue - decimal number', () => {
    const validation = createValidation({
      type: 'decimal',
      operator: 'between',
      formula1: '0',
      formula2: '100',
    });

    it('should accept decimal numbers in range', () => {
      expect(validateValue(numberValue(0), validation).valid).toBe(true);
      expect(validateValue(numberValue(50.5), validation).valid).toBe(true);
      expect(validateValue(numberValue(99.99), validation).valid).toBe(true);
      expect(validateValue(numberValue(100), validation).valid).toBe(true);
    });

    it('should reject numbers out of range', () => {
      expect(validateValue(numberValue(-1), validation).valid).toBe(false);
      expect(validateValue(numberValue(100.01), validation).valid).toBe(false);
    });
  });

  describe('validateValue - operators', () => {
    it('should validate equal operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'equal',
        formula1: '10',
      });

      expect(validateValue(numberValue(10), validation).valid).toBe(true);
      expect(validateValue(numberValue(9), validation).valid).toBe(false);
      expect(validateValue(numberValue(11), validation).valid).toBe(false);
    });

    it('should validate notEqual operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'notEqual',
        formula1: '10',
      });

      expect(validateValue(numberValue(10), validation).valid).toBe(false);
      expect(validateValue(numberValue(9), validation).valid).toBe(true);
    });

    it('should validate greaterThan operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'greaterThan',
        formula1: '10',
      });

      expect(validateValue(numberValue(11), validation).valid).toBe(true);
      expect(validateValue(numberValue(10), validation).valid).toBe(false);
      expect(validateValue(numberValue(9), validation).valid).toBe(false);
    });

    it('should validate lessThan operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'lessThan',
        formula1: '10',
      });

      expect(validateValue(numberValue(9), validation).valid).toBe(true);
      expect(validateValue(numberValue(10), validation).valid).toBe(false);
      expect(validateValue(numberValue(11), validation).valid).toBe(false);
    });

    it('should validate greaterThanOrEqual operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        formula1: '10',
      });

      expect(validateValue(numberValue(11), validation).valid).toBe(true);
      expect(validateValue(numberValue(10), validation).valid).toBe(true);
      expect(validateValue(numberValue(9), validation).valid).toBe(false);
    });

    it('should validate lessThanOrEqual operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'lessThanOrEqual',
        formula1: '10',
      });

      expect(validateValue(numberValue(9), validation).valid).toBe(true);
      expect(validateValue(numberValue(10), validation).valid).toBe(true);
      expect(validateValue(numberValue(11), validation).valid).toBe(false);
    });

    it('should validate notBetween operator', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'notBetween',
        formula1: '10',
        formula2: '20',
      });

      expect(validateValue(numberValue(5), validation).valid).toBe(true);
      expect(validateValue(numberValue(10), validation).valid).toBe(false);
      expect(validateValue(numberValue(15), validation).valid).toBe(false);
      expect(validateValue(numberValue(20), validation).valid).toBe(false);
      expect(validateValue(numberValue(25), validation).valid).toBe(true);
    });
  });

  describe('validateValue - list', () => {
    it('should accept values from the list', () => {
      const validation = createValidation({
        type: 'list',
        values: ['Yes', 'No', 'Maybe'],
      });

      expect(validateValue(stringValue('Yes'), validation).valid).toBe(true);
      expect(validateValue(stringValue('No'), validation).valid).toBe(true);
      expect(validateValue(stringValue('Maybe'), validation).valid).toBe(true);
    });

    it('should be case insensitive', () => {
      const validation = createValidation({
        type: 'list',
        values: ['Yes', 'No'],
      });

      expect(validateValue(stringValue('yes'), validation).valid).toBe(true);
      expect(validateValue(stringValue('YES'), validation).valid).toBe(true);
      expect(validateValue(stringValue('YeS'), validation).valid).toBe(true);
    });

    it('should reject values not in the list', () => {
      const validation = createValidation({
        type: 'list',
        values: ['Yes', 'No'],
      });

      const result = validateValue(stringValue('Invalid'), validation);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('select a value from the list');
    });
  });

  describe('validateValue - textLength', () => {
    it('should validate text length with between operator', () => {
      const validation = createValidation({
        type: 'textLength',
        operator: 'between',
        formula1: '5',
        formula2: '10',
      });

      expect(validateValue(stringValue('hello'), validation).valid).toBe(true); // 5 chars
      expect(validateValue(stringValue('hello!'), validation).valid).toBe(true); // 6 chars
      expect(validateValue(stringValue('0123456789'), validation).valid).toBe(true); // 10 chars
      expect(validateValue(stringValue('hi'), validation).valid).toBe(false); // 2 chars
      expect(validateValue(stringValue('01234567890'), validation).valid).toBe(false); // 11 chars
    });

    it('should validate text length with lessThanOrEqual operator', () => {
      const validation = createValidation({
        type: 'textLength',
        operator: 'lessThanOrEqual',
        formula1: '10',
      });

      expect(validateValue(stringValue('short'), validation).valid).toBe(true);
      expect(validateValue(stringValue('0123456789'), validation).valid).toBe(true);
      expect(validateValue(stringValue('this is too long'), validation).valid).toBe(false);
    });
  });

  describe('validateValue - error messages', () => {
    it('should include error message when showError is true', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'between',
        formula1: '0',
        formula2: '100',
        showError: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Value',
        errorMessage: 'Please enter a value between 0 and 100',
      });

      const result = validateValue(numberValue(150), validation);
      expect(result.valid).toBe(false);
      expect(result.errorStyle).toBe('stop');
      expect(result.errorTitle).toBe('Invalid Value');
      expect(result.errorMessage).toBe('Please enter a value between 0 and 100');
    });

    it('should not include error details when showError is false', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'between',
        formula1: '0',
        formula2: '100',
        showError: false,
        errorMessage: 'This should not appear',
      });

      const result = validateValue(numberValue(150), validation);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('getDropdownValues', () => {
    it('should return explicit values', () => {
      const validation = createValidation({
        type: 'list',
        values: ['A', 'B', 'C'],
      });

      const values = getDropdownValues(validation);
      expect(values).toEqual(['A', 'B', 'C']);
    });

    it('should parse comma-separated formula1 values', () => {
      const validation = createValidation({
        type: 'list',
        formula1: 'Option 1, Option 2, Option 3',
      });

      const values = getDropdownValues(validation);
      expect(values).toEqual(['Option 1', 'Option 2', 'Option 3']);
    });

    it('should get values from cell range', () => {
      // Set up cells with values
      const cell1 = createCell({ row: 0, col: 0 }, 'Value1');
      const cell2 = createCell({ row: 1, col: 0 }, 'Value2');
      const cell3 = createCell({ row: 2, col: 0 }, 'Value3');

      let testSheet = createSheet('Test');
      testSheet = setCell(testSheet, { ...cell1, value: stringValue('Value1') });
      testSheet = setCell(testSheet, { ...cell2, value: stringValue('Value2') });
      testSheet = setCell(testSheet, { ...cell3, value: stringValue('Value3') });

      const validation = createValidation({
        type: 'list',
        formula1: 'A1:A3',
      });

      const values = getDropdownValues(validation, testSheet);
      expect(values).toEqual(['Value1', 'Value2', 'Value3']);
    });
  });

  describe('applyValidationToRange', () => {
    it('should apply validation to all cells in range', () => {
      const validation = createValidation({
        type: 'list',
        values: ['Yes', 'No'],
      });

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 2 },
      };

      const updatedSheet = applyValidationToRange(sheet, range, validation);

      // Check each cell in the range
      for (let row = 0; row <= 2; row++) {
        for (let col = 0; col <= 2; col++) {
          const cellValidation = getValidationForCell(updatedSheet, { row, col });
          expect(cellValidation).not.toBeNull();
          expect(cellValidation?.type).toBe('list');
        }
      }
    });
  });

  describe('getValidationForCell', () => {
    it('should return validation for a cell with validation', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'greaterThan',
        formula1: '0',
      });

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 0 },
      };

      const updatedSheet = applyValidationToRange(sheet, range, validation);
      const retrieved = getValidationForCell(updatedSheet, { row: 0, col: 0 });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.type).toBe('decimal');
      expect(retrieved?.operator).toBe('greaterThan');
    });

    it('should return null for cell without validation', () => {
      const retrieved = getValidationForCell(sheet, { row: 0, col: 0 });
      expect(retrieved).toBeNull();
    });
  });

  describe('removeValidation', () => {
    it('should remove validation from cells in range', () => {
      const validation = createValidation({
        type: 'list',
        values: ['A', 'B'],
      });

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 },
      };

      let updatedSheet = applyValidationToRange(sheet, range, validation);

      // Verify validation exists
      expect(hasValidation(updatedSheet, { row: 0, col: 0 })).toBe(true);
      expect(hasValidation(updatedSheet, { row: 1, col: 1 })).toBe(true);

      // Remove validation
      updatedSheet = removeValidation(updatedSheet, range);

      // Verify validation is removed
      expect(hasValidation(updatedSheet, { row: 0, col: 0 })).toBe(false);
      expect(hasValidation(updatedSheet, { row: 1, col: 1 })).toBe(false);
    });
  });

  describe('hasValidation', () => {
    it('should return true for cell with validation', () => {
      const validation = createValidation({
        type: 'list',
        values: ['Yes', 'No'],
      });

      const range: CellRange = {
        start: { row: 5, col: 5 },
        end: { row: 5, col: 5 },
      };

      const updatedSheet = applyValidationToRange(sheet, range, validation);
      expect(hasValidation(updatedSheet, { row: 5, col: 5 })).toBe(true);
    });

    it('should return false for cell without validation', () => {
      expect(hasValidation(sheet, { row: 0, col: 0 })).toBe(false);
    });
  });

  describe('validateCell', () => {
    it('should validate cell using its validation rule', () => {
      const validation = createValidation({
        type: 'decimal',
        operator: 'between',
        formula1: '0',
        formula2: '100',
      });

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 0 },
      };

      const updatedSheet = applyValidationToRange(sheet, range, validation);

      const validResult = validateCell(updatedSheet, { row: 0, col: 0 }, numberValue(50));
      expect(validResult.valid).toBe(true);

      const invalidResult = validateCell(updatedSheet, { row: 0, col: 0 }, numberValue(150));
      expect(invalidResult.valid).toBe(false);
    });

    it('should return valid for cell without validation', () => {
      const result = validateCell(sheet, { row: 0, col: 0 }, stringValue('anything'));
      expect(result.valid).toBe(true);
    });
  });

  describe('createListValidation helper', () => {
    it('should create list validation with options', () => {
      const validation = createListValidation(['Option 1', 'Option 2'], {
        allowBlank: false,
        showError: true,
        errorMessage: 'Select an option',
        inputMessage: 'Choose from the list',
      });

      expect(validation.type).toBe('list');
      expect(validation.values).toEqual(['Option 1', 'Option 2']);
      expect(validation.allowBlank).toBe(false);
      expect(validation.showError).toBe(true);
      expect(validation.errorMessage).toBe('Select an option');
      expect(validation.inputMessage).toBe('Choose from the list');
      expect(validation.showDropdown).toBe(true);
    });
  });

  describe('createNumberRangeValidation helper', () => {
    it('should create number range validation for whole numbers', () => {
      const validation = createNumberRangeValidation(0, 100, {
        allowDecimal: false,
      });

      expect(validation.type).toBe('whole');
      expect(validation.operator).toBe('between');
      expect(validation.formula1).toBe('0');
      expect(validation.formula2).toBe('100');
    });

    it('should create number range validation for decimals', () => {
      const validation = createNumberRangeValidation(0, 100, {
        allowDecimal: true,
      });

      expect(validation.type).toBe('decimal');
    });
  });

  describe('createTextLengthValidation helper', () => {
    it('should create max length validation', () => {
      const validation = createTextLengthValidation(50);

      expect(validation.type).toBe('textLength');
      expect(validation.operator).toBe('lessThanOrEqual');
      expect(validation.formula1).toBe('50');
    });

    it('should create min/max length validation', () => {
      const validation = createTextLengthValidation(100, {
        minLength: 10,
      });

      expect(validation.type).toBe('textLength');
      expect(validation.operator).toBe('between');
      expect(validation.formula1).toBe('10');
      expect(validation.formula2).toBe('100');
    });
  });

  describe('createCustomValidation helper', () => {
    it('should create custom validation', () => {
      const validation = createCustomValidation('=A1>0', {
        errorMessage: 'A1 must be positive',
      });

      expect(validation.type).toBe('custom');
      expect(validation.formula1).toBe('=A1>0');
      expect(validation.errorMessage).toBe('A1 must be positive');
    });
  });

  describe('serializeValidations and deserializeValidations', () => {
    it('should serialize and deserialize validations', () => {
      const validation = createValidation({
        type: 'list',
        values: ['A', 'B', 'C'],
        errorMessage: 'Select A, B, or C',
      });

      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 },
      };

      const updatedSheet = applyValidationToRange(sheet, range, validation);
      const serialized = serializeValidations(updatedSheet);

      expect(serialized.length).toBeGreaterThan(0);

      // Create new sheet and deserialize
      let newSheet = createSheet('New');
      newSheet = deserializeValidations(newSheet, serialized);

      // Verify validations were restored
      const restored = getValidationForCell(newSheet, { row: 0, col: 0 });
      expect(restored).not.toBeNull();
      expect(restored?.type).toBe('list');
      expect(restored?.values).toEqual(['A', 'B', 'C']);
    });
  });

  describe('Example usage scenarios', () => {
    it('should work as shown in usage examples - dropdown list', () => {
      const listValidation = createValidation({
        type: 'list',
        values: ['Yes', 'No', 'Maybe'],
        showDropdown: true,
        showError: true,
        errorMessage: 'Please select from the list',
      });

      // Valid selections
      expect(validateValue(stringValue('Yes'), listValidation).valid).toBe(true);
      expect(validateValue(stringValue('No'), listValidation).valid).toBe(true);
      expect(validateValue(stringValue('Maybe'), listValidation).valid).toBe(true);

      // Invalid selection
      const result = validateValue(stringValue('Other'), listValidation);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Please select from the list');
    });

    it('should work as shown in usage examples - number range', () => {
      const numberValidation = createValidation({
        type: 'decimal',
        operator: 'between',
        formula1: '0',
        formula2: '100',
        errorMessage: 'Value must be between 0 and 100',
      });

      // Valid value
      expect(validateValue(numberValue(50), numberValidation).valid).toBe(true);

      // Invalid value
      const result = validateValue(numberValue(150), numberValidation);
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe('Value must be between 0 and 100');
    });

    it('should validate date values as numbers', () => {
      // In Excel, dates are stored as serial numbers
      // January 1, 2024 = 45292 (days since 1/1/1900)
      const dateValidation = createValidation({
        type: 'date',
        operator: 'greaterThanOrEqual',
        formula1: '45292', // Jan 1, 2024
        errorMessage: 'Date must be on or after January 1, 2024',
      });

      expect(validateValue(numberValue(45292), dateValidation).valid).toBe(true);
      expect(validateValue(numberValue(45300), dateValidation).valid).toBe(true);
      expect(validateValue(numberValue(45291), dateValidation).valid).toBe(false);
    });

    it('should validate time values as decimals', () => {
      // In Excel, times are stored as fractions of a day
      // 12:00 PM = 0.5
      const timeValidation = createValidation({
        type: 'time',
        operator: 'between',
        formula1: '0.375', // 9:00 AM
        formula2: '0.708333', // 5:00 PM
        errorMessage: 'Time must be during business hours (9 AM - 5 PM)',
      });

      expect(validateValue(numberValue(0.5), timeValidation).valid).toBe(true); // 12:00 PM
      expect(validateValue(numberValue(0.25), timeValidation).valid).toBe(false); // 6:00 AM
    });

    it('should handle custom formula validation with evaluator', () => {
      const customValidation = createValidation({
        type: 'custom',
        formula1: '=A1>0',
        errorMessage: 'Referenced cell must be positive',
      });

      // Simulate a formula evaluator
      const mockEvaluator = (formula: string) => {
        // For testing, return true for positive values
        return booleanValue(true);
      };

      const context = {
        sheet,
        cellAddress: { row: 0, col: 1 },
        evaluateFormula: mockEvaluator,
      };

      const result = validateValue(numberValue(5), customValidation, context);
      expect(result.valid).toBe(true);
    });
  });
});
