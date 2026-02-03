import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VersionList } from './VersionList';
import { VersionPreview } from './VersionPreview';
import { VersionDiff } from './VersionDiff';
import { useVersionHistory } from '../../hooks/useVersionHistory';
import './VersionHistory.css';

/**
 * Props for the VersionHistory panel
 */
interface VersionHistoryProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when the panel is closed */
  onClose: () => void;
}

/**
 * View mode for the panel
 */
type ViewMode = 'list' | 'preview' | 'diff';

/**
 * VersionHistory - Main version history panel component
 *
 * Provides a Google Docs-style version history interface including:
 * - List of all versions with timestamps and authors
 * - Preview mode for viewing past versions
 * - Diff mode for comparing versions
 * - Actions for restore, rename, and delete
 */
export function VersionHistory({ isOpen, onClose }: VersionHistoryProps) {
  const { state, actions } = useVersionHistory();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [nameInput, setNameInput] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync open state with hook
  useEffect(() => {
    if (isOpen && !state.isOpen) {
      actions.openPanel();
    } else if (!isOpen && state.isOpen) {
      actions.closePanel();
    }
  }, [isOpen, state.isOpen, actions]);

  // Update view mode based on state
  useEffect(() => {
    if (state.diff) {
      setViewMode('diff');
    } else if (state.selectedVersion) {
      setViewMode('preview');
    } else {
      setViewMode('list');
    }
  }, [state.diff, state.selectedVersion]);

  /**
   * Handles creating a new snapshot
   */
  const handleSaveVersion = useCallback(async () => {
    if (nameInput.trim()) {
      await actions.createSnapshot(nameInput.trim());
      setNameInput('');
      setShowNameDialog(false);
    } else {
      setShowNameDialog(true);
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [nameInput, actions]);

  /**
   * Handles quick save without name
   */
  const handleQuickSave = useCallback(async () => {
    await actions.createSnapshot();
  }, [actions]);

  /**
   * Handles save with name submission
   */
  const handleNameSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      await actions.createSnapshot(nameInput.trim());
      setNameInput('');
      setShowNameDialog(false);
    }
  }, [nameInput, actions]);

  /**
   * Handles selecting a version for preview
   */
  const handleSelectVersion = useCallback((versionId: string) => {
    actions.selectVersion(versionId);
  }, [actions]);

  /**
   * Handles restoring a version
   */
  const handleRestore = useCallback(async (versionId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to restore this version? Your current changes will be saved as a new version.'
    );
    if (confirmed) {
      await actions.restoreVersion(versionId);
      onClose();
    }
  }, [actions, onClose]);

  /**
   * Handles closing preview
   */
  const handleClosePreview = useCallback(() => {
    actions.selectVersion(null);
    setViewMode('list');
  }, [actions]);

  /**
   * Handles closing diff
   */
  const handleCloseDiff = useCallback(() => {
    actions.clearComparison();
    setViewMode('list');
  }, [actions]);

  /**
   * Handles comparing with current
   */
  const handleCompareWithCurrent = useCallback((versionId: string) => {
    actions.compareWithCurrent(versionId);
  }, [actions]);

  /**
   * Handles keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        if (viewMode === 'preview') {
          handleClosePreview();
        } else if (viewMode === 'diff') {
          handleCloseDiff();
        } else if (showNameDialog) {
          setShowNameDialog(false);
          setNameInput('');
        } else {
          onClose();
        }
      }

      // Ctrl+S to save version when panel is open
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isOpen) {
        e.preventDefault();
        handleSaveVersion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, showNameDialog, onClose, handleClosePreview, handleCloseDiff, handleSaveVersion]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="version-history-panel">
      {/* Header */}
      <div className="version-history-header">
        <h2 className="version-history-title">Version history</h2>
        <button
          className="version-history-close"
          onClick={onClose}
          aria-label="Close version history"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Actions */}
      {viewMode === 'list' && (
        <div className="version-history-actions">
          {showNameDialog ? (
            <form onSubmit={handleNameSubmit} style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <input
                ref={nameInputRef}
                type="text"
                className="version-dialog-input"
                placeholder="Version name (optional)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="version-history-save-button"
                disabled={state.isCreatingSnapshot}
                style={{ flex: 'none', minWidth: '60px' }}
              >
                {state.isCreatingSnapshot ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="version-dialog-button version-dialog-button-secondary"
                onClick={() => {
                  setShowNameDialog(false);
                  setNameInput('');
                }}
                style={{ flex: 'none', padding: '8px 12px' }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              className="version-history-save-button"
              onClick={handleSaveVersion}
              disabled={state.isCreatingSnapshot}
            >
              {state.isCreatingSnapshot ? (
                <>
                  <div className="version-list-spinner version-list-spinner-small" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Save current version
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="version-history-content">
        {/* Error display */}
        {state.error && (
          <div className="version-history-error">
            {state.error}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <VersionList
            versions={state.versions}
            selectedId={state.selectedVersion?.id ?? null}
            isLoading={state.isLoading}
            onSelect={handleSelectVersion}
            onRestore={handleRestore}
            onRename={actions.labelVersion}
            onDelete={actions.deleteVersion}
            onCompareWithCurrent={handleCompareWithCurrent}
          />
        )}

        {/* Preview view */}
        {viewMode === 'preview' && state.selectedVersion && (
          <VersionPreview
            version={state.selectedVersion}
            getWorkbook={actions.getPreviewWorkbook}
            onRestore={handleRestore}
            onCompareWithCurrent={handleCompareWithCurrent}
            onClose={handleClosePreview}
            isRestoring={state.isRestoring}
          />
        )}

        {/* Diff view */}
        {viewMode === 'diff' && state.diff && (
          <VersionDiff
            diff={state.diff}
            fromVersion={state.compareFromVersion}
            toVersion={state.compareToVersion}
            onClose={handleCloseDiff}
            onRestoreFrom={() => {
              if (state.compareFromVersion) {
                handleRestore(state.compareFromVersion.id);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// Re-export components
export { VersionList } from './VersionList';
export { VersionPreview } from './VersionPreview';
export { VersionDiff } from './VersionDiff';

// Re-export hook
export { useVersionHistory, useVersionHistoryChangeTracking } from '../../hooks/useVersionHistory';
export type {
  DisplayVersion,
  VersionHistoryState,
  VersionHistoryActions,
  UseVersionHistoryResult,
} from '../../hooks/useVersionHistory';

export default VersionHistory;
