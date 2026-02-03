import React, { useCallback } from 'react';
import type { SortLevel as SortLevelType, ColumnOption } from '../../hooks/useSort';
import './SortLevel.css';

interface SortLevelProps {
  /** The sort level configuration */
  level: SortLevelType;
  /** Available column options */
  columns: ColumnOption[];
  /** Level index (0-based) for display */
  index: number;
  /** Whether this level can be removed */
  canRemove: boolean;
  /** Columns already used by other levels */
  usedColumns: Set<number>;
  /** Callback when column changes */
  onColumnChange: (column: number) => void;
  /** Callback when sort order changes */
  onOrderChange: (ascending: boolean) => void;
  /** Callback when level is removed */
  onRemove: () => void;
}

/**
 * Individual sort level component for configuring column and order
 */
export function SortLevel({
  level,
  columns,
  index,
  canRemove,
  usedColumns,
  onColumnChange,
  onOrderChange,
  onRemove,
}: SortLevelProps) {
  const handleColumnChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onColumnChange(parseInt(e.target.value, 10));
    },
    [onColumnChange]
  );

  const handleOrderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onOrderChange(e.target.value === 'asc');
    },
    [onOrderChange]
  );

  const handleRemoveClick = useCallback(() => {
    onRemove();
  }, [onRemove]);

  const handleRemoveKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onRemove();
      }
    },
    [onRemove]
  );

  const levelLabel = index === 0 ? 'Sort by' : 'Then by';

  return (
    <div className="sort-level" role="group" aria-label={`${levelLabel} configuration`}>
      <label className="sort-level-label">{levelLabel}</label>

      <div className="sort-level-controls">
        <div className="sort-level-field">
          <label htmlFor={`sort-column-${level.id}`} className="visually-hidden">
            Column
          </label>
          <select
            id={`sort-column-${level.id}`}
            className="sort-level-select sort-level-column"
            value={level.column}
            onChange={handleColumnChange}
            aria-label="Sort column"
          >
            {columns.map((col) => (
              <option
                key={col.index}
                value={col.index}
                disabled={usedColumns.has(col.index) && col.index !== level.column}
              >
                {col.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sort-level-field">
          <label htmlFor={`sort-order-${level.id}`} className="visually-hidden">
            Order
          </label>
          <select
            id={`sort-order-${level.id}`}
            className="sort-level-select sort-level-order"
            value={level.ascending ? 'asc' : 'desc'}
            onChange={handleOrderChange}
            aria-label="Sort order"
          >
            <option value="asc">A to Z</option>
            <option value="desc">Z to A</option>
          </select>
        </div>

        {canRemove && (
          <button
            type="button"
            className="sort-level-remove"
            onClick={handleRemoveClick}
            onKeyDown={handleRemoveKeyDown}
            aria-label={`Remove ${levelLabel.toLowerCase()} level`}
            title="Remove level"
          >
            <span aria-hidden="true">x</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default SortLevel;
