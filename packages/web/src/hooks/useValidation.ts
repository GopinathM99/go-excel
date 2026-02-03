import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import type {
  DataValidation,
  ValidationType,
  ValidationOperator,
  ValidationErrorStyle,
  ValidationResult,
} from '@excel/core';
import {
  createValidation,
  validateValue,
  getDropdownValues,
} from '@excel/core';
import { useSpreadsheetStore } from '../store/spreadsheet';

/**
 * Cell position type
 */
interface CellPosition {
  row: number;
  col: number;
}

/**
 * Validation dialog state
 */
interface ValidationDialogState {
  isOpen: boolean;
  activeTab: 'settings' | 'inputMessage' | 'errorAlert';

  // Settings tab
  validationType: ValidationType;
  operator: ValidationOperator;
  formula1: string;
  formula2: string;
  listValues: string;
  ignoreBlank: boolean;
  inCellDropdown: boolean;

  // Input Message tab
  showInputMessage: boolean;
  inputTitle: string;
  inputMessage: string;

  // Error Alert tab
  showErrorAlert: boolean;
  errorStyle: ValidationErrorStyle;
  errorTitle: string;
  errorMessage: string;

  // Target cells
  targetCells: CellPosition[];
}

/**
 * Validation store actions
 */
interface ValidationStoreActions {
  // Dialog control
  openDialog: (cells: CellPosition[]) => void;
  closeDialog: () => void;
  setActiveTab: (tab: 'settings' | 'inputMessage' | 'errorAlert') => void;

  // Settings updates
  setValidationType: (type: ValidationType) => void;
  setOperator: (operator: ValidationOperator) => void;
  setFormula1: (value: string) => void;
  setFormula2: (value: string) => void;
  setListValues: (values: string) => void;
  setIgnoreBlank: (value: boolean) => void;
  setInCellDropdown: (value: boolean) => void;

  // Input Message updates
  setShowInputMessage: (value: boolean) => void;
  setInputTitle: (value: string) => void;
  setInputMessage: (value: string) => void;

  // Error Alert updates
  setShowErrorAlert: (value: boolean) => void;
  setErrorStyle: (style: ValidationErrorStyle) => void;
  setErrorTitle: (value: string) => void;
  setErrorMessage: (value: string) => void;

  // Actions
  applyValidation: () => DataValidation | null;
  clearValidation: () => void;
  loadValidation: (validation: DataValidation) => void;
  resetDialog: () => void;
}

type ValidationStore = ValidationDialogState & ValidationStoreActions;

/**
 * Initial state for the dialog
 */
const initialState: ValidationDialogState = {
  isOpen: false,
  activeTab: 'settings',
  validationType: 'any',
  operator: 'between',
  formula1: '',
  formula2: '',
  listValues: '',
  ignoreBlank: true,
  inCellDropdown: true,
  showInputMessage: false,
  inputTitle: '',
  inputMessage: '',
  showErrorAlert: true,
  errorStyle: 'stop',
  errorTitle: '',
  errorMessage: '',
  targetCells: [],
};

/**
 * Zustand store for validation dialog state
 */
