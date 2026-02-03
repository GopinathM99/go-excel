import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSpreadsheetStore } from '../store/spreadsheet';
import type { Workbook } from '@excel/core';
import {
  VersionHistoryManager,
  createVersionHistoryManager,
  type Version,
  type Author,
  type VersionDiff,
  type AutoSnapshotConfig,
} from '@excel/core';

/**
 * Version with formatted display data
 */
export interface DisplayVersion extends Version {
  /** Formatted timestamp string */
  formattedDate: string;
  /** Relative time string (e.g., "2 hours ago") */
  relativeTime: string;
  /** Whether this is the current/latest version */
  isCurrent: boolean;
}

/**
 * State for version history operations
 */
export interface VersionHistoryState {
  /** List of versions for the current document */
  versions: DisplayVersion[];
  /** Currently selected version for preview */
  selectedVersion: DisplayVersion | null;
  /** Version being compared from (older) */
  compareFromVersion: DisplayVersion | null;
  /** Version being compared to (newer) */
  compareToVersion: DisplayVersion | null;
  /** Current diff result */
  diff: VersionDiff | null;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Whether versions are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether a restore is in progress */
  isRestoring: boolean;
  /** Whether creating a new snapshot */
  isCreatingSnapshot: boolean;
}

/**
 * Actions for version history operations
 */
export interface VersionHistoryActions {
  /** Opens the version history panel */
  openPanel: () => void;
  /** Closes the version history panel */
  closePanel: () => void;
  /** Refreshes the version list */
  refreshVersions: () => void;
  /** Selects a version for preview */
  selectVersion: (versionId: string | null) => void;
  /** Creates a named snapshot */
  createSnapshot: (label?: string) => Promise<Version | null>;
  /** Restores a version */
  restoreVersion: (versionId: string) => Promise<boolean>;
  /** Labels/renames a version */
  labelVersion: (versionId: string, label: string) => void;
  /** Deletes a version */
  deleteVersion: (versionId: string) => void;
  /** Compares two versions */
  compareVersions: (fromId: string, toId: string) => void;
  /** Compares a version with current state */
  compareWithCurrent: (versionId: string) => void;
  /** Clears the comparison */
  clearComparison: () => void;
  /** Gets the preview workbook for a version */
  getPreviewWorkbook: (versionId: string) => Workbook | null;
}

/**
 * Hook result
 */
export interface UseVersionHistoryResult {
  state: VersionHistoryState;
  actions: VersionHistoryActions;
}

/**
 * Formats a timestamp to a human-readable date string
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }) + ` at ${timeStr}`;
  }
}

/**
 * Calculates relative time string
 */
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
}

/**
 * Converts a Version to a DisplayVersion
 */
function toDisplayVersion(version: Version, isCurrent: boolean): DisplayVersion {
  return {
    ...version,
    formattedDate: formatDate(version.timestamp),
    relativeTime: getRelativeTime(version.timestamp),
    isCurrent,
  };
}

// Singleton manager instance (would be replaced with proper dependency injection)
let managerInstance: VersionHistoryManager | null = null;

/**
 * Gets or creates the version history manager instance
 */
function getManager(): VersionHistoryManager {
  if (!managerInstance) {
    managerInstance = createVersionHistoryManager({
      autoSnapshotConfig: {
        enableTimeBasedSnapshots: true,
        timeIntervalMinutes: 30,
        enableChangeBasedSnapshots: true,
        changeThreshold: 100,
        enablePreOperationSnapshots: true,
        debounceMs: 5000,
      },
    });
  }
  return managerInstance;
}

/**
 * Hook for managing version history
 */
