import React, { useState, useEffect, useMemo } from 'react';
import type { DisplayVersion } from '../../hooks/useVersionHistory';
import type { Workbook, Sheet, Cell } from '@excel/core';
import { cellAddressKey, columnIndexToLabel } from '@excel/core';
import './VersionHistory.css';

interface VersionPreviewProps {
  /** The version being previewed */
  version: DisplayVersion;
  /** Function to get the workbook data for the version */
  getWorkbook: (versionId: string) => Workbook | null;
  /** Callback when restore is clicked */
  onRestore: (versionId: string) => void;
  /** Callback when compare with current is clicked */
  onCompareWithCurrent: (versionId: string) => void;
  /** Callback when close is clicked */
  onClose: () => void;
  /** Whether restore is in progress */
  isRestoring: boolean;
}

/**
 * Simple cell reference display
 */
function formatCellAddress(row: number, col: number): string {
  return `${columnIndexToLabel(col)}${row + 1}`;
}

/**
 * VersionPreview - Read-only preview of a document at a specific version
 */
export function VersionPreview({
  version,
  getWorkbook,
  onRestore,
  onCompareWithCurrent,
  onClose,
  isRestoring,
}: VersionPreviewProps) {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the workbook when version changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      const wb = getWorkbook(version.id);
      setWorkbook(wb);
      setActiveSheetIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  }, [version.id, getWorkbook]);

  // Get the active sheet
  const activeSheet = useMemo(() => {
    if (!workbook || activeSheetIndex >= workbook.sheets.length) {
      return null;
    }
    return workbook.sheets[activeSheetIndex];
  }, [workbook, activeSheetIndex]);

  // Calculate grid bounds
  const gridBounds = useMemo(() => {
    if (!activeSheet) {
      return { maxRow: 10, maxCol: 5 };
    }

    let maxRow = 0;
    let maxCol = 0;

    for (const cell of activeSheet.cells.values()) {
      maxRow = Math.max(maxRow, cell.address.row);
      maxCol = Math.max(maxCol, cell.address.col);
    }

    // Add some padding
    return {
      maxRow: Math.max(maxRow + 5, 20),
      maxCol: Math.max(maxCol + 3, 10),
    };
  }, [activeSheet]);

  /**
   * Gets a cell value for display
   */
  const getCellDisplay = (sheet: Sheet, row: number, col: number): string => {
    const key = cellAddressKey({ row, col });
    const cell = sheet.cells.get(key);
    if (!cell) return '';

    // For formulas, show the raw formula
    if (cell.content.isFormula) {
      return cell.content.raw;
    }

    return cell.content.raw;
  };

  /**
   * Handles restore click
   */
  const handleRestore = () => {
    onRestore(version.id);
  };

  /**
   * Handles compare click
   */
  const handleCompare = () => {
    onCompareWithCurrent(version.id);
  };

  if (isLoading) {
    return (
      <div className="version-preview">
        <div className="version-preview-header">
          <button
            className="version-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="version-preview-title">Loading preview...</div>
        </div>
        <div className="version-preview-loading">
          <div className="version-list-spinner" />
        </div>
      </div>
    );
  }

  if (error || !workbook || !activeSheet) {
    return (
      <div className="version-preview">
        <div className="version-preview-header">
          <button
            className="version-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="version-preview-title">Preview</div>
        </div>
        <div className="version-preview-error">
          <p>{error ?? 'Failed to load preview'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="version-preview">
      {/* Header */}
      <div className="version-preview-header">
        <button
          className="version-preview-close"
          onClick={onClose}
          aria-label="Close preview"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="version-preview-info">
          <div className="version-preview-title">
            {version.label ?? version.formattedDate}
          </div>
          <div className="version-preview-meta">
            <span className="version-preview-author">{version.author.name}</span>
            <span className="version-preview-time">{version.relativeTime}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="version-preview-actions">
        <button
          className="version-preview-action-button version-preview-action-primary"
          onClick={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <>
              <div className="version-list-spinner version-list-spinner-small" />
              Restoring...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Restore this version
            </>
          )}
        </button>
        <button
          className="version-preview-action-button version-preview-action-secondary"
          onClick={handleCompare}
          disabled={isRestoring}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="8" height="18" rx="1" />
            <rect x="13" y="3" width="8" height="18" rx="1" />
          </svg>
          Compare with current
        </button>
      </div>

      {/* Sheet tabs */}
      {workbook.sheets.length > 1 && (
        <div className="version-preview-tabs">
          {workbook.sheets.map((sheet, index) => (
            <button
              key={sheet.id}
              className={`version-preview-tab ${index === activeSheetIndex ? 'active' : ''}`}
              onClick={() => setActiveSheetIndex(index)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid preview */}
      <div className="version-preview-grid-container">
        <div className="version-preview-grid">
          <table className="version-preview-table">
            <thead>
              <tr>
                <th className="version-preview-cell version-preview-cell-header version-preview-cell-corner"></th>
                {Array.from({ length: gridBounds.maxCol + 1 }, (_, col) => (
                  <th key={col} className="version-preview-cell version-preview-cell-header">
                    {columnIndexToLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: gridBounds.maxRow + 1 }, (_, row) => (
                <tr key={row}>
                  <td className="version-preview-cell version-preview-cell-header">
                    {row + 1}
                  </td>
                  {Array.from({ length: gridBounds.maxCol + 1 }, (_, col) => {
                    const value = getCellDisplay(activeSheet, row, col);
                    return (
                      <td
                        key={col}
                        className={`version-preview-cell ${value ? 'version-preview-cell-filled' : ''}`}
                        title={value ? formatCellAddress(row, col) : undefined}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with version details */}
      <div className="version-preview-footer">
        <div className="version-preview-detail">
          <span className="version-preview-detail-label">Size:</span>
          <span className="version-preview-detail-value">
            {(version.size / 1024).toFixed(1)} KB
          </span>
        </div>
        {version.changeCount > 0 && (
          <div className="version-preview-detail">
            <span className="version-preview-detail-label">Changes:</span>
            <span className="version-preview-detail-value">
              {version.changeCount}
            </span>
          </div>
        )}
        <div className="version-preview-detail">
          <span className="version-preview-detail-label">Sheets:</span>
          <span className="version-preview-detail-value">
            {workbook.sheets.length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default VersionPreview;
