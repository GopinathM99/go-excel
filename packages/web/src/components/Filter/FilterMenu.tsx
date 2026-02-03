import { memo, useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { ConditionBuilder } from './FilterCondition';
import type { FilterCondition as FilterConditionType, FilterOperator } from '../../hooks/useFilter';
import './FilterMenu.css';

type FilterTab = 'values' | 'text' | 'number';

interface FilterMenuProps {
  column: number;
  uniqueValues: string[];
  currentFilter?: {
    type: 'values' | 'condition';
    values?: Set<string>;
    conditions?: FilterConditionType[];
    conditionLogic?: 'and' | 'or';
  };
  onApplyValueFilter: (values: string[]) => void;
  onApplyConditionFilter: (conditions: FilterConditionType[], logic: 'and' | 'or') => void;
  onClearFilter: () => void;
  onClose: () => void;
  anchorRect?: DOMRect;
}

/**
 * Filter menu with value list and condition filters
 */
export const FilterMenu = memo(function FilterMenu({
  column,
  uniqueValues,
  currentFilter,
  onApplyValueFilter,
  onApplyConditionFilter,
  onClearFilter,
  onClose,
  anchorRect,
}: FilterMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Current tab
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    if (currentFilter?.type === 'condition') {
      // Check if it looks like a number filter
      const firstCondition = currentFilter.conditions?.[0];
      if (firstCondition) {
        const numberOps: FilterOperator[] = [
          'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual',
          'between', 'notBetween', 'top10', 'bottom10', 'aboveAverage', 'belowAverage',
        ];
        if (numberOps.includes(firstCondition.operator)) {
          return 'number';
        }
      }
      return 'text';
    }
    return 'values';
  });

  // Value filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<Set<string>>(() => {
    if (currentFilter?.type === 'values' && currentFilter.values) {
      return new Set(currentFilter.values);
    }
    return new Set(uniqueValues);
  });

  // Condition filter state
  const [conditions, setConditions] = useState<FilterConditionType[]>(() => {
    if (currentFilter?.type === 'condition' && currentFilter.conditions) {
      return [...currentFilter.conditions];
    }
    return [{ operator: 'contains' as FilterOperator }];
  });
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>(
    currentFilter?.conditionLogic ?? 'and'
  );

  // Filtered values based on search
  const filteredValues = useMemo(() => {
    if (!searchTerm.trim()) {
      return uniqueValues;
    }
    const term = searchTerm.toLowerCase();
    return uniqueValues.filter((value) =>
      value.toLowerCase().includes(term) || (value === '' && 'blanks'.includes(term))
    );
  }, [uniqueValues, searchTerm]);

  // Check if all filtered values are selected
  const allSelected = useMemo(() => {
    return filteredValues.every((v) => selectedValues.has(v));
  }, [filteredValues, selectedValues]);

  // Handle Select All
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      // Deselect all filtered values
      const newSelected = new Set(selectedValues);
      filteredValues.forEach((v) => newSelected.delete(v));
      setSelectedValues(newSelected);
    } else {
      // Select all filtered values
      const newSelected = new Set(selectedValues);
      filteredValues.forEach((v) => newSelected.add(v));
      setSelectedValues(newSelected);
    }
  }, [allSelected, filteredValues, selectedValues]);

  // Handle individual value toggle
  const handleValueToggle = useCallback((value: string) => {
    setSelectedValues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  }, []);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handle Apply
  const handleApply = useCallback(() => {
    if (activeTab === 'values') {
      onApplyValueFilter(Array.from(selectedValues));
    } else {
      // Filter out empty conditions
      const validConditions = conditions.filter(
        (c) =>
          c.operator === 'blank' ||
          c.operator === 'notBlank' ||
          c.operator === 'top10' ||
          c.operator === 'bottom10' ||
          c.operator === 'aboveAverage' ||
          c.operator === 'belowAverage' ||
          (c.value1 !== undefined && c.value1 !== '')
      );
      if (validConditions.length > 0) {
        onApplyConditionFilter(validConditions, conditionLogic);
      }
    }
    onClose();
  }, [
    activeTab,
    selectedValues,
    conditions,
    conditionLogic,
    onApplyValueFilter,
    onApplyConditionFilter,
    onClose,
  ]);

  // Handle Clear
  const handleClear = useCallback(() => {
    onClearFilter();
    onClose();
  }, [onClearFilter, onClose]);

  // Handle Cancel/Close
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleApply();
      }
    },
    [onClose, handleApply]
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Focus search input on open
  useEffect(() => {
    if (activeTab === 'values' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeTab]);

  // Position menu
  const menuStyle = useMemo(() => {
    if (!anchorRect) return {};

    const menuWidth = 320;
    const menuMaxHeight = 400;

    let left = anchorRect.left;
    let top = anchorRect.bottom + 4;

    // Adjust if menu would go off right edge
    if (left + menuWidth > window.innerWidth) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }

    // Adjust if menu would go off bottom edge
    if (top + menuMaxHeight > window.innerHeight) {
      // Try positioning above the anchor
      const topAbove = anchorRect.top - menuMaxHeight - 4;
      if (topAbove > 0) {
        top = topAbove;
      } else {
        // Position at bottom of viewport
        top = window.innerHeight - menuMaxHeight - 8;
      }
    }

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [anchorRect]);

  return (
    <div
      ref={menuRef}
      className="filter-menu"
      style={menuStyle}
      role="dialog"
      aria-label={`Filter options for column ${String(column + 1)}`}
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Tabs */}
      <div className="filter-menu-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'values'}
          className={`filter-menu-tab ${activeTab === 'values' ? 'active' : ''}`}
          onClick={() => setActiveTab('values')}
        >
          Values
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'text'}
          className={`filter-menu-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          Text Filters
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'number'}
          className={`filter-menu-tab ${activeTab === 'number' ? 'active' : ''}`}
          onClick={() => setActiveTab('number')}
        >
          Number Filters
        </button>
      </div>

      {/* Content */}
      <div className="filter-menu-content" role="tabpanel">
        {activeTab === 'values' ? (
          <div className="filter-values-panel">
            {/* Search */}
            <div className="filter-search">
              <svg
                className="filter-search-icon"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="M11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0zm.83 4.62a6 6 0 1 1 .7-.7l3.54 3.53a.5.5 0 0 1-.7.7l-3.54-3.53z"
                  fill="currentColor"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="filter-search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                aria-label="Search filter values"
              />
              {searchTerm && (
                <button
                  className="filter-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
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
              )}
            </div>

            {/* Value list */}
            <div className="filter-values-list" role="listbox" aria-label="Filter values">
              {/* Select All */}
              <label className="filter-value-item select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all values"
                />
                <span className="filter-value-label">(Select All)</span>
                <span className="filter-value-count">{filteredValues.length}</span>
              </label>

              {/* Individual values */}
              {filteredValues.map((value) => (
                <label key={value || '__blank__'} className="filter-value-item">
                  <input
                    type="checkbox"
                    checked={selectedValues.has(value)}
                    onChange={() => handleValueToggle(value)}
                  />
                  <span className="filter-value-label">
                    {value === '' ? '(Blanks)' : value}
                  </span>
                </label>
              ))}

              {filteredValues.length === 0 && (
                <div className="filter-no-results">No matching values</div>
              )}
            </div>
          </div>
        ) : (
          <div className="filter-condition-panel">
            <p className="filter-condition-help">
              Show rows where the value
              {activeTab === 'text' ? ' (text)' : ' (number)'}:
            </p>
            <ConditionBuilder
              conditions={conditions}
              logic={conditionLogic}
              filterType={activeTab}
              onConditionsChange={setConditions}
              onLogicChange={setConditionLogic}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="filter-menu-footer">
        <button
          className="filter-menu-button clear"
          onClick={handleClear}
          disabled={!currentFilter}
        >
          Clear Filter
        </button>
        <div className="filter-menu-footer-actions">
          <button className="filter-menu-button cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button className="filter-menu-button apply" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
});
