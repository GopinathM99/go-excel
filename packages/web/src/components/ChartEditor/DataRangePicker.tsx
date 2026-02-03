import React, { useCallback, useState, useMemo } from 'react';
import { parseRangeReference, formatRangeReference } from '@excel/core';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import './ChartEditor.css';

/**
 * Props for DataRangePicker
 */
interface DataRangePickerProps {
  dataRange: string;
  seriesInRows: boolean;
  firstRowIsLabels: boolean;
  firstColIsLabels: boolean;
  onDataRangeChange: (range: string) => void;
  onSeriesInRowsChange: (value: boolean) => void;
  onFirstRowIsLabelsChange: (value: boolean) => void;
  onFirstColIsLabelsChange: (value: boolean) => void;
  error?: string;
  onStartRangeSelection: () => void;
  isRangeSelectionMode: boolean;
}

/**
 * DataRangePicker - Select and configure chart data range
 */
export function DataRangePicker({
  dataRange,
  seriesInRows,
  firstRowIsLabels,
  firstColIsLabels,
  onDataRangeChange,
  onSeriesInRowsChange,
  onFirstRowIsLabelsChange,
  onFirstColIsLabelsChange,
  error,
  onStartRangeSelection,
  isRangeSelectionMode,
}: DataRangePickerProps) {
  const [localRange, setLocalRange] = useState(dataRange);
  const cells = useSpreadsheetStore((state) => state.cells);
  const selectionRange = useSpreadsheetStore((state) => state.selectionRange);
  const selectedCell = useSpreadsheetStore((state) => state.selectedCell);

  // Update local range when prop changes
  React.useEffect(() => {
    setLocalRange(dataRange);
  }, [dataRange]);

  // Handle range input change
  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase();
      setLocalRange(value);
    },
    []
  );

  // Handle range input blur - validate and update
  const handleRangeBlur = useCallback(() => {
    onDataRangeChange(localRange);
  }, [localRange, onDataRangeChange]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onDataRangeChange(localRange);
      }
    },
    [localRange, onDataRangeChange]
  );

  // Use current selection
  const handleUseSelection = useCallback(() => {
    let range = '';
    if (selectionRange) {
      range = formatRangeReference({
        start: selectionRange.start,
        end: selectionRange.end,
      });
    } else if (selectedCell) {
      range = formatRangeReference({
        start: selectedCell,
        end: selectedCell,
      });
    }
    if (range) {
      setLocalRange(range);
      onDataRangeChange(range);
    }
  }, [selectionRange, selectedCell, onDataRangeChange]);

  // Parse range for preview
  const parsedRange = useMemo(() => {
    return parseRangeReference(localRange);
  }, [localRange]);

  // Get preview data
  const previewData = useMemo(() => {
    if (!parsedRange) return null;

    const rows: string[][] = [];
    const maxPreviewRows = 5;
    const maxPreviewCols = 5;

    const rowCount = Math.min(
      parsedRange.end.row - parsedRange.start.row + 1,
      maxPreviewRows
    );
    const colCount = Math.min(
      parsedRange.end.col - parsedRange.start.col + 1,
      maxPreviewCols
    );

    for (let r = 0; r < rowCount; r++) {
      const row: string[] = [];
      for (let c = 0; c < colCount; c++) {
        const key = `${parsedRange.start.row + r},${parsedRange.start.col + c}`;
        const cellData = cells.get(key);
        row.push(cellData?.value || '');
      }
      rows.push(row);
    }

    const hasMoreRows = parsedRange.end.row - parsedRange.start.row + 1 > maxPreviewRows;
    const hasMoreCols = parsedRange.end.col - parsedRange.start.col + 1 > maxPreviewCols;

    return { rows, hasMoreRows, hasMoreCols };
  }, [parsedRange, cells]);

  // Determine row/column roles for preview highlighting
  const getCellRole = useCallback(
    (rowIndex: number, colIndex: number): 'label' | 'series-name' | 'data' | 'header' => {
      const isFirstRow = rowIndex === 0;
      const isFirstCol = colIndex === 0;

      if (isFirstRow && isFirstCol && firstRowIsLabels && firstColIsLabels) {
        return 'header';
      }
      if (isFirstRow && firstRowIsLabels) {
        return seriesInRows ? 'label' : 'series-name';
      }
      if (isFirstCol && firstColIsLabels) {
        return seriesInRows ? 'series-name' : 'label';
      }
      return 'data';
    },
    [seriesInRows, firstRowIsLabels, firstColIsLabels]
  );

  return (
    <div className="data-range-picker">
      <div className="data-range-picker__section">
        <h4 className="data-range-picker__heading">Data Range</h4>

        <div className="data-range-picker__input-group">
          <input
            type="text"
            className={`data-range-picker__input ${error ? 'data-range-picker__input--error' : ''}`}
            value={localRange}
            onChange={handleRangeChange}
            onBlur={handleRangeBlur}
            onKeyDown={handleKeyDown}
            placeholder="e.g., A1:D10"
            spellCheck={false}
          />
          <button
            type="button"
            className="data-range-picker__select-btn"
            onClick={handleUseSelection}
            title="Use current selection"
          >
            <SelectionIcon />
            Use Selection
          </button>
          <button
            type="button"
            className={`data-range-picker__pick-btn ${isRangeSelectionMode ? 'data-range-picker__pick-btn--active' : ''}`}
            onClick={onStartRangeSelection}
            title="Select range from sheet"
          >
            <PickerIcon />
          </button>
        </div>

        {error && <span className="data-range-picker__error">{error}</span>}

        {parsedRange && (
          <span className="data-range-picker__info">
            {parsedRange.end.row - parsedRange.start.row + 1} rows x{' '}
            {parsedRange.end.col - parsedRange.start.col + 1} columns
          </span>
        )}
      </div>

      <div className="data-range-picker__section">
        <h4 className="data-range-picker__heading">Data Layout</h4>

        <div className="data-range-picker__toggle-group">
          <span className="data-range-picker__toggle-label">Series in:</span>
          <div className="data-range-picker__toggle-buttons">
            <button
              type="button"
              className={`data-range-picker__toggle-btn ${!seriesInRows ? 'data-range-picker__toggle-btn--active' : ''}`}
              onClick={() => onSeriesInRowsChange(false)}
            >
              <ColumnsIcon />
              Columns
            </button>
            <button
              type="button"
              className={`data-range-picker__toggle-btn ${seriesInRows ? 'data-range-picker__toggle-btn--active' : ''}`}
              onClick={() => onSeriesInRowsChange(true)}
            >
              <RowsIcon />
              Rows
            </button>
          </div>
        </div>

        <div className="data-range-picker__checkbox-group">
          <label className="data-range-picker__checkbox-label">
            <input
              type="checkbox"
              checked={firstRowIsLabels}
              onChange={(e) => onFirstRowIsLabelsChange(e.target.checked)}
            />
            <span>First row as labels</span>
          </label>

          <label className="data-range-picker__checkbox-label">
            <input
              type="checkbox"
              checked={firstColIsLabels}
              onChange={(e) => onFirstColIsLabelsChange(e.target.checked)}
            />
            <span>First column as labels</span>
          </label>
        </div>
      </div>

      {previewData && previewData.rows.length > 0 && (
        <div className="data-range-picker__section">
          <h4 className="data-range-picker__heading">Data Preview</h4>

          <div className="data-range-picker__preview-legend">
            <span className="data-range-picker__legend-item data-range-picker__legend-item--header">
              Header
            </span>
            <span className="data-range-picker__legend-item data-range-picker__legend-item--label">
              Category Labels
            </span>
            <span className="data-range-picker__legend-item data-range-picker__legend-item--series">
              Series Names
            </span>
            <span className="data-range-picker__legend-item data-range-picker__legend-item--data">
              Data Values
            </span>
          </div>

          <div className="data-range-picker__preview-table-wrapper">
            <table className="data-range-picker__preview-table">
              <tbody>
                {previewData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, colIndex) => {
                      const role = getCellRole(rowIndex, colIndex);
                      return (
                        <td
                          key={colIndex}
                          className={`data-range-picker__preview-cell data-range-picker__preview-cell--${role}`}
                        >
                          {cell || '\u00A0'}
                        </td>
                      );
                    })}
                    {previewData.hasMoreCols && rowIndex === 0 && (
                      <td className="data-range-picker__preview-cell data-range-picker__preview-cell--more">
                        ...
                      </td>
                    )}
                  </tr>
                ))}
                {previewData.hasMoreRows && (
                  <tr>
                    <td
                      colSpan={previewData.rows[0]?.length || 1}
                      className="data-range-picker__preview-cell data-range-picker__preview-cell--more"
                    >
                      ...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons

function SelectionIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <rect x="1" y="1" width="6" height="6" rx="0.5" opacity="0.4" />
      <rect x="9" y="1" width="6" height="6" rx="0.5" opacity="0.4" />
      <rect x="1" y="9" width="6" height="6" rx="0.5" opacity="0.4" />
      <rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function PickerIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="6" y1="2" x2="6" y2="14" />
    </svg>
  );
}

function ColumnsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <rect x="2" y="2" width="4" height="12" rx="0.5" opacity="0.7" />
      <rect x="8" y="2" width="4" height="12" rx="0.5" opacity="0.7" />
    </svg>
  );
}

function RowsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <rect x="2" y="2" width="12" height="4" rx="0.5" opacity="0.7" />
      <rect x="2" y="8" width="12" height="4" rx="0.5" opacity="0.7" />
    </svg>
  );
}

export default DataRangePicker;
