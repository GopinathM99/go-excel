import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VersionHistoryManager,
  createVersionHistoryManager,
  DEFAULT_AUTO_SNAPSHOT_CONFIG,
  type Version,
  type Author,
  type VersionDiff,
  type AutoSnapshotConfig,
  type VersionHistoryEvent,
} from './VersionHistory';
import type { Workbook } from '../models/Workbook';
import type { Sheet } from '../models/Sheet';
import type { Cell } from '../models/Cell';

describe('VersionHistory', () => {
  let manager: VersionHistoryManager;
  let idCounter: number;

  const author1: Author = {
    id: 'user-1',
    name: 'John Doe',
    avatar: 'https://example.com/avatar1.png',
  };

  const author2: Author = {
    id: 'user-2',
    name: 'Jane Smith',
  };

  /**
   * Creates a mock workbook for testing
   */
  function createMockWorkbook(id = 'wb-1', name = 'Test Workbook'): Workbook {
    const sheet1 = createMockSheet('sheet-1', 'Sheet1');
    return {
      id,
      name,
      sheets: [sheet1],
      activeSheetIndex: 0,
      namedRanges: [],
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
      calcMode: 'auto',
      isDirty: false,
    };
  }

  /**
   * Creates a mock sheet for testing
   */
  function createMockSheet(id = 'sheet-1', name = 'Sheet1'): Sheet {
    const cells = new Map<string, Cell>();
    cells.set('0,0', {
      address: { row: 0, col: 0 },
      content: { raw: 'Hello', isFormula: false },
      value: { type: 'string', value: 'Hello' },
    });
    cells.set('0,1', {
      address: { row: 0, col: 1 },
      content: { raw: '=A1', isFormula: true },
      value: { type: 'string', value: 'Hello' },
    });
    cells.set('1,0', {
      address: { row: 1, col: 0 },
      content: { raw: '42', isFormula: false },
      value: { type: 'number', value: 42 },
    });

    return {
      id,
      name,
      cells,
      columnWidths: new Map([[0, 100]]),
      rowHeights: new Map([[0, 25]]),
      hiddenColumns: new Set(),
      hiddenRows: new Set(),
      mergedRegions: [],
      conditionalFormats: [],
      charts: [],
      columnStyles: new Map(),
      rowStyles: new Map(),
      zoom: 100,
      showGridlines: true,
      showHeaders: true,
    };
  }

  beforeEach(() => {
    idCounter = 0;
    manager = new VersionHistoryManager({
      generateId: () => `v-${++idCounter}`,
      autoSnapshotConfig: {
        enableTimeBasedSnapshots: false, // Disable for tests
        enableChangeBasedSnapshots: false, // Disable for tests
      },
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot of the workbook', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      expect(version.id).toBe('v-1');
      expect(version.documentId).toBe('wb-1');
      expect(version.author).toEqual(author1);
      expect(version.timestamp).toBeGreaterThan(0);
      expect(version.snapshot).toBeTruthy();
      expect(version.size).toBeGreaterThan(0);
      expect(version.isAutoSnapshot).toBe(false);
      expect(version.trigger).toBe('manual');
    });

    it('should create a snapshot with a label', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1, 'Initial version');

      expect(version.label).toBe('Initial version');
    });

    it('should create an auto-snapshot', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1, undefined, {
        isAutoSnapshot: true,
        trigger: 'auto_time',
      });

      expect(version.isAutoSnapshot).toBe(true);
      expect(version.trigger).toBe('auto_time');
    });

    it('should serialize and store the workbook state', () => {
      const workbook = createMockWorkbook();
      workbook.sheets[0].cells.set('2,0', {
        address: { row: 2, col: 0 },
        content: { raw: 'Test', isFormula: false },
        value: { type: 'string', value: 'Test' },
      });

      const version = manager.createSnapshot(workbook, author1);
      const parsed = JSON.parse(version.snapshot);

      expect(parsed.id).toBe('wb-1');
      expect(parsed.name).toBe('Test Workbook');
      expect(parsed.sheets).toHaveLength(1);
      expect(parsed.sheets[0].cells).toHaveLength(4);
    });

    it('should emit versionCreated event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      expect(listener).toHaveBeenCalledWith({
        type: 'versionCreated',
        version,
      });
    });

    it('should reset change counter after snapshot', () => {
      const workbook = createMockWorkbook();

      // Simulate some changes
      manager.trackChange(workbook.id, author1, workbook);
      manager.trackChange(workbook.id, author1, workbook);
      manager.trackChange(workbook.id, author1, workbook);

      expect(manager.getChangeCount(workbook.id)).toBe(3);

      manager.createSnapshot(workbook, author1);

      expect(manager.getChangeCount(workbook.id)).toBe(0);
    });
  });

  describe('getVersions', () => {
    it('should return all versions for a document', () => {
      const workbook = createMockWorkbook();

      manager.createSnapshot(workbook, author1, 'Version 1');
      manager.createSnapshot(workbook, author2, 'Version 2');
      manager.createSnapshot(workbook, author1, 'Version 3');

      const versions = manager.getVersions('wb-1');

      expect(versions).toHaveLength(3);
    });

    it('should return versions sorted by timestamp (most recent first)', () => {
      const workbook = createMockWorkbook();

      // Create versions with incrementing timestamps by mocking Date.now
      const originalNow = Date.now;
      let currentTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime++);

      manager.createSnapshot(workbook, author1, 'Version 1');
      manager.createSnapshot(workbook, author2, 'Version 2');
      manager.createSnapshot(workbook, author1, 'Version 3');

      // Restore Date.now
      vi.spyOn(Date, 'now').mockImplementation(originalNow);

      const versions = manager.getVersions('wb-1');

      expect(versions[0].label).toBe('Version 3');
      expect(versions[1].label).toBe('Version 2');
      expect(versions[2].label).toBe('Version 1');
    });

    it('should return empty array for unknown document', () => {
      const versions = manager.getVersions('unknown-doc');
      expect(versions).toHaveLength(0);
    });
  });

  describe('getVersion', () => {
    it('should return a version by ID', () => {
      const workbook = createMockWorkbook();
      const created = manager.createSnapshot(workbook, author1, 'Test');

      const version = manager.getVersion(created.id);

      expect(version).toEqual(created);
    });

    it('should return null for unknown version ID', () => {
      const version = manager.getVersion('unknown-id');
      expect(version).toBeNull();
    });
  });

  describe('restoreVersion', () => {
    it('should restore a workbook from a version', () => {
      const workbook = createMockWorkbook();
      workbook.name = 'Original Name';
      workbook.sheets[0].cells.set('5,5', {
        address: { row: 5, col: 5 },
        content: { raw: 'Original', isFormula: false },
        value: { type: 'string', value: 'Original' },
      });

      const version = manager.createSnapshot(workbook, author1);

      // Modify the workbook
      workbook.name = 'Modified Name';
      workbook.sheets[0].cells.delete('5,5');

      // Restore
      const restored = manager.restoreVersion(version.id);

      expect(restored.name).toBe('Original Name');
      expect(restored.sheets[0].cells.has('5,5')).toBe(true);
      expect(restored.sheets[0].cells.get('5,5')?.content.raw).toBe('Original');
    });

    it('should emit versionRestored event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      // Clear the mock to ignore the versionCreated event
      listener.mockClear();

      manager.restoreVersion(version.id);

      expect(listener).toHaveBeenCalledWith({
        type: 'versionRestored',
        version,
      });
    });

    it('should throw error for unknown version', () => {
      expect(() => manager.restoreVersion('unknown-id')).toThrow(
        'Version with ID unknown-id does not exist'
      );
    });

    it('should restore multiple sheets', () => {
      const workbook = createMockWorkbook();
      const sheet2 = createMockSheet('sheet-2', 'Sheet2');
      workbook.sheets.push(sheet2);

      const version = manager.createSnapshot(workbook, author1);

      const restored = manager.restoreVersion(version.id);

      expect(restored.sheets).toHaveLength(2);
      expect(restored.sheets[0].name).toBe('Sheet1');
      expect(restored.sheets[1].name).toBe('Sheet2');
    });
  });

  describe('deleteVersion', () => {
    it('should delete a version', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      manager.deleteVersion(version.id);

      expect(manager.getVersion(version.id)).toBeNull();
      expect(manager.getVersions('wb-1')).toHaveLength(0);
    });

    it('should emit versionDeleted event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);
      listener.mockClear();

      manager.deleteVersion(version.id);

      expect(listener).toHaveBeenCalledWith({
        type: 'versionDeleted',
        versionId: version.id,
      });
    });

    it('should do nothing for unknown version', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.deleteVersion('unknown-id');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('labelVersion', () => {
    it('should update the label of a version', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      manager.labelVersion(version.id, 'New Label');

      const updated = manager.getVersion(version.id);
      expect(updated?.label).toBe('New Label');
    });

    it('should emit versionLabeled event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);
      listener.mockClear();

      manager.labelVersion(version.id, 'New Label');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'versionLabeled',
          label: 'New Label',
        })
      );
    });

    it('should throw error for unknown version', () => {
      expect(() => manager.labelVersion('unknown-id', 'Label')).toThrow(
        'Version with ID unknown-id does not exist'
      );
    });
  });

  describe('compareVersions', () => {
    it('should detect added cells', () => {
      const workbook = createMockWorkbook();
      const v1 = manager.createSnapshot(workbook, author1);

      // Add a cell
      workbook.sheets[0].cells.set('10,10', {
        address: { row: 10, col: 10 },
        content: { raw: 'New Cell', isFormula: false },
        value: { type: 'string', value: 'New Cell' },
      });
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);

      expect(diff.summary.cellsAdded).toBe(1);
      expect(diff.cellChanges.find((c) => c.type === 'added')?.newValue).toBe('New Cell');
    });

    it('should detect removed cells', () => {
      const workbook = createMockWorkbook();
      const v1 = manager.createSnapshot(workbook, author1);

      // Remove a cell
      workbook.sheets[0].cells.delete('0,0');
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);

      expect(diff.summary.cellsRemoved).toBe(1);
      expect(diff.cellChanges.find((c) => c.type === 'removed')?.oldValue).toBe('Hello');
    });

    it('should detect modified cells', () => {
      const workbook = createMockWorkbook();
      const v1 = manager.createSnapshot(workbook, author1);

      // Modify a cell
      const cell = workbook.sheets[0].cells.get('0,0')!;
      workbook.sheets[0].cells.set('0,0', {
        ...cell,
        content: { raw: 'Modified', isFormula: false },
        value: { type: 'string', value: 'Modified' },
      });
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);

      expect(diff.summary.cellsModified).toBe(1);
      const modifiedChange = diff.cellChanges.find((c) => c.type === 'modified');
      expect(modifiedChange?.oldValue).toBe('Hello');
      expect(modifiedChange?.newValue).toBe('Modified');
    });

    it('should detect added sheets', () => {
      const workbook = createMockWorkbook();
      const v1 = manager.createSnapshot(workbook, author1);

      // Add a sheet
      workbook.sheets.push(createMockSheet('sheet-2', 'Sheet2'));
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);

      expect(diff.summary.sheetsAdded).toBe(1);
      expect(diff.sheetChanges.find((s) => s.type === 'added')?.sheetName).toBe('Sheet2');
    });

    it('should detect removed sheets', () => {
      const workbook = createMockWorkbook();
      workbook.sheets.push(createMockSheet('sheet-2', 'Sheet2'));
      const v1 = manager.createSnapshot(workbook, author1);

      // Remove a sheet
      workbook.sheets.pop();
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);

      expect(diff.summary.sheetsRemoved).toBe(1);
    });

    it('should detect renamed sheets', () => {
      const workbook = createMockWorkbook();
      const v1 = manager.createSnapshot(workbook, author1);

      // Rename a sheet
      workbook.sheets[0].name = 'Renamed Sheet';
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);

      expect(diff.summary.sheetsRenamed).toBe(1);
      const renamedChange = diff.sheetChanges.find((s) => s.type === 'renamed');
      expect(renamedChange?.oldName).toBe('Sheet1');
      expect(renamedChange?.newName).toBe('Renamed Sheet');
    });

    it('should throw error for unknown versions', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      expect(() => manager.compareVersions('unknown', version.id)).toThrow(
        'Version with ID unknown does not exist'
      );

      expect(() => manager.compareVersions(version.id, 'unknown')).toThrow(
        'Version with ID unknown does not exist'
      );
    });

    it('should include formula information in changes', () => {
      const workbook = createMockWorkbook();
      const v1 = manager.createSnapshot(workbook, author1);

      // Modify a formula
      const cell = workbook.sheets[0].cells.get('0,1')!;
      workbook.sheets[0].cells.set('0,1', {
        ...cell,
        content: { raw: '=SUM(A1:A10)', isFormula: true },
      });
      const v2 = manager.createSnapshot(workbook, author1);

      const diff = manager.compareVersions(v1.id, v2.id);
      const formulaChange = diff.cellChanges.find(
        (c) => c.address.row === 0 && c.address.col === 1
      );

      expect(formulaChange?.oldFormula).toBe('=A1');
      expect(formulaChange?.newFormula).toBe('=SUM(A1:A10)');
    });
  });

  describe('compareWithCurrent', () => {
    it('should compare a version with current workbook state', () => {
      const workbook = createMockWorkbook();
      const version = manager.createSnapshot(workbook, author1);

      // Modify the workbook
      workbook.sheets[0].cells.set('20,20', {
        address: { row: 20, col: 20 },
        content: { raw: 'New', isFormula: false },
        value: { type: 'string', value: 'New' },
      });

      const diff = manager.compareWithCurrent(version.id, workbook);

      expect(diff.fromVersionId).toBe(version.id);
      expect(diff.toVersionId).toBe('current');
      expect(diff.summary.cellsAdded).toBe(1);
    });
  });

  describe('trackChange', () => {
    it('should increment change counter', () => {
      const workbook = createMockWorkbook();

      expect(manager.getChangeCount(workbook.id)).toBe(0);

      manager.trackChange(workbook.id, author1, workbook);
      expect(manager.getChangeCount(workbook.id)).toBe(1);

      manager.trackChange(workbook.id, author1, workbook);
      expect(manager.getChangeCount(workbook.id)).toBe(2);
    });
  });

  describe('auto-snapshot', () => {
    it('should create snapshot when change threshold is reached', async () => {
      manager = new VersionHistoryManager({
        generateId: () => `v-${++idCounter}`,
        autoSnapshotConfig: {
          enableTimeBasedSnapshots: false,
          enableChangeBasedSnapshots: true,
          changeThreshold: 3,
          debounceMs: 10, // Short debounce for tests
        },
      });

      const workbook = createMockWorkbook();
      const listener = vi.fn();
      manager.addEventListener(listener);

      // Track changes
      manager.trackChange(workbook.id, author1, workbook);
      manager.trackChange(workbook.id, author1, workbook);
      manager.trackChange(workbook.id, author1, workbook);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have created an auto-snapshot
      const versions = manager.getVersions(workbook.id);
      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(versions[0]?.isAutoSnapshot).toBe(true);
      expect(versions[0]?.trigger).toBe('auto_changes');
    });

    it('should not create snapshot below threshold', async () => {
      manager = new VersionHistoryManager({
        generateId: () => `v-${++idCounter}`,
        autoSnapshotConfig: {
          enableTimeBasedSnapshots: false,
          enableChangeBasedSnapshots: true,
          changeThreshold: 100,
          debounceMs: 10,
        },
      });

      const workbook = createMockWorkbook();

      // Track fewer changes than threshold
      manager.trackChange(workbook.id, author1, workbook);
      manager.trackChange(workbook.id, author1, workbook);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 50));

      const versions = manager.getVersions(workbook.id);
      expect(versions).toHaveLength(0);
    });
  });

  describe('createPreOperationSnapshot', () => {
    it('should create a snapshot before a major operation', () => {
      const workbook = createMockWorkbook();
      const version = manager.createPreOperationSnapshot(
        workbook,
        author1,
        'Sort All Data'
      );

      expect(version).not.toBeNull();
      expect(version?.label).toBe('Before Sort All Data');
      expect(version?.isAutoSnapshot).toBe(true);
      expect(version?.trigger).toBe('before_operation');
    });

    it('should return null when pre-operation snapshots are disabled', () => {
      manager.setAutoSnapshotConfig({
        enablePreOperationSnapshots: false,
      });

      const workbook = createMockWorkbook();
      const version = manager.createPreOperationSnapshot(
        workbook,
        author1,
        'Sort All Data'
      );

      expect(version).toBeNull();
    });
  });

  describe('auto-snapshot configuration', () => {
    it('should return the auto-snapshot configuration', () => {
      const config = manager.getAutoSnapshotConfig();

      expect(config.enableTimeBasedSnapshots).toBe(false);
      expect(config.enableChangeBasedSnapshots).toBe(false);
    });

    it('should update the auto-snapshot configuration', () => {
      manager.setAutoSnapshotConfig({
        timeIntervalMinutes: 60,
        changeThreshold: 200,
      });

      const config = manager.getAutoSnapshotConfig();

      expect(config.timeIntervalMinutes).toBe(60);
      expect(config.changeThreshold).toBe(200);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      const unsubscribe = manager.addEventListener(listener);

      const workbook = createMockWorkbook();
      manager.createSnapshot(workbook, author1);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.createSnapshot(workbook, author1);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in listeners gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = vi.fn();

      manager.addEventListener(errorListener);
      manager.addEventListener(normalListener);

      const workbook = createMockWorkbook();
      expect(() => manager.createSnapshot(workbook, author1)).not.toThrow();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('clearDocumentVersions', () => {
    it('should remove all versions for a document', () => {
      const workbook = createMockWorkbook();

      manager.createSnapshot(workbook, author1);
      manager.createSnapshot(workbook, author1);
      manager.createSnapshot(workbook, author1);

      expect(manager.getVersions('wb-1')).toHaveLength(3);

      manager.clearDocumentVersions('wb-1');

      expect(manager.getVersions('wb-1')).toHaveLength(0);
    });

    it('should reset change counter', () => {
      const workbook = createMockWorkbook();
      manager.trackChange(workbook.id, author1, workbook);

      expect(manager.getChangeCount(workbook.id)).toBe(1);

      manager.clearDocumentVersions(workbook.id);

      expect(manager.getChangeCount(workbook.id)).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all versions', () => {
      const workbook1 = createMockWorkbook('wb-1');
      const workbook2 = createMockWorkbook('wb-2');

      manager.createSnapshot(workbook1, author1);
      manager.createSnapshot(workbook2, author1);

      manager.clear();

      expect(manager.getVersions('wb-1')).toHaveLength(0);
      expect(manager.getVersions('wb-2')).toHaveLength(0);
    });
  });

  describe('version cleanup', () => {
    it('should cleanup versions exceeding maxVersionsPerDocument', () => {
      manager = new VersionHistoryManager({
        generateId: () => `v-${++idCounter}`,
        maxVersionsPerDocument: 3,
        autoSnapshotConfig: {
          enableTimeBasedSnapshots: false,
          enableChangeBasedSnapshots: false,
        },
      });

      const workbook = createMockWorkbook();

      // Create more versions than the max
      for (let i = 0; i < 5; i++) {
        manager.createSnapshot(workbook, author1);
      }

      const versions = manager.getVersions('wb-1');
      expect(versions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('createVersionHistoryManager factory', () => {
    it('should create a VersionHistoryManager instance', () => {
      const newManager = createVersionHistoryManager();
      expect(newManager).toBeInstanceOf(VersionHistoryManager);
      newManager.destroy();
    });

    it('should accept configuration options', () => {
      let counter = 0;
      const newManager = createVersionHistoryManager({
        generateId: () => `custom-${++counter}`,
      });

      const workbook = createMockWorkbook();
      const version = newManager.createSnapshot(workbook, author1);

      expect(version.id).toBe('custom-1');
      newManager.destroy();
    });
  });

  describe('DEFAULT_AUTO_SNAPSHOT_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_AUTO_SNAPSHOT_CONFIG.enableTimeBasedSnapshots).toBe(true);
      expect(DEFAULT_AUTO_SNAPSHOT_CONFIG.timeIntervalMinutes).toBe(30);
      expect(DEFAULT_AUTO_SNAPSHOT_CONFIG.enableChangeBasedSnapshots).toBe(true);
      expect(DEFAULT_AUTO_SNAPSHOT_CONFIG.changeThreshold).toBe(100);
      expect(DEFAULT_AUTO_SNAPSHOT_CONFIG.enablePreOperationSnapshots).toBe(true);
      expect(DEFAULT_AUTO_SNAPSHOT_CONFIG.debounceMs).toBe(5000);
    });
  });

  describe('serialization edge cases', () => {
    it('should handle empty workbook', () => {
      const workbook = createMockWorkbook();
      workbook.sheets = [];

      const version = manager.createSnapshot(workbook, author1);
      const restored = manager.restoreVersion(version.id);

      expect(restored.sheets).toHaveLength(0);
    });

    it('should handle sheet with no cells', () => {
      const workbook = createMockWorkbook();
      workbook.sheets[0].cells.clear();

      const version = manager.createSnapshot(workbook, author1);
      const restored = manager.restoreVersion(version.id);

      expect(restored.sheets[0].cells.size).toBe(0);
    });

    it('should preserve cell styles', () => {
      const workbook = createMockWorkbook();
      const cell = workbook.sheets[0].cells.get('0,0')!;
      cell.style = {
        font: { bold: true, size: 14 },
        fill: '#FF0000',
      };

      const version = manager.createSnapshot(workbook, author1);
      const restored = manager.restoreVersion(version.id);

      const restoredCell = restored.sheets[0].cells.get('0,0');
      expect(restoredCell?.style?.font?.bold).toBe(true);
      expect(restoredCell?.style?.fill).toBe('#FF0000');
    });

    it('should preserve named ranges', () => {
      const workbook = createMockWorkbook();
      workbook.namedRanges = [
        { name: 'MyRange', reference: 'Sheet1!$A$1:$B$10' },
        { name: 'ScopedRange', reference: 'Sheet1!$C$1', scope: 'sheet-1' },
      ];

      const version = manager.createSnapshot(workbook, author1);
      const restored = manager.restoreVersion(version.id);

      expect(restored.namedRanges).toHaveLength(2);
      expect(restored.namedRanges[0].name).toBe('MyRange');
      expect(restored.namedRanges[1].scope).toBe('sheet-1');
    });

    it('should preserve merged regions', () => {
      const workbook = createMockWorkbook();
      workbook.sheets[0].mergedRegions = [
        { range: { start: { row: 0, col: 0 }, end: { row: 2, col: 2 } } },
      ];

      const version = manager.createSnapshot(workbook, author1);
      const restored = manager.restoreVersion(version.id);

      expect(restored.sheets[0].mergedRegions).toHaveLength(1);
      expect(restored.sheets[0].mergedRegions[0].range.end.row).toBe(2);
    });

    it('should preserve column widths and row heights', () => {
      const workbook = createMockWorkbook();
      workbook.sheets[0].columnWidths.set(5, 200);
      workbook.sheets[0].rowHeights.set(10, 50);

      const version = manager.createSnapshot(workbook, author1);
      const restored = manager.restoreVersion(version.id);

      expect(restored.sheets[0].columnWidths.get(5)).toBe(200);
      expect(restored.sheets[0].rowHeights.get(10)).toBe(50);
    });
  });
});
