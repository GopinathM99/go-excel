import { memo, useCallback, useRef, useEffect } from 'react';
import type { FilterOperator, FilterCondition as FilterConditionType } from '../../hooks/useFilter';
import './FilterCondition.css';

interface FilterConditionProps {
  condition: FilterConditionType;
  index: number;
  isLast: boolean;
  logic: 'and' | 'or';
  onUpdate: (index: number, condition: FilterConditionType) => void;
  onRemove: (index: number) => void;
  onLogicChange?: (logic: 'and' | 'or') => void;
  filterType: 'text' | 'number';
}

// Silence unused vars lint - isLast is kept for API consistency
const _useIsLast = (_isLast: boolean) => void 0;

const TEXT_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does Not Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'blank', label: 'Is Blank' },
  { value: 'notBlank', label: 'Is Not Blank' },
];

const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does Not Equal' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'greaterThanOrEqual', label: 'Greater Than Or Equal To' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'lessThanOrEqual', label: 'Less Than Or Equal To' },
  { value: 'between', label: 'Between' },
  { value: 'notBetween', label: 'Not Between' },
  { value: 'top10', label: 'Top 10' },
  { value: 'bottom10', label: 'Bottom 10' },
  { value: 'aboveAverage', label: 'Above Average' },
  { value: 'belowAverage', label: 'Below Average' },
  { value: 'blank', label: 'Is Blank' },
  { value: 'notBlank', label: 'Is Not Blank' },
];

const NO_VALUE_OPERATORS: FilterOperator[] = [
  'blank',
  'notBlank',
  'top10',
  'bottom10',
  'aboveAverage',
  'belowAverage',
];

const TWO_VALUE_OPERATORS: FilterOperator[] = ['between', 'notBetween'];

/**
 * Condition builder component for creating filter conditions
 */
