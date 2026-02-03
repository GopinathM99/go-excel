/**
 * Data Validation Components
 *
 * This module provides React components for Excel-like data validation:
 * - ValidationDialog: Main configuration dialog with tabs
 * - ValidationDropdown: In-cell dropdown for list validation
 * - ValidationError: Error popup when validation fails
 * - ValidationInputMessage: Tooltip shown when cell is selected
 */

export { ValidationDialog } from './ValidationDialog';
export { ValidationDropdown, ValidationDropdownTrigger } from './ValidationDropdown';
export { ValidationError, ValidationInputMessage } from './ValidationError';

// Re-export hooks and stores for convenience
export {
  useValidation,
  useValidationStore,
  useValidationErrorStore,
  useValidationDropdownStore,
  useCellValidationStore,
  VALIDATION_TYPE_LABELS,
  VALIDATION_OPERATOR_LABELS,
  ERROR_STYLE_LABELS,
} from '../../hooks/useValidation';
