/**
 * VersionHistory - Version history management for spreadsheet documents
 *
 * This module provides version history capabilities including:
 * - Creating snapshots of document state
 * - Restoring previous versions
 * - Comparing versions (diff)
 * - Auto-snapshot logic based on activity
 */

import type { Workbook } from '../models/Workbook';
import type { Sheet } from '../models/Sheet';
import type { Cell } from '../models/Cell';
import type { CellAddress } from '../models/CellAddress';
import { cellAddressKey } from '../models/CellAddress';

/**
 * Author information for version attribution
 */
export interface Author {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Represents a single version/snapshot of a document
 */
export interface Version {
  /** Unique identifier for this version */
  id: string;
  /** Document ID this version belongs to */
  documentId: string;
  /** Unix timestamp when this version was created */
  timestamp: number;
  /** Author who created this version */
  author: Author;
  /** Optional user-provided label/name for this version */
  label?: string;
  /** Serialized document state (JSON) */
  snapshot: string;
  /** Number of changes since the last version */
  changeCount: number;
  /** Size of the snapshot in bytes */
  size: number;
  /** Whether this is an auto-generated snapshot */
  isAutoSnapshot: boolean;
  /** Description of what triggered this snapshot */
  trigger?: 'manual' | 'auto_time' | 'auto_changes' | 'before_operation';
}

/**
 * Cell change information for version diff
 */
export interface CellChange {
  /** Cell address */
  address: CellAddress;
  /** Sheet ID */
  sheetId: string;
  /** Sheet name */
  sheetName: string;
  /** Type of change */
  type: 'added' | 'removed' | 'modified';
  /** Old value (for modified/removed) */
  oldValue?: string;
  /** New value (for added/modified) */
  newValue?: string;
  /** Old formula (for modified/removed) */
  oldFormula?: string;
  /** New formula (for added/modified) */
  newFormula?: string;
}

/**
 * Sheet-level change information
 */
export interface SheetChange {
  /** Sheet ID */
  sheetId: string;
  /** Sheet name */
  sheetName: string;
  /** Type of change */
  type: 'added' | 'removed' | 'renamed';
  /** Old name (for renamed) */
  oldName?: string;
  /** New name (for renamed/added) */
  newName?: string;
}

/**
 * Version diff result
 */
export interface VersionDiff {
  /** Version being compared from */
  fromVersionId: string;
  /** Version being compared to */
  toVersionId: string;
  /** Timestamp of comparison */
  timestamp: number;
  /** Cell-level changes */
  cellChanges: CellChange[];
  /** Sheet-level changes */
  sheetChanges: SheetChange[];
  /** Summary statistics */
  summary: {
    cellsAdded: number;
    cellsRemoved: number;
    cellsModified: number;
    sheetsAdded: number;
    sheetsRemoved: number;
    sheetsRenamed: number;
  };
}

/**
 * Auto-snapshot configuration
 */
export interface AutoSnapshotConfig {
  /** Enable auto-snapshots based on time */
  enableTimeBasedSnapshots: boolean;
  /** Interval in minutes for time-based snapshots (default: 30) */
  timeIntervalMinutes: number;
  /** Enable auto-snapshots based on change count */
  enableChangeBasedSnapshots: boolean;
  /** Number of changes to trigger a snapshot (default: 100) */
  changeThreshold: number;
  /** Enable snapshots before major operations */
  enablePreOperationSnapshots: boolean;
  /** Debounce rapid changes in milliseconds (default: 5000) */
  debounceMs: number;
}

/**
 * Default auto-snapshot configuration
 */
export const DEFAULT_AUTO_SNAPSHOT_CONFIG: AutoSnapshotConfig = {
  enableTimeBasedSnapshots: true,
  timeIntervalMinutes: 30,
  enableChangeBasedSnapshots: true,
  changeThreshold: 100,
  enablePreOperationSnapshots: true,
  debounceMs: 5000,
};

/**
 * Options for VersionHistoryManager
 */
export interface VersionHistoryManagerOptions {
  /** Function to generate unique IDs */
  generateId?: () => string;
  /** Auto-snapshot configuration */
  autoSnapshotConfig?: Partial<AutoSnapshotConfig>;
  /** Maximum number of versions to keep per document */
  maxVersionsPerDocument?: number;
  /** Maximum age of versions in days (older versions are cleaned up) */
  maxVersionAgeDays?: number;
}

/**
 * Event types for version history
 */
export type VersionHistoryEventType =
  | 'versionCreated'
  | 'versionDeleted'
  | 'versionRestored'
  | 'versionLabeled';

/**
 * Version history event
 */
export interface VersionHistoryEvent {
  type: VersionHistoryEventType;
  version?: Version;
  versionId?: string;
  label?: string;
}

/**
 * Callback for version history events
 */
export type VersionHistoryEventCallback = (event: VersionHistoryEvent) => void;

/**
 * Serialized workbook snapshot
 */
interface SerializedWorkbook {
  id: string;
  name: string;
  sheets: SerializedSheet[];
  activeSheetIndex: number;
  namedRanges: Array<{
    name: string;
    reference: string;
    scope?: string;
    comment?: string;
  }>;
  calcMode: 'auto' | 'manual' | 'autoExceptTables';
}

/**
 * Serialized sheet
 */
interface SerializedSheet {
  id: string;
  name: string;
  cells: Array<{
    key: string;
    address: CellAddress;
    raw: string;
    isFormula: boolean;
    style?: string;
  }>;
  columnWidths: Array<[number, number]>;
  rowHeights: Array<[number, number]>;
  hiddenColumns: number[];
  hiddenRows: number[];
  mergedRegions: Array<{ range: { start: CellAddress; end: CellAddress } }>;
  zoom: number;
  showGridlines: boolean;
  showHeaders: boolean;
  hidden?: boolean;
  tabColor?: string;
}

/**
 * VersionHistoryManager - Manages version history for documents
 */
export class VersionHistoryManager {
  private versions: Map<string, Version> = new Map();
  private documentVersions: Map<string, string[]> = new Map();
  private options: Required<VersionHistoryManagerOptions>;
  private autoSnapshotConfig: AutoSnapshotConfig;
  private eventListeners: Set<VersionHistoryEventCallback> = new Set();