export const FilterCondition = memo(function FilterCondition({
  condition,
  index,
  isLast,
  logic,
  onUpdate,
  onRemove,
  onLogicChange,
  filterType,
}: FilterConditionProps) {
  // isLast reserved for future use (e.g., styling last condition differently)
  _useIsLast(isLast);
  const operatorSelectRef = useRef<HTMLSelectElement>(null);
  const value1InputRef = useRef<HTMLInputElement>(null);
  const value2InputRef = useRef<HTMLInputElement>(null);

  const operators = filterType === 'text' ? TEXT_OPERATORS : NUMBER_OPERATORS;
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator);
  const needsSecondValue = TWO_VALUE_OPERATORS.includes(condition.operator);

  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newOperator = e.target.value as FilterOperator;
      onUpdate(index, {
        ...condition,
        operator: newOperator,
        // Clear values if operator doesn't need them
        value1: NO_VALUE_OPERATORS.includes(newOperator) ? undefined : condition.value1,
        value2: TWO_VALUE_OPERATORS.includes(newOperator) ? condition.value2 : undefined,
      });
    },
    [condition, index, onUpdate]
  );

  const handleValue1Change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = filterType === 'number' && e.target.value
        ? parseFloat(e.target.value) || e.target.value
        : e.target.value;
      onUpdate(index, { ...condition, value1: value });
    },
    [condition, index, onUpdate, filterType]
  );

  const handleValue2Change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = filterType === 'number' && e.target.value
        ? parseFloat(e.target.value) || e.target.value
        : e.target.value;
      onUpdate(index, { ...condition, value2: value });
    },
    [condition, index, onUpdate, filterType]
  );

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  const handleLogicChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onLogicChange?.(e.target.value as 'and' | 'or');
    },
    [onLogicChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Move to next input or blur
        if (e.target === value1InputRef.current && needsSecondValue && value2InputRef.current) {
          value2InputRef.current.focus();
        } else {
          (e.target as HTMLElement).blur();
        }
      }
    },
    [needsSecondValue]
  );

  // Auto-focus value input when operator changes to one that needs value
  useEffect(() => {
    if (needsValue && value1InputRef.current && condition.value1 === undefined) {
      value1InputRef.current.focus();
    }
  }, [condition.operator, needsValue, condition.value1]);

  return (
    <div className="filter-condition" role="group" aria-label={`Filter condition ${String(index + 1)}`}>
      {/* Logic selector (AND/OR) for conditions after the first */}
      {index > 0 && onLogicChange && (
        <div className="filter-condition-logic">
          <select
            value={logic}
            onChange={handleLogicChange}
            className="filter-condition-logic-select"
            aria-label="Condition logic"
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>
        </div>
      )}

      <div className="filter-condition-row">
        {/* Operator selector */}
        <select
          ref={operatorSelectRef}
          value={condition.operator}
          onChange={handleOperatorChange}
          className="filter-condition-operator"
          aria-label="Filter operator"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {/* Value input(s) */}
        {needsValue && (
          <div className="filter-condition-values">
            <input
              ref={value1InputRef}
              type={filterType === 'number' ? 'number' : 'text'}
              value={condition.value1 ?? ''}
              onChange={handleValue1Change}
              onKeyDown={handleKeyDown}
              className="filter-condition-input"
              placeholder={needsSecondValue ? 'From' : 'Value'}
              aria-label={needsSecondValue ? 'From value' : 'Filter value'}
            />
            {needsSecondValue && (
              <>
                <span className="filter-condition-separator">and</span>
                <input
                  ref={value2InputRef}
                  type={filterType === 'number' ? 'number' : 'text'}
                  value={condition.value2 ?? ''}
                  onChange={handleValue2Change}
                  onKeyDown={handleKeyDown}
                  className="filter-condition-input"
                  placeholder="To"
                  aria-label="To value"
                />
              </>
            )}
          </div>
        )}

        {/* Remove button */}
        <button
          type="button"
          onClick={handleRemove}
          className="filter-condition-remove"
          aria-label="Remove condition"
          title="Remove condition"
        >
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path
              d="M3 3l6 6M9 3l-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

/**
 * Props for the condition builder container
 */
interface ConditionBuilderProps {
  conditions: FilterConditionType[];
  logic: 'and' | 'or';
  filterType: 'text' | 'number';
  onConditionsChange: (conditions: FilterConditionType[]) => void;
  onLogicChange: (logic: 'and' | 'or') => void;
}

/**
 * Container for managing multiple filter conditions
 */
export const ConditionBuilder = memo(function ConditionBuilder({
  conditions,
  logic,
  filterType,
  onConditionsChange,
  onLogicChange,
}: ConditionBuilderProps) {
  const handleUpdateCondition = useCallback(
    (index: number, condition: FilterConditionType) => {
      const newConditions = [...conditions];
      newConditions[index] = condition;
      onConditionsChange(newConditions);
    },
    [conditions, onConditionsChange]
  );

  const handleRemoveCondition = useCallback(
    (index: number) => {
      const newConditions = conditions.filter((_, i) => i !== index);
      onConditionsChange(newConditions);
    },
    [conditions, onConditionsChange]
  );

  const handleAddCondition = useCallback(() => {
    const defaultOperator: FilterOperator = filterType === 'text' ? 'contains' : 'equals';
    onConditionsChange([...conditions, { operator: defaultOperator }]);
  }, [conditions, onConditionsChange, filterType]);

  return (
    <div className="condition-builder" role="group" aria-label="Filter conditions">
      {conditions.map((condition, index) => (
        <FilterCondition
          key={index}
          condition={condition}
          index={index}
          isLast={index === conditions.length - 1}
          logic={logic}
          onUpdate={handleUpdateCondition}
          onRemove={handleRemoveCondition}
          onLogicChange={index === 1 ? onLogicChange : undefined}
          filterType={filterType}
        />
      ))}

      <button
        type="button"
        onClick={handleAddCondition}
        className="condition-builder-add"
        aria-label="Add condition"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path
            d="M6 2v8M2 6h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Add Condition
      </button>
    </div>
  );
});
