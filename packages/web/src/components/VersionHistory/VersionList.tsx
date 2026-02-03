import React, { useState, useCallback, useRef } from 'react';
import type { DisplayVersion } from '../../hooks/useVersionHistory';
import './VersionHistory.css';

interface VersionListProps {
  /** List of versions to display */
  versions: DisplayVersion[];
  /** Currently selected version ID */
  selectedId: string | null;
  /** Whether versions are loading */
  isLoading: boolean;
  /** Callback when a version is selected */
  onSelect: (versionId: string) => void;
  /** Callback when a version is restored */
  onRestore: (versionId: string) => void;
  /** Callback when a version is renamed */
  onRename: (versionId: string, label: string) => void;
  /** Callback when a version is deleted */
  onDelete: (versionId: string) => void;
  /** Callback when comparing with current */
  onCompareWithCurrent: (versionId: string) => void;
}

/**
 * Context menu for version actions
 */
interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  versionId: string | null;
}

/**
 * Rename dialog state
 */
interface RenameDialogState {
  isOpen: boolean;
  versionId: string | null;
  currentLabel: string;
}

/**
 * VersionList - Displays a scrollable list of versions
 */
export function VersionList({
  versions,
  selectedId,
  isLoading,
  onSelect,
  onRestore,
  onRename,
  onDelete,
  onCompareWithCurrent,
}: VersionListProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    versionId: null,
  });
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    isOpen: false,
    versionId: null,
    currentLabel: '',
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles right-click context menu
   */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, versionId: string) => {
      e.preventDefault();
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        versionId,
      });
    },
    []
  );

  /**
   * Closes the context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Handles clicking outside context menu
   */
  const handleBackdropClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handles restore action
   */
  const handleRestore = useCallback(() => {
    if (contextMenu.versionId) {
      onRestore(contextMenu.versionId);
    }
    closeContextMenu();
  }, [contextMenu.versionId, onRestore, closeContextMenu]);

  /**
   * Opens rename dialog
   */
  const handleOpenRename = useCallback(() => {
    if (contextMenu.versionId) {
      const version = versions.find((v) => v.id === contextMenu.versionId);
      setRenameDialog({
        isOpen: true,
        versionId: contextMenu.versionId,
        currentLabel: version?.label ?? '',
      });
      setTimeout(() => renameInputRef.current?.focus(), 0);
    }
    closeContextMenu();
  }, [contextMenu.versionId, versions, closeContextMenu]);

  /**
   * Handles rename submission
   */
  const handleRenameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (renameDialog.versionId && renameDialog.currentLabel.trim()) {
        onRename(renameDialog.versionId, renameDialog.currentLabel.trim());
      }
      setRenameDialog({ isOpen: false, versionId: null, currentLabel: '' });
    },
    [renameDialog, onRename]
  );

  /**
   * Handles delete confirmation
   */
  const handleDelete = useCallback(() => {
    if (contextMenu.versionId) {
      setConfirmDelete(contextMenu.versionId);
    }
    closeContextMenu();
  }, [contextMenu.versionId, closeContextMenu]);

  /**
   * Confirms deletion
   */
  const handleConfirmDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(confirmDelete);
    }
    setConfirmDelete(null);
  }, [confirmDelete, onDelete]);

  /**
   * Handles compare with current
   */
  const handleCompareWithCurrent = useCallback(() => {
    if (contextMenu.versionId) {
      onCompareWithCurrent(contextMenu.versionId);
    }
    closeContextMenu();
  }, [contextMenu.versionId, onCompareWithCurrent, closeContextMenu]);

  /**
   * Gets the trigger label
   */
  const getTriggerLabel = (version: DisplayVersion): string | null => {
    if (!version.isAutoSnapshot) return null;
    switch (version.trigger) {
      case 'auto_time':
        return 'Auto-saved';
      case 'auto_changes':
        return 'Auto-saved (changes)';
      case 'before_operation':
        return 'Before operation';
      default:
        return 'Auto-saved';
    }
  };

  if (isLoading) {
    return (
      <div className="version-list-loading">
        <div className="version-list-spinner" />
        <span>Loading versions...</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="version-list-empty">
        <div className="version-list-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p>No version history yet</p>
        <p className="version-list-empty-hint">
          Versions are created automatically as you edit,
          or you can save a named version manually.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="version-list">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`version-list-item ${selectedId === version.id ? 'selected' : ''}`}
            onClick={() => onSelect(version.id)}
            onContextMenu={(e) => handleContextMenu(e, version.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelect(version.id);
              }
            }}
          >
            <div className="version-list-item-header">
              <div className="version-list-item-time">
                <span className="version-list-item-date">{version.formattedDate}</span>
                {version.isCurrent && (
                  <span className="version-list-item-badge">Current</span>
                )}
              </div>
            </div>

            {version.label && (
              <div className="version-list-item-label">
                {version.label}
              </div>
            )}

            <div className="version-list-item-meta">
              <div className="version-list-item-author">
                {version.author.avatar ? (
                  <img
                    src={version.author.avatar}
                    alt={version.author.name}
                    className="version-list-item-avatar"
                  />
                ) : (
                  <div className="version-list-item-avatar-placeholder">
                    {version.author.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{version.author.name}</span>
              </div>

              <div className="version-list-item-info">
                {getTriggerLabel(version) && (
                  <span className="version-list-item-trigger">
                    {getTriggerLabel(version)}
                  </span>
                )}
                {version.changeCount > 0 && (
                  <span className="version-list-item-changes">
                    {version.changeCount} change{version.changeCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <>
          <div className="version-context-backdrop" onClick={handleBackdropClick} />
          <div
            className="version-context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="version-context-menu-item"
              onClick={handleRestore}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Restore this version
            </button>
            <button
              className="version-context-menu-item"
              onClick={handleCompareWithCurrent}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="8" height="18" rx="1" />
                <rect x="13" y="3" width="8" height="18" rx="1" />
              </svg>
              Compare with current
            </button>
            <button
              className="version-context-menu-item"
              onClick={handleOpenRename}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Name this version
            </button>
            <div className="version-context-menu-divider" />
            <button
              className="version-context-menu-item version-context-menu-item-danger"
              onClick={handleDelete}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete version
            </button>
          </div>
        </>
      )}

      {/* Rename Dialog */}
      {renameDialog.isOpen && (
        <div className="version-dialog-backdrop">
          <div className="version-dialog">
            <form onSubmit={handleRenameSubmit}>
              <div className="version-dialog-header">
                <h3>Name this version</h3>
              </div>
              <div className="version-dialog-body">
                <input
                  ref={renameInputRef}
                  type="text"
                  className="version-dialog-input"
                  placeholder="Enter a name for this version"
                  value={renameDialog.currentLabel}
                  onChange={(e) =>
                    setRenameDialog((prev) => ({
                      ...prev,
                      currentLabel: e.target.value,
                    }))
                  }
                  maxLength={100}
                />
              </div>
              <div className="version-dialog-footer">
                <button
                  type="button"
                  className="version-dialog-button version-dialog-button-secondary"
                  onClick={() =>
                    setRenameDialog({ isOpen: false, versionId: null, currentLabel: '' })
                  }
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="version-dialog-button version-dialog-button-primary"
                  disabled={!renameDialog.currentLabel.trim()}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="version-dialog-backdrop">
          <div className="version-dialog">
            <div className="version-dialog-header">
              <h3>Delete version?</h3>
            </div>
            <div className="version-dialog-body">
              <p>This version will be permanently deleted. This action cannot be undone.</p>
            </div>
            <div className="version-dialog-footer">
              <button
                type="button"
                className="version-dialog-button version-dialog-button-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="version-dialog-button version-dialog-button-danger"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VersionList;