export const useValidationStore = create<ValidationStore>((set, get) => ({
  ...initialState,

  openDialog: (cells: CellPosition[]) => {
    set({
      isOpen: true,
      targetCells: cells,
      activeTab: 'settings',
    });
  },

  closeDialog: () => {
    set({ isOpen: false });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setValidationType: (type) => {
    set({ validationType: type });
    // Reset operator for types that don't use it
    if (type === 'any' || type === 'list' || type === 'custom') {
      set({ operator: 'between' });
    }
  },

  setOperator: (operator) => {
    set({ operator });
  },

  setFormula1: (value) => {
    set({ formula1: value });
  },

  setFormula2: (value) => {
    set({ formula2: value });
  },

  setListValues: (values) => {
    set({ listValues: values });
  },

  setIgnoreBlank: (value) => {
    set({ ignoreBlank: value });
  },

  setInCellDropdown: (value) => {
    set({ inCellDropdown: value });
  },

  setShowInputMessage: (value) => {
    set({ showInputMessage: value });
  },

  setInputTitle: (value) => {
    set({ inputTitle: value });
  },

  setInputMessage: (value) => {
    set({ inputMessage: value });
  },

  setShowErrorAlert: (value) => {
    set({ showErrorAlert: value });
  },

  setErrorStyle: (style) => {
    set({ errorStyle: style });
  },

  setErrorTitle: (value) => {
    set({ errorTitle: value });
  },

  setErrorMessage: (value) => {
    set({ errorMessage: value });
  },

  applyValidation: () => {
    const state = get();

    if (state.validationType === 'any') {
      return null;
    }

    try {
      const validation = createValidation({
        type: state.validationType,
        operator: needsOperator(state.validationType) ? state.operator : undefined,
        formula1: state.validationType === 'list'
          ? state.listValues
          : state.formula1 || undefined,
        formula2: needsFormula2(state.operator) ? state.formula2 || undefined : undefined,
        values: state.validationType === 'list'
          ? state.listValues.split(',').map(v => v.trim()).filter(v => v.length > 0)
          : undefined,
        allowBlank: state.ignoreBlank,
        showDropdown: state.inCellDropdown,
        inCellDropdown: state.inCellDropdown,
        showInputMessage: state.showInputMessage,
        inputTitle: state.inputTitle || undefined,
        inputMessage: state.inputMessage || undefined,
        showError: state.showErrorAlert,
        errorStyle: state.errorStyle,
        errorTitle: state.errorTitle || undefined,
        errorMessage: state.errorMessage || undefined,
      });

      return validation;
    } catch (error) {
      console.error('Failed to create validation:', error);
      return null;
    }
  },

  clearValidation: () => {
    set({
      ...initialState,
      isOpen: get().isOpen,
      targetCells: get().targetCells,
    });
  },

  loadValidation: (validation: DataValidation) => {
    set({
      validationType: validation.type,
      operator: validation.operator ?? 'between',
      formula1: validation.formula1 ?? '',
      formula2: validation.formula2 ?? '',
      listValues: validation.values?.join(', ') ?? validation.formula1 ?? '',
      ignoreBlank: validation.allowBlank ?? true,
      inCellDropdown: validation.inCellDropdown ?? true,
      showInputMessage: validation.showInputMessage ?? false,
      inputTitle: validation.inputTitle ?? '',
      inputMessage: validation.inputMessage ?? '',
      showErrorAlert: validation.showError ?? true,
      errorStyle: validation.errorStyle ?? 'stop',
      errorTitle: validation.errorTitle ?? '',
      errorMessage: validation.errorMessage ?? '',
    });
  },

  resetDialog: () => {
    set(initialState);
  },
}));

/**
 * Helper to check if a validation type needs an operator
 */
function needsOperator(type: ValidationType): boolean {
  return ['whole', 'decimal', 'date', 'time', 'textLength'].includes(type);
}

/**
 * Helper to check if an operator needs formula2
 */
function needsFormula2(operator: ValidationOperator): boolean {
  return operator === 'between' || operator === 'notBetween';
}

/**
 * Validation error popup state
 */
interface ValidationErrorState {
  isVisible: boolean;
  cellPosition: CellPosition | null;
  result: ValidationResult | null;
  onRetry: (() => void) | null;
  onCancel: (() => void) | null;
}

interface ValidationErrorActions {
  showError: (
    position: CellPosition,
    result: ValidationResult,
    onRetry?: () => void,
    onCancel?: () => void
  ) => void;
  hideError: () => void;
}

type ValidationErrorStore = ValidationErrorState & ValidationErrorActions;

const initialErrorState: ValidationErrorState = {
  isVisible: false,
  cellPosition: null,
  result: null,
  onRetry: null,
  onCancel: null,
};

/**
 * Store for validation error popup
 */
export const useValidationErrorStore = create<ValidationErrorStore>((set) => ({
  ...initialErrorState,

  showError: (position, result, onRetry, onCancel) => {
    set({
      isVisible: true,
      cellPosition: position,
      result,
      onRetry: onRetry ?? null,
      onCancel: onCancel ?? null,
    });
  },

  hideError: () => {
    set(initialErrorState);
  },
}));

/**
 * Cell validations stored per cell
 */
interface CellValidationMap {
  validations: Map<string, DataValidation>;
  setValidation: (row: number, col: number, validation: DataValidation | null) => void;
  getValidation: (row: number, col: number) => DataValidation | null;
  clearAllValidations: () => void;
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Store for cell validations
 */
export const useCellValidationStore = create<CellValidationMap>((set, get) => ({
  validations: new Map(),

  setValidation: (row: number, col: number, validation: DataValidation | null) => {
    set((state) => {
      const newValidations = new Map(state.validations);
      const key = cellKey(row, col);

      if (validation === null) {
        newValidations.delete(key);
      } else {
        newValidations.set(key, validation);
      }

      return { validations: newValidations };
    });
  },

  getValidation: (row: number, col: number) => {
    return get().validations.get(cellKey(row, col)) ?? null;
  },

  clearAllValidations: () => {
    set({ validations: new Map() });
  },
}));

/**
 * Dropdown state for list validation
 */
interface DropdownState {
  isOpen: boolean;
  cellPosition: CellPosition | null;
  values: string[];
  selectedIndex: number;
  anchorRect: DOMRect | null;
}

interface DropdownActions {
  openDropdown: (position: CellPosition, values: string[], anchorRect: DOMRect) => void;
  closeDropdown: () => void;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
}

type DropdownStore = DropdownState & DropdownActions;

const initialDropdownState: DropdownState = {
  isOpen: false,
  cellPosition: null,
  values: [],
  selectedIndex: -1,
  anchorRect: null,
};

/**
 * Store for validation dropdown
 */
export const useValidationDropdownStore = create<DropdownStore>((set, get) => ({
  ...initialDropdownState,

  openDropdown: (position, values, anchorRect) => {
    set({
      isOpen: true,
      cellPosition: position,
      values,
      selectedIndex: -1,
      anchorRect,
    });
  },

  closeDropdown: () => {
    set(initialDropdownState);
  },

  setSelectedIndex: (index) => {
    set({ selectedIndex: index });
  },

  selectNext: () => {
    const { values, selectedIndex } = get();
    const nextIndex = selectedIndex < values.length - 1 ? selectedIndex + 1 : 0;
    set({ selectedIndex: nextIndex });
  },

  selectPrevious: () => {
    const { values, selectedIndex } = get();
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : values.length - 1;
    set({ selectedIndex: prevIndex });
  },
}));

/**
 * Hook to use validation functionality in components
 */
export function useValidation() {
  const { selectedCell, selectionRange, getCellValue, setCellValue } = useSpreadsheetStore();
  const { openDialog, closeDialog, applyValidation, targetCells } = useValidationStore();
  const { setValidation, getValidation } = useCellValidationStore();
  const { showError, hideError } = useValidationErrorStore();
  const { openDropdown, closeDropdown, values: dropdownValues } = useValidationDropdownStore();

  /**
   * Get selected cells for validation
   */
  const getSelectedCells = useCallback((): CellPosition[] => {
    if (selectionRange) {
      const cells: CellPosition[] = [];
      const startRow = Math.min(selectionRange.start.row, selectionRange.end.row);
      const endRow = Math.max(selectionRange.start.row, selectionRange.end.row);
      const startCol = Math.min(selectionRange.start.col, selectionRange.end.col);
      const endCol = Math.max(selectionRange.start.col, selectionRange.end.col);

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          cells.push({ row, col });
        }
      }
      return cells;
    }

    if (selectedCell) {
      return [selectedCell];
    }

    return [];
  }, [selectedCell, selectionRange]);

  /**
   * Open validation dialog for selected cells
   */
  const openValidationDialog = useCallback(() => {
    const cells = getSelectedCells();
    if (cells.length > 0) {
      openDialog(cells);

      // Load existing validation if any
      const firstCell = cells[0];
      const existingValidation = getValidation(firstCell.row, firstCell.col);
      if (existingValidation) {
        useValidationStore.getState().loadValidation(existingValidation);
      }
    }
  }, [getSelectedCells, openDialog, getValidation]);

  /**
   * Apply validation to target cells
   */
  const applyToSelectedCells = useCallback(() => {
    const validation = applyValidation();

    for (const cell of targetCells) {
      setValidation(cell.row, cell.col, validation);
    }

    closeDialog();
  }, [applyValidation, targetCells, setValidation, closeDialog]);

  /**
   * Validate a cell value
   */
  const validateCellValue = useCallback((
    row: number,
    col: number,
    value: string
  ): ValidationResult => {
    const validation = getValidation(row, col);

    if (!validation) {
      return { valid: true };
    }

    // Convert string value to CellValue format
    const cellValue = value === ''
      ? { type: 'empty' as const }
      : isNaN(Number(value))
        ? { type: 'string' as const, value }
        : { type: 'number' as const, value: Number(value) };

    return validateValue(cellValue, validation);
  }, [getValidation]);

  /**
   * Check if cell has list validation
   */
  const hasListValidation = useCallback((row: number, col: number): boolean => {
    const validation = getValidation(row, col);
    return validation?.type === 'list';
  }, [getValidation]);

  /**
   * Get dropdown values for a cell
   */
  const getListValues = useCallback((row: number, col: number): string[] => {
    const validation = getValidation(row, col);
    if (!validation || validation.type !== 'list') {
      return [];
    }
    return getDropdownValues(validation);
  }, [getValidation]);

  /**
   * Handle cell edit with validation
   */
  const handleCellEdit = useCallback((
    row: number,
    col: number,
    value: string,
    onValid: () => void,
    onInvalid?: (result: ValidationResult) => void
  ) => {
    const result = validateCellValue(row, col, value);

    if (result.valid) {
      onValid();
      hideError();
    } else {
      const validation = getValidation(row, col);

      if (validation?.showError) {
        if (result.errorStyle === 'stop') {
          // Stop: Show error and don't allow the value
          showError(
            { row, col },
            result,
            () => {
              hideError();
              // User wants to retry - focus back on cell
            },
            () => {
              hideError();
              // User cancelled - revert value
              onInvalid?.(result);
            }
          );
        } else if (result.errorStyle === 'warning') {
          // Warning: Show error but allow the value with confirmation
          showError(
            { row, col },
            result,
            () => {
              hideError();
              onValid(); // Allow the value
            },
            () => {
              hideError();
              onInvalid?.(result);
            }
          );
        } else {
          // Information: Just show info and allow the value
          showError(
            { row, col },
            result,
            () => {
              hideError();
              onValid();
            }
          );
        }
      } else {
        onInvalid?.(result);
      }
    }
  }, [validateCellValue, getValidation, showError, hideError]);

  /**
   * Get input message for a cell
   */
  const getInputMessage = useCallback((row: number, col: number): {
    title: string;
    message: string;
  } | null => {
    const validation = getValidation(row, col);

    if (!validation || !validation.showInputMessage) {
      return null;
    }

    return {
      title: validation.inputTitle ?? '',
      message: validation.inputMessage ?? '',
    };
  }, [getValidation]);

  return {
    openValidationDialog,
    applyToSelectedCells,
    validateCellValue,
    hasListValidation,
    getListValues,
    handleCellEdit,
    getInputMessage,
    getValidation,
    setValidation,
  };
}

/**
 * Validation type display names
 */
export const VALIDATION_TYPE_LABELS: Record<ValidationType, string> = {
  any: 'Any value',
  whole: 'Whole number',
  decimal: 'Decimal',
  list: 'List',
  date: 'Date',
  time: 'Time',
  textLength: 'Text length',
  custom: 'Custom',
};

/**
 * Validation operator display names
 */
export const VALIDATION_OPERATOR_LABELS: Record<ValidationOperator, string> = {
  between: 'between',
  notBetween: 'not between',
  equal: 'equal to',
  notEqual: 'not equal to',
  greaterThan: 'greater than',
  lessThan: 'less than',
  greaterThanOrEqual: 'greater than or equal to',
  lessThanOrEqual: 'less than or equal to',
};

/**
 * Error style display names
 */
export const ERROR_STYLE_LABELS: Record<ValidationErrorStyle, string> = {
  stop: 'Stop',
  warning: 'Warning',
  information: 'Information',
};