export function useVersionHistory(): UseVersionHistoryResult {
  const { workbook, currentUser, updateWorkbook } = useSpreadsheetStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DisplayVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DisplayVersion | null>(null);
  const [compareFromVersion, setCompareFromVersion] = useState<DisplayVersion | null>(null);
  const [compareToVersion, setCompareToVersion] = useState<DisplayVersion | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const manager = useMemo(() => getManager(), []);

  // Get current author from store
  const author: Author = useMemo(() => {
    if (currentUser) {
      return {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      };
    }
    return {
      id: 'anonymous',
      name: 'Anonymous',
    };
  }, [currentUser]);

  /**
   * Loads versions for the current document
   */
  const loadVersions = useCallback(() => {
    if (!workbook?.id) {
      setVersions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rawVersions = manager.getVersions(workbook.id);
      const displayVersions = rawVersions.map((v, index) =>
        toDisplayVersion(v, index === 0)
      );
      setVersions(displayVersions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [workbook?.id, manager]);

  // Load versions when panel opens or document changes
  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, workbook?.id, loadVersions]);

  // Listen for version events
  useEffect(() => {
    const unsubscribe = manager.addEventListener((event) => {
      if (isOpen) {
        loadVersions();
      }
    });
    return unsubscribe;
  }, [manager, isOpen, loadVersions]);

  /**
   * Opens the version history panel
   */
  const openPanel = useCallback(() => {
    setIsOpen(true);
    setError(null);
    setSelectedVersion(null);
    setCompareFromVersion(null);
    setCompareToVersion(null);
    setDiff(null);
  }, []);

  /**
   * Closes the version history panel
   */
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setSelectedVersion(null);
    setCompareFromVersion(null);
    setCompareToVersion(null);
    setDiff(null);
    setError(null);
  }, []);

  /**
   * Refreshes the version list
   */
  const refreshVersions = useCallback(() => {
    loadVersions();
  }, [loadVersions]);

  /**
   * Selects a version for preview
   */
  const selectVersion = useCallback((versionId: string | null) => {
    if (!versionId) {
      setSelectedVersion(null);
      return;
    }

    const version = versions.find((v) => v.id === versionId);
    setSelectedVersion(version ?? null);

    // Clear comparison when selecting a version
    setCompareFromVersion(null);
    setCompareToVersion(null);
    setDiff(null);
  }, [versions]);

  /**
   * Creates a named snapshot
   */
  const createSnapshot = useCallback(async (label?: string): Promise<Version | null> => {
    if (!workbook) {
      setError('No workbook available');
      return null;
    }

    setIsCreatingSnapshot(true);
    setError(null);

    try {
      const version = manager.createSnapshot(workbook, author, label);
      loadVersions();
      return version;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot');
      return null;
    } finally {
      setIsCreatingSnapshot(false);
    }
  }, [workbook, author, manager, loadVersions]);

  /**
   * Restores a version
   */
  const restoreVersion = useCallback(async (versionId: string): Promise<boolean> => {
    if (!workbook) {
      setError('No workbook available');
      return false;
    }

    setIsRestoring(true);
    setError(null);

    try {
      // Create a snapshot of current state before restoring
      manager.createSnapshot(workbook, author, 'Before restore', {
        isAutoSnapshot: true,
        trigger: 'before_operation',
      });

      // Restore the version
      const restored = manager.restoreVersion(versionId);

      // Update the store with restored workbook
      updateWorkbook(restored);

      loadVersions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [workbook, author, manager, updateWorkbook, loadVersions]);

  /**
   * Labels/renames a version
   */
  const labelVersion = useCallback((versionId: string, label: string) => {
    try {
      manager.labelVersion(versionId, label);
      loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename version');
    }
  }, [manager, loadVersions]);

  /**
   * Deletes a version
   */
  const deleteVersion = useCallback((versionId: string) => {
    try {
      manager.deleteVersion(versionId);

      // Clear selection if deleted version was selected
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(null);
      }

      loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    }
  }, [manager, selectedVersion, loadVersions]);

  /**
   * Compares two versions
   */
  const compareVersions = useCallback((fromId: string, toId: string) => {
    try {
      const result = manager.compareVersions(fromId, toId);
      setDiff(result);

      const fromVersion = versions.find((v) => v.id === fromId);
      const toVersion = versions.find((v) => v.id === toId);

      setCompareFromVersion(fromVersion ?? null);
      setCompareToVersion(toVersion ?? null);
      setSelectedVersion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions');
    }
  }, [manager, versions]);

  /**
   * Compares a version with current state
   */
  const compareWithCurrent = useCallback((versionId: string) => {
    if (!workbook) {
      setError('No workbook available');
      return;
    }

    try {
      const result = manager.compareWithCurrent(versionId, workbook);
      setDiff(result);

      const fromVersion = versions.find((v) => v.id === versionId);
      setCompareFromVersion(fromVersion ?? null);
      setCompareToVersion(null); // null indicates current state
      setSelectedVersion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare with current');
    }
  }, [workbook, manager, versions]);

  /**
   * Clears the comparison
   */
  const clearComparison = useCallback(() => {
    setCompareFromVersion(null);
    setCompareToVersion(null);
    setDiff(null);
  }, []);

  /**
   * Gets the preview workbook for a version
   */
  const getPreviewWorkbook = useCallback((versionId: string): Workbook | null => {
    try {
      return manager.restoreVersion(versionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version preview');
      return null;
    }
  }, [manager]);

  const state: VersionHistoryState = {
    versions,
    selectedVersion,
    compareFromVersion,
    compareToVersion,
    diff,
    isOpen,
    isLoading,
    error,
    isRestoring,
    isCreatingSnapshot,
  };

  const actions: VersionHistoryActions = {
    openPanel,
    closePanel,
    refreshVersions,
    selectVersion,
    createSnapshot,
    restoreVersion,
    labelVersion,
    deleteVersion,
    compareVersions,
    compareWithCurrent,
    clearComparison,
    getPreviewWorkbook,
  };

  return { state, actions };
}

/**
 * Tracks changes for auto-snapshot
 */
export function useVersionHistoryChangeTracking() {
  const { workbook, currentUser } = useSpreadsheetStore();
  const manager = useMemo(() => getManager(), []);

  const author: Author = useMemo(() => {
    if (currentUser) {
      return {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      };
    }
    return {
      id: 'anonymous',
      name: 'Anonymous',
    };
  }, [currentUser]);

  /**
   * Tracks a change for auto-snapshot logic
   */
  const trackChange = useCallback(() => {
    if (workbook) {
      manager.trackChange(workbook.id, author, workbook);
    }
  }, [workbook, author, manager]);

  /**
   * Creates a pre-operation snapshot
   */
  const createPreOperationSnapshot = useCallback((operation: string) => {
    if (workbook) {
      return manager.createPreOperationSnapshot(workbook, author, operation);
    }
    return null;
  }, [workbook, author, manager]);

  return {
    trackChange,
    createPreOperationSnapshot,
  };
}
