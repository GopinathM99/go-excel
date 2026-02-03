// Data manipulation and sorting utilities

export {
  // Types
  type SortCriteria,
  type SortOptions,
  type RowMapping,
  type SortResult,
  // Functions
  sortRange,
  detectDataRange,
  createUndoMappings,
  applySortResult,
  validateSortCriteria,
} from './Sorter';

// Auto-filter functionality
export {
  // Types
  type FilterOperator,
  type FilterCondition,
  type ColumnFilter,
  type AutoFilter,
  type FilterResult,
  // Functions
  createAutoFilter,
  setColumnFilter,
  clearColumnFilter,
  clearAllFilters,
  applyFilter,
  getUniqueValues,
  getVisibleRows,
  getHiddenRows,
  createValueFilter,
  createConditionFilter,
  applyFilterToSheet,
  removeAutoFilter,
  isRowVisible,
  getVisibleRowCount,
  getTotalRowCount,
} from './Filter';

// Data validation
export {
  // Types
  type ValidationType,
  type ValidationOperator,
  type ValidationErrorStyle,
  type DataValidation,
  type ValidationResult,
  type ValidationContext,
  type ValidationMap,
  // Functions
  createValidation,
  validateValue,
  getDropdownValues,
  applyValidationToRange,
  getValidationForCell,
  removeValidation,
  getAllValidations,
  hasValidation,
  validateCell,
  createListValidation,
  createNumberRangeValidation,
  createTextLengthValidation,
  createCustomValidation,
  serializeValidations,
  deserializeValidations,
} from './Validation';
