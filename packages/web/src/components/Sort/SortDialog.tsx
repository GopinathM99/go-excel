import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SortLevel } from './SortLevel';
import { useSort, type SortConfig, type ColumnOption } from '../../hooks/useSort';
import type { CellRange } from '@excel/core';
import { formatRangeReference } from '@excel/core';
import './SortDialog.css';

interface SortDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Callback when sort is executed successfully */
  onSort?: () => void;
}

/**
 * Modal dialog for configuring multi-column sort operations
 */
export function SortDialog({ isOpen, onClose, onSort }: SortDialogProps) {
  const {
    getSortRange,
    getColumnOptions,
    createDefaultConfig,
    addSortLevel,
    removeSortLevel,
    updateSortLevel,
    validateConfig,
    executeSort,
  } = useSort();

  const [config, setConfig] = useState<SortConfig>(createDefaultConfig);
  const [range, setRange] = useState<CellRange | null>(null);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      const sortRange = getSortRange();
      if (sortRange) {
        setRange(sortRange);
        const newConfig = createDefaultConfig();
        setConfig(newConfig);
        setColumns(getColumnOptions(sortRange, newConfig.hasHeader));
        setError(null);
      } else {
        setError('Please select a range to sort');
      }
    }
  }, [isOpen, getSortRange, getColumnOptions, createDefaultConfig]);

  // Update column options when hasHeader changes
  useEffect(() => {
    if (range) {
      setColumns(getColumnOptions(range, config.hasHeader));
    }
  }, [range, config.hasHeader, getColumnOptions]);

  // Focus management
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSort();
      }
    },
    [onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle header checkbox change
  const handleHeaderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, hasHeader: e.target.checked }));
    },
    []
  );

  // Handle add level
  const handleAddLevel = useCallback(() => {
    setConfig((prev) => addSortLevel(prev, columns.length));
  }, [addSortLevel, columns.length]);

  // Handle remove level
  const handleRemoveLevel = useCallback(
    (levelId: string) => {
      setConfig((prev) => removeSortLevel(prev, levelId));
    },
    [removeSortLevel]
  );

  // Handle column change
  const handleColumnChange = useCallback(
    (levelId: string, column: number) => {
      setConfig((prev) => updateSortLevel(prev, levelId, { column }));
    },
    [updateSortLevel]
  );

  // Handle order change
  const handleOrderChange = useCallback(
    (levelId: string, ascending: boolean) => {
      setConfig((prev) => updateSortLevel(prev, levelId, { ascending }));
    },
    [updateSortLevel]
  );

  // Handle sort execution
  const handleSort = useCallback(() => {
    if (!range) {
      setError('No range selected');
      return;
    }

    const validation = validateConfig(config, range);
    if (!validation.valid) {
      setError(validation.error || 'Invalid sort configuration');
      return;
    }

    setIsExecuting(true);
    setError(null);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const result = executeSort(config, range);
      setIsExecuting(false);

      if (result.success) {
        onSort?.();
        onClose();
      } else {
        setError(result.error || 'Sort failed');
      }
    }, 0);
  }, [range, config, validateConfig, executeSort, onSort, onClose]);

  // Get used columns for disabling duplicates
  const usedColumns = new Set(config.levels.map((l) => l.column));

  // Determine if we can add more levels
  const canAddLevel = config.levels.length < 4 && config.levels.length < columns.length;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="sort-dialog-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="sort-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sort-dialog-title"
      >
        <div className="sort-dialog-header">
          <h2 id="sort-dialog-title" className="sort-dialog-title">
            Sort
          </h2>
          <button
            type="button"
            className="sort-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>

        <div className="sort-dialog-body">
          {range && (
            <div className="sort-dialog-range">
              <span className="sort-dialog-range-label">Range:</span>
              <span className="sort-dialog-range-value">
                {formatRangeReference(range)}
              </span>
            </div>
          )}

          {error && (
            <div className="sort-dialog-error" role="alert">
              {error}
            </div>
          )}

          <div className="sort-dialog-options">
            <label className="sort-dialog-checkbox">
              <input
                ref={firstFocusableRef}
                type="checkbox"
                checked={config.hasHeader}
                onChange={handleHeaderChange}
              />
              <span>My data has headers</span>
            </label>
          </div>

          <div className="sort-dialog-levels">
            {config.levels.map((level, index) => (
              <SortLevel
                key={level.id}
                level={level}
                columns={columns}
                index={index}
                canRemove={config.levels.length > 1}
                usedColumns={usedColumns}
                onColumnChange={(column) => handleColumnChange(level.id, column)}
                onOrderChange={(ascending) => handleOrderChange(level.id, ascending)}
                onRemove={() => handleRemoveLevel(level.id)}
              />
            ))}
          </div>

          {canAddLevel && (
            <button
              type="button"
              className="sort-dialog-add-level"
              onClick={handleAddLevel}
            >
              <span aria-hidden="true">+</span>
              Add Level
            </button>
          )}
        </div>

        <div className="sort-dialog-footer">
          <button
            type="button"
            className="sort-dialog-button sort-dialog-button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="sort-dialog-button sort-dialog-button-primary"
            onClick={handleSort}
            disabled={isExecuting || !range}
          >
            {isExecuting ? 'Sorting...' : 'Sort'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SortDialog;