  // Auto-snapshot tracking
  private changeCounters: Map<string, number> = new Map();
  private lastSnapshotTimes: Map<string, number> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private activityTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * Creates a new VersionHistoryManager
   */
  constructor(options: VersionHistoryManagerOptions = {}) {
    this.options = {
      generateId: options.generateId ?? (() => `v-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
      autoSnapshotConfig: options.autoSnapshotConfig ?? {},
      maxVersionsPerDocument: options.maxVersionsPerDocument ?? 100,
      maxVersionAgeDays: options.maxVersionAgeDays ?? 30,
    };

    this.autoSnapshotConfig = {
      ...DEFAULT_AUTO_SNAPSHOT_CONFIG,
      ...options.autoSnapshotConfig,
    };
  }

  /**
   * Creates a snapshot of the current document state
   */
  createSnapshot(
    doc: Workbook,
    author: Author,
    label?: string,
    options: {
      isAutoSnapshot?: boolean;
      trigger?: Version['trigger'];
    } = {}
  ): Version {
    const snapshot = this.serializeWorkbook(doc);
    const snapshotStr = JSON.stringify(snapshot);

    const version: Version = {
      id: this.options.generateId(),
      documentId: doc.id,
      timestamp: Date.now(),
      author: { ...author },
      label,
      snapshot: snapshotStr,
      changeCount: this.changeCounters.get(doc.id) ?? 0,
      size: new Blob([snapshotStr]).size,
      isAutoSnapshot: options.isAutoSnapshot ?? false,
      trigger: options.trigger ?? 'manual',
    };

    // Store the version
    this.versions.set(version.id, version);

    // Update document versions index
    const docVersions = this.documentVersions.get(doc.id) ?? [];
    docVersions.push(version.id);
    this.documentVersions.set(doc.id, docVersions);

    // Reset change counter
    this.changeCounters.set(doc.id, 0);
    this.lastSnapshotTimes.set(doc.id, Date.now());

    // Cleanup old versions if needed
    this.cleanupVersions(doc.id);

    // Emit event
    this.emitEvent({ type: 'versionCreated', version });

    return version;
  }

  /**
   * Gets all versions for a document
   */
  getVersions(documentId: string): Version[] {
    const versionIds = this.documentVersions.get(documentId) ?? [];
    return versionIds
      .map((id) => this.versions.get(id))
      .filter((v): v is Version => v !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  /**
   * Gets a single version by ID
   */
  getVersion(versionId: string): Version | null {
    return this.versions.get(versionId) ?? null;
  }

  /**
   * Restores a document to a previous version
   */
  restoreVersion(versionId: string): Workbook {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version with ID ${versionId} does not exist`);
    }

    const workbook = this.deserializeWorkbook(version.snapshot);

    // Emit event
    this.emitEvent({ type: 'versionRestored', version });

    return workbook;
  }

