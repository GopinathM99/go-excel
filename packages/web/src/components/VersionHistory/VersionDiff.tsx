import React, { useState, useMemo } from 'react';
import type { DisplayVersion } from '../../hooks/useVersionHistory';
import type { VersionDiff as VersionDiffType, CellChange, SheetChange } from '@excel/core';
import { columnIndexToLabel } from '@excel/core';
import './VersionHistory.css';

interface VersionDiffProps {
  /** Diff result to display */
  diff: VersionDiffType;
  /** From version (older) */
  fromVersion: DisplayVersion | null;
  /** To version (newer, null means current) */
  toVersion: DisplayVersion | null;
  /** Callback to close diff view */
  onClose: () => void;
  /** Callback to restore the from version */
  onRestoreFrom: () => void;
}

/**
 * Filter options for the diff view
 */
type DiffFilter = 'all' | 'added' | 'removed' | 'modified';

/**
 * Formats a cell address for display
 */
function formatCellAddress(row: number, col: number): string {
  return `${columnIndexToLabel(col)}${row + 1}`;
}

/**
 * VersionDiff - Side-by-side comparison of two versions
 */
export function VersionDiff({
  diff,
  fromVersion,
  toVersion,
  onClose,
  onRestoreFrom,
}: VersionDiffProps) {
  const [filter, setFilter] = useState<DiffFilter>('all');
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  // Get unique sheets from changes
  const sheets = useMemo(() => {
    const sheetSet = new Set<string>();
    for (const change of diff.cellChanges) {
      sheetSet.add(change.sheetName);
    }
    for (const change of diff.sheetChanges) {
      sheetSet.add(change.sheetName);
    }
    return Array.from(sheetSet).sort();
  }, [diff]);

  // Filter cell changes
  const filteredCellChanges = useMemo(() => {
    let changes = diff.cellChanges;

    // Filter by type
    if (filter !== 'all') {
      changes = changes.filter((c) => c.type === filter);
    }

    // Filter by sheet
    if (selectedSheet) {
      changes = changes.filter((c) => c.sheetName === selectedSheet);
    }

    // Sort by sheet, then row, then column
    return changes.sort((a, b) => {
      if (a.sheetName !== b.sheetName) {
        return a.sheetName.localeCompare(b.sheetName);
      }
      if (a.address.row !== b.address.row) {
        return a.address.row - b.address.row;
      }
      return a.address.col - b.address.col;
    });
  }, [diff.cellChanges, filter, selectedSheet]);

  // Filter sheet changes
  const filteredSheetChanges = useMemo(() => {
    if (filter !== 'all') {
      // Map filter to sheet change types
      const typeMap: Record<DiffFilter, SheetChange['type'][]> = {
        all: ['added', 'removed', 'renamed'],
        added: ['added'],
        removed: ['removed'],
        modified: ['renamed'],
      };
      return diff.sheetChanges.filter((s) => typeMap[filter].includes(s.type));
    }
    return diff.sheetChanges;
  }, [diff.sheetChanges, filter]);

  /**
   * Gets the CSS class for a change type
   */
  const getChangeClass = (type: 'added' | 'removed' | 'modified' | 'renamed'): string => {
    switch (type) {
      case 'added':
        return 'version-diff-added';
      case 'removed':
        return 'version-diff-removed';
      case 'modified':
      case 'renamed':
        return 'version-diff-modified';
      default:
        return '';
    }
  };

  /**
   * Gets the icon for a change type
   */
  const getChangeIcon = (type: 'added' | 'removed' | 'modified' | 'renamed'): React.ReactNode => {
    switch (type) {
      case 'added':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        );
      case 'removed':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
          </svg>
        );
      case 'modified':
      case 'renamed':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="version-diff">
      {/* Header */}
      <div className="version-diff-header">
        <button
          className="version-diff-close"
          onClick={onClose}
          aria-label="Close comparison"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="version-diff-title">
          <span>Comparing versions</span>
        </div>
      </div>

      {/* Version comparison header */}
      <div className="version-diff-versions">
        <div className="version-diff-version version-diff-version-from">
          <div className="version-diff-version-label">From</div>
          <div className="version-diff-version-name">
            {fromVersion?.label ?? fromVersion?.formattedDate ?? 'Unknown'}
          </div>
          <div className="version-diff-version-time">
            {fromVersion?.relativeTime}
          </div>
          <button
            className="version-diff-restore-button"
            onClick={onRestoreFrom}
          >
            Restore this version
          </button>
        </div>

        <div className="version-diff-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        <div className="version-diff-version version-diff-version-to">
          <div className="version-diff-version-label">To</div>
          <div className="version-diff-version-name">
            {toVersion?.label ?? toVersion?.formattedDate ?? 'Current version'}
          </div>
          <div className="version-diff-version-time">
            {toVersion?.relativeTime ?? 'Now'}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="version-diff-summary">
        <div className={`version-diff-summary-item ${diff.summary.cellsAdded > 0 ? 'version-diff-added' : ''}`}>
          <span className="version-diff-summary-count">{diff.summary.cellsAdded}</span>
          <span className="version-diff-summary-label">cells added</span>
        </div>
        <div className={`version-diff-summary-item ${diff.summary.cellsModified > 0 ? 'version-diff-modified' : ''}`}>
          <span className="version-diff-summary-count">{diff.summary.cellsModified}</span>
          <span className="version-diff-summary-label">cells modified</span>
        </div>
        <div className={`version-diff-summary-item ${diff.summary.cellsRemoved > 0 ? 'version-diff-removed' : ''}`}>
          <span className="version-diff-summary-count">{diff.summary.cellsRemoved}</span>
          <span className="version-diff-summary-label">cells removed</span>
        </div>
        {(diff.summary.sheetsAdded > 0 || diff.summary.sheetsRemoved > 0 || diff.summary.sheetsRenamed > 0) && (
          <>
            <div className="version-diff-summary-divider" />
            {diff.summary.sheetsAdded > 0 && (
              <div className="version-diff-summary-item version-diff-added">
                <span className="version-diff-summary-count">{diff.summary.sheetsAdded}</span>
                <span className="version-diff-summary-label">sheet{diff.summary.sheetsAdded === 1 ? '' : 's'} added</span>
              </div>
            )}
            {diff.summary.sheetsRemoved > 0 && (
              <div className="version-diff-summary-item version-diff-removed">
                <span className="version-diff-summary-count">{diff.summary.sheetsRemoved}</span>
                <span className="version-diff-summary-label">sheet{diff.summary.sheetsRemoved === 1 ? '' : 's'} removed</span>
              </div>
            )}
            {diff.summary.sheetsRenamed > 0 && (
              <div className="version-diff-summary-item version-diff-modified">
                <span className="version-diff-summary-count">{diff.summary.sheetsRenamed}</span>
                <span className="version-diff-summary-label">sheet{diff.summary.sheetsRenamed === 1 ? '' : 's'} renamed</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="version-diff-filters">
        <div className="version-diff-filter-group">
          <label className="version-diff-filter-label">Show:</label>
          <select
            className="version-diff-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as DiffFilter)}
          >
            <option value="all">All changes</option>
            <option value="added">Added only</option>
            <option value="removed">Removed only</option>
            <option value="modified">Modified only</option>
          </select>
        </div>

        {sheets.length > 1 && (
          <div className="version-diff-filter-group">
            <label className="version-diff-filter-label">Sheet:</label>
            <select
              className="version-diff-filter-select"
              value={selectedSheet ?? ''}
              onChange={(e) => setSelectedSheet(e.target.value || null)}
            >
              <option value="">All sheets</option>
              {sheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="version-diff-checkbox">
          <input
            type="checkbox"
            checked={showOnlyChanges}
            onChange={(e) => setShowOnlyChanges(e.target.checked)}
          />
          <span>Show only changed cells</span>
        </label>
      </div>

      {/* Changes list */}
      <div className="version-diff-changes">
        {/* Sheet changes */}
        {filteredSheetChanges.length > 0 && (
          <div className="version-diff-section">
            <div className="version-diff-section-header">Sheet changes</div>
            {filteredSheetChanges.map((change, index) => (
              <div
                key={`sheet-${index}`}
                className={`version-diff-change ${getChangeClass(change.type)}`}
              >
                <div className="version-diff-change-icon">
                  {getChangeIcon(change.type)}
                </div>
                <div className="version-diff-change-content">
                  <div className="version-diff-change-location">
                    {change.type === 'renamed' ? (
                      <>
                        <span className="version-diff-old-value">{change.oldName}</span>
                        <span className="version-diff-arrow-small">&rarr;</span>
                        <span className="version-diff-new-value">{change.newName}</span>
                      </>
                    ) : (
                      <span>{change.sheetName}</span>
                    )}
                  </div>
                  <div className="version-diff-change-type">
                    Sheet {change.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cell changes */}
        {filteredCellChanges.length > 0 && (
          <div className="version-diff-section">
            <div className="version-diff-section-header">
              Cell changes ({filteredCellChanges.length})
            </div>
            {filteredCellChanges.map((change, index) => (
              <div
                key={`cell-${index}`}
                className={`version-diff-change ${getChangeClass(change.type)}`}
              >
                <div className="version-diff-change-icon">
                  {getChangeIcon(change.type)}
                </div>
                <div className="version-diff-change-content">
                  <div className="version-diff-change-location">
                    <span className="version-diff-sheet-name">{change.sheetName}</span>
                    <span className="version-diff-cell-ref">
                      {formatCellAddress(change.address.row, change.address.col)}
                    </span>
                  </div>
                  <div className="version-diff-change-values">
                    {change.type === 'modified' ? (
                      <>
                        <span className="version-diff-old-value" title={change.oldValue}>
                          {change.oldFormula ?? change.oldValue ?? '(empty)'}
                        </span>
                        <span className="version-diff-arrow-small">&rarr;</span>
                        <span className="version-diff-new-value" title={change.newValue}>
                          {change.newFormula ?? change.newValue ?? '(empty)'}
                        </span>
                      </>
                    ) : change.type === 'added' ? (
                      <span className="version-diff-new-value">
                        {change.newFormula ?? change.newValue ?? '(empty)'}
                      </span>
                    ) : (
                      <span className="version-diff-old-value">
                        {change.oldFormula ?? change.oldValue ?? '(empty)'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredCellChanges.length === 0 && filteredSheetChanges.length === 0 && (
          <div className="version-diff-empty">
            <p>No changes match your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VersionDiff;