  /**
   * Deletes a version
   */
  deleteVersion(versionId: string): void {
    const version = this.versions.get(versionId);
    if (!version) {
      return;
    }

    // Remove from versions map
    this.versions.delete(versionId);

    // Remove from document versions index
    const docVersions = this.documentVersions.get(version.documentId);
    if (docVersions) {
      const index = docVersions.indexOf(versionId);
      if (index !== -1) {
        docVersions.splice(index, 1);
      }
    }

    // Emit event
    this.emitEvent({ type: 'versionDeleted', versionId });
  }

  /**
   * Labels/renames a version
   */
  labelVersion(versionId: string, label: string): void {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version with ID ${versionId} does not exist`);
    }

    version.label = label;

    // Emit event
    this.emitEvent({ type: 'versionLabeled', version, label });
  }

  /**
   * Compares two versions and returns the diff
   */
  compareVersions(v1Id: string, v2Id: string): VersionDiff {
    const v1 = this.versions.get(v1Id);
    const v2 = this.versions.get(v2Id);

    if (!v1) {
      throw new Error(`Version with ID ${v1Id} does not exist`);
    }
    if (!v2) {
      throw new Error(`Version with ID ${v2Id} does not exist`);
    }

    const wb1 = this.deserializeWorkbook(v1.snapshot);
    const wb2 = this.deserializeWorkbook(v2.snapshot);

    return this.computeDiff(wb1, wb2, v1Id, v2Id);
  }

  /**
   * Compares a version with current workbook state
   */
  compareWithCurrent(versionId: string, currentWorkbook: Workbook): VersionDiff {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version with ID ${versionId} does not exist`);
    }

    const oldWorkbook = this.deserializeWorkbook(version.snapshot);
    return this.computeDiff(oldWorkbook, currentWorkbook, versionId, 'current');
  }

  /**
   * Tracks a change for auto-snapshot logic
   */
  trackChange(documentId: string, author: Author, workbook: Workbook): void {
    const currentCount = (this.changeCounters.get(documentId) ?? 0) + 1;
    this.changeCounters.set(documentId, currentCount);

    // Clear any existing debounce timer
    const existingTimer = this.debounceTimers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up debounced check for auto-snapshot
    const timer = setTimeout(() => {
      this.checkAutoSnapshot(documentId, author, workbook);
    }, this.autoSnapshotConfig.debounceMs);
    this.debounceTimers.set(documentId, timer);
  }

  /**
   * Creates a snapshot before a major operation
   */
  createPreOperationSnapshot(
    doc: Workbook,
    author: Author,
    operation: string
  ): Version | null {
    if (!this.autoSnapshotConfig.enablePreOperationSnapshots) {
      return null;
    }

    return this.createSnapshot(doc, author, `Before ${operation}`, {
      isAutoSnapshot: true,
      trigger: 'before_operation',
    });
  }

  /**
   * Starts activity-based time tracking for a document
   */
  startActivityTracking(documentId: string, author: Author, getWorkbook: () => Workbook): void {
    // Clear any existing timer
    this.stopActivityTracking(documentId);

    if (!this.autoSnapshotConfig.enableTimeBasedSnapshots) {
      return;
    }

    const intervalMs = this.autoSnapshotConfig.timeIntervalMinutes * 60 * 1000;

    const timer = setInterval(() => {
      const lastSnapshot = this.lastSnapshotTimes.get(documentId) ?? 0;
      const changeCount = this.changeCounters.get(documentId) ?? 0;

      // Only create time-based snapshot if there have been changes
      if (changeCount > 0 && Date.now() - lastSnapshot >= intervalMs) {
        const workbook = getWorkbook();
        this.createSnapshot(workbook, author, undefined, {
          isAutoSnapshot: true,
          trigger: 'auto_time',
        });
      }
    }, intervalMs);

    this.activityTimers.set(documentId, timer);
  }

  /**
   * Stops activity tracking for a document
   */
  stopActivityTracking(documentId: string): void {
    const timer = this.activityTimers.get(documentId);
    if (timer) {
      clearInterval(timer);
      this.activityTimers.delete(documentId);
    }
  }

  /**
   * Gets the auto-snapshot configuration
   */
  getAutoSnapshotConfig(): AutoSnapshotConfig {
    return { ...this.autoSnapshotConfig };
  }

  /**
   * Updates the auto-snapshot configuration
   */
  setAutoSnapshotConfig(config: Partial<AutoSnapshotConfig>): void {
    this.autoSnapshotConfig = {
      ...this.autoSnapshotConfig,
      ...config,
    };
  }

  /**
   * Gets the current change count for a document
   */
  getChangeCount(documentId: string): number {
    return this.changeCounters.get(documentId) ?? 0;
  }

  /**
   * Adds an event listener
   */
  addEventListener(callback: VersionHistoryEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(callback: VersionHistoryEventCallback): void {
    this.eventListeners.delete(callback);
  }

  /**
   * Clears all versions for a document
   */
  clearDocumentVersions(documentId: string): void {
    const versionIds = this.documentVersions.get(documentId) ?? [];
    for (const id of versionIds) {
      this.versions.delete(id);
    }
    this.documentVersions.delete(documentId);
    this.changeCounters.delete(documentId);
    this.lastSnapshotTimes.delete(documentId);

    const debounceTimer = this.debounceTimers.get(documentId);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      this.debounceTimers.delete(documentId);
    }

    this.stopActivityTracking(documentId);
  }

  /**
   * Clears all data
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.activityTimers.values()) {
      clearInterval(timer);
    }

    this.versions.clear();
    this.documentVersions.clear();
    this.changeCounters.clear();
    this.lastSnapshotTimes.clear();
    this.debounceTimers.clear();
    this.activityTimers.clear();
  }

  /**
   * Destroys the manager and cleans up resources
   */
  destroy(): void {
    this.clear();
    this.eventListeners.clear();
  }

  // ============ Private Methods ============

  /**
   * Serializes a workbook to a storable format
   */
  private serializeWorkbook(workbook: Workbook): SerializedWorkbook {
    return {
      id: workbook.id,
      name: workbook.name,
      sheets: workbook.sheets.map((sheet) => this.serializeSheet(sheet)),
      activeSheetIndex: workbook.activeSheetIndex,
      namedRanges: workbook.namedRanges.map((nr) => ({
        name: nr.name,
        reference: nr.reference,
        scope: nr.scope,
        comment: nr.comment,
      })),
      calcMode: workbook.calcMode,
    };
  }

  /**
   * Serializes a sheet
   */
  private serializeSheet(sheet: Sheet): SerializedSheet {
    const cells: SerializedSheet['cells'] = [];
    for (const [key, cell] of sheet.cells) {
      cells.push({
        key,
        address: { ...cell.address },
        raw: cell.content.raw,
        isFormula: cell.content.isFormula,
        style: cell.style ? JSON.stringify(cell.style) : undefined,
      });
    }

    return {
      id: sheet.id,
      name: sheet.name,
      cells,
      columnWidths: Array.from(sheet.columnWidths.entries()),
      rowHeights: Array.from(sheet.rowHeights.entries()),
      hiddenColumns: Array.from(sheet.hiddenColumns),
      hiddenRows: Array.from(sheet.hiddenRows),
      mergedRegions: sheet.mergedRegions.map((mr) => ({
        range: {
          start: { ...mr.range.start },
          end: { ...mr.range.end },
        },
      })),
      zoom: sheet.zoom,
      showGridlines: sheet.showGridlines,
      showHeaders: sheet.showHeaders,
      hidden: sheet.hidden,
      tabColor: sheet.tabColor,
    };
  }

  /**
   * Deserializes a workbook from stored format
   */
  private deserializeWorkbook(snapshotStr: string): Workbook {
    const data: SerializedWorkbook = JSON.parse(snapshotStr);

    return {
      id: data.id,
      name: data.name,
      sheets: data.sheets.map((s) => this.deserializeSheet(s)),
      activeSheetIndex: data.activeSheetIndex,
      namedRanges: data.namedRanges,
      properties: {
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
      themeColors: {
        dark1: '#000000',
        light1: '#FFFFFF',
        dark2: '#44546A',
        light2: '#E7E6E6',
        accent1: '#4472C4',
        accent2: '#ED7D31',
        accent3: '#A5A5A5',
        accent4: '#FFC000',
        accent5: '#5B9BD5',
        accent6: '#70AD47',
        hyperlink: '#0563C1',
        followedHyperlink: '#954F72',
      },
      styles: [],
      calcMode: data.calcMode,
      isDirty: false,
    };
  }

  /**
   * Deserializes a sheet
   */
  private deserializeSheet(data: SerializedSheet): Sheet {
    const cells = new Map<string, Cell>();
    for (const cellData of data.cells) {
      const cell: Cell = {
        address: cellData.address,
        content: {
          raw: cellData.raw,
          isFormula: cellData.isFormula,
        },
        value: { type: 'empty' },
        style: cellData.style ? JSON.parse(cellData.style) : undefined,
      };
      cells.set(cellData.key, cell);
    }

    return {
      id: data.id,
      name: data.name,
      cells,
      columnWidths: new Map(data.columnWidths),
      rowHeights: new Map(data.rowHeights),
      hiddenColumns: new Set(data.hiddenColumns),
      hiddenRows: new Set(data.hiddenRows),
      mergedRegions: data.mergedRegions,
      conditionalFormats: [],
      charts: [],
      columnStyles: new Map(),
      rowStyles: new Map(),
      zoom: data.zoom,
      showGridlines: data.showGridlines,
      showHeaders: data.showHeaders,
      hidden: data.hidden,
      tabColor: data.tabColor,
    };
  }

  /**
   * Computes the diff between two workbooks
   */
  private computeDiff(
    wb1: Workbook,
    wb2: Workbook,
    v1Id: string,
    v2Id: string
  ): VersionDiff {
    const cellChanges: CellChange[] = [];
    const sheetChanges: SheetChange[] = [];

    // Create sheet maps for easy lookup
    const sheets1 = new Map(wb1.sheets.map((s) => [s.id, s]));
    const sheets2 = new Map(wb2.sheets.map((s) => [s.id, s]));

    // Find added and modified sheets
    for (const [sheetId, sheet2] of sheets2) {
      const sheet1 = sheets1.get(sheetId);

      if (!sheet1) {
        // Sheet was added
        sheetChanges.push({
          sheetId,
          sheetName: sheet2.name,
          type: 'added',
          newName: sheet2.name,
        });

        // All cells in this sheet are "added"
        for (const [key, cell] of sheet2.cells) {
          cellChanges.push({
            address: cell.address,
            sheetId,
            sheetName: sheet2.name,
            type: 'added',
            newValue: cell.content.raw,
            newFormula: cell.content.isFormula ? cell.content.raw : undefined,
          });
        }
      } else {
        // Check for rename
        if (sheet1.name !== sheet2.name) {
          sheetChanges.push({
            sheetId,
            sheetName: sheet2.name,
            type: 'renamed',
            oldName: sheet1.name,
            newName: sheet2.name,
          });
        }

        // Compare cells
        this.compareCells(sheet1, sheet2, cellChanges);
      }
    }

    // Find removed sheets
    for (const [sheetId, sheet1] of sheets1) {
      if (!sheets2.has(sheetId)) {
        sheetChanges.push({
          sheetId,
          sheetName: sheet1.name,
          type: 'removed',
        });

        // All cells in this sheet are "removed"
        for (const [key, cell] of sheet1.cells) {
          cellChanges.push({
            address: cell.address,
            sheetId,
            sheetName: sheet1.name,
            type: 'removed',
            oldValue: cell.content.raw,
            oldFormula: cell.content.isFormula ? cell.content.raw : undefined,
          });
        }
      }
    }

    // Compute summary
    const summary = {
      cellsAdded: cellChanges.filter((c) => c.type === 'added').length,
      cellsRemoved: cellChanges.filter((c) => c.type === 'removed').length,
      cellsModified: cellChanges.filter((c) => c.type === 'modified').length,
      sheetsAdded: sheetChanges.filter((s) => s.type === 'added').length,
      sheetsRemoved: sheetChanges.filter((s) => s.type === 'removed').length,
      sheetsRenamed: sheetChanges.filter((s) => s.type === 'renamed').length,
    };

    return {
      fromVersionId: v1Id,
      toVersionId: v2Id,
      timestamp: Date.now(),
      cellChanges,
      sheetChanges,
      summary,
    };
  }

  /**
   * Compares cells between two sheets
   */
  private compareCells(
    sheet1: Sheet,
    sheet2: Sheet,
    changes: CellChange[]
  ): void {
    const allKeys = new Set([
      ...sheet1.cells.keys(),
      ...sheet2.cells.keys(),
    ]);

    for (const key of allKeys) {
      const cell1 = sheet1.cells.get(key);
      const cell2 = sheet2.cells.get(key);

      if (!cell1 && cell2) {
        // Cell added
        changes.push({
          address: cell2.address,
          sheetId: sheet2.id,
          sheetName: sheet2.name,
          type: 'added',
          newValue: cell2.content.raw,
          newFormula: cell2.content.isFormula ? cell2.content.raw : undefined,
        });
      } else if (cell1 && !cell2) {
        // Cell removed
        changes.push({
          address: cell1.address,
          sheetId: sheet1.id,
          sheetName: sheet1.name,
          type: 'removed',
          oldValue: cell1.content.raw,
          oldFormula: cell1.content.isFormula ? cell1.content.raw : undefined,
        });
      } else if (cell1 && cell2) {
        // Check if modified
        if (cell1.content.raw !== cell2.content.raw) {
          changes.push({
            address: cell2.address,
            sheetId: sheet2.id,
            sheetName: sheet2.name,
            type: 'modified',
            oldValue: cell1.content.raw,
            newValue: cell2.content.raw,
            oldFormula: cell1.content.isFormula ? cell1.content.raw : undefined,
            newFormula: cell2.content.isFormula ? cell2.content.raw : undefined,
          });
        }
      }
    }
  }

  /**
   * Checks if an auto-snapshot should be created
   */
  private checkAutoSnapshot(
    documentId: string,
    author: Author,
    workbook: Workbook
  ): void {
    if (!this.autoSnapshotConfig.enableChangeBasedSnapshots) {
      return;
    }

    const changeCount = this.changeCounters.get(documentId) ?? 0;

    if (changeCount >= this.autoSnapshotConfig.changeThreshold) {
      this.createSnapshot(workbook, author, undefined, {
        isAutoSnapshot: true,
        trigger: 'auto_changes',
      });
    }
  }

  /**
   * Cleans up old versions based on configuration
   */
  private cleanupVersions(documentId: string): void {
    const versionIds = this.documentVersions.get(documentId);
    if (!versionIds) return;

    const versions = versionIds
      .map((id) => this.versions.get(id))
      .filter((v): v is Version => v !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);

    const now = Date.now();
    const maxAge = this.options.maxVersionAgeDays * 24 * 60 * 60 * 1000;
    const maxCount = this.options.maxVersionsPerDocument;

    const toDelete: string[] = [];

    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];

      // Keep manually labeled versions longer
      if (version.label && !version.isAutoSnapshot) {
        continue;
      }

      // Delete if too old
      if (now - version.timestamp > maxAge) {
        toDelete.push(version.id);
        continue;
      }

      // Delete if over max count (but keep at least some)
      if (i >= maxCount) {
        toDelete.push(version.id);
      }
    }

    // Delete old versions
    for (const id of toDelete) {
      this.deleteVersion(id);
    }
  }

  /**
   * Emits an event to all listeners
   */
  private emitEvent(event: VersionHistoryEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in version history event listener:', error);
      }
    }
  }
}

/**
 * Factory function to create a VersionHistoryManager
 */
export function createVersionHistoryManager(
  options?: VersionHistoryManagerOptions
): VersionHistoryManager {
  return new VersionHistoryManager(options);
}
