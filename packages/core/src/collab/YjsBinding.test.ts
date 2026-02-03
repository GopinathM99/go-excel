import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { YjsBinding } from './YjsBinding';
import { AwarenessState } from './AwarenessState';
import { ConflictResolver } from './ConflictResolver';
import { createWorkbook, addSheet, renameSheet } from '../models/Workbook';
import { createSheet, setCell, getCell } from '../models/Sheet';
import { createCell } from '../models/Cell';
import type { Workbook } from '../models/Workbook';
import type { CellRange } from '../models/CellRange';

// Mock Awareness for testing
class MockAwareness {
  private states = new Map<number, unknown>();
  private localState: unknown = null;
  private listeners = new Map<string, Set<Function>>();
  clientID = Math.floor(Math.random() * 1000000);

  setLocalState(state: unknown): void {
    this.localState = state;
    if (state !== null) {
      this.states.set(this.clientID, state);
    } else {
      this.states.delete(this.clientID);
    }
    this.emit('update', {
      added: state !== null ? [this.clientID] : [],
      updated: [],
      removed: state === null ? [this.clientID] : [],
    });
  }

  getLocalState(): unknown {
    return this.localState;
  }

  getStates(): Map<number, unknown> {
    return new Map(this.states);
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    for (const callback of this.listeners.get(event) ?? []) {
      callback(data);
    }
  }

  // Simulate another user's state
  setRemoteState(clientId: number, state: unknown): void {
    if (state !== null) {
      this.states.set(clientId, state);
    } else {
      this.states.delete(clientId);
    }
    this.emit('update', {
      added: state !== null ? [clientId] : [],
      updated: [],
      removed: state === null ? [clientId] : [],
    });
  }
}

describe('YjsBinding', () => {
  let workbook: Workbook;
  let ydoc: Y.Doc;
  let binding: YjsBinding;

  beforeEach(() => {
    workbook = createWorkbook('TestWorkbook');
    ydoc = new Y.Doc();
    binding = new YjsBinding(workbook, ydoc, {
      localOrigin: 'test',
      enableUndo: true,
      batchDelay: 0, // Immediate for testing
    });
  });

  afterEach(() => {
    binding.destroy();
    ydoc.destroy();
  });

  describe('initialization', () => {
    it('should initialize Yjs document from workbook', () => {
      binding.initializeFromWorkbook();

      const yMetadata = ydoc.getMap('metadata');
      const ySheetOrder = ydoc.getArray('sheetOrder');
      const ySheets = ydoc.getMap('sheets');

      expect(yMetadata.get('name')).toBe('TestWorkbook');
      expect(ySheetOrder.length).toBe(1);
      expect(ySheets.size).toBe(1);
    });

    it('should not initialize twice', () => {
      binding.initializeFromWorkbook();
      const initialSheetCount = ydoc.getArray('sheetOrder').length;

      binding.initializeFromWorkbook();
      expect(ydoc.getArray('sheetOrder').length).toBe(initialSheetCount);
    });

    it('should sync from existing Yjs document', () => {
      // Create another binding that initializes first
      const ydoc2 = new Y.Doc();
      const workbook2 = createWorkbook('InitialWorkbook');
      workbook2.sheets[0]!.name = 'DataSheet';

      const binding2 = new YjsBinding(workbook2, ydoc2);
      binding2.initializeFromWorkbook();

      // Sync state to our ydoc
      const update = Y.encodeStateAsUpdate(ydoc2);
      Y.applyUpdate(ydoc, update);

      // Create a fresh workbook and sync from Yjs
      const freshWorkbook = createWorkbook('Fresh');
      const freshBinding = new YjsBinding(freshWorkbook, ydoc);
      freshBinding.syncFromYjs();

      expect(freshWorkbook.name).toBe('InitialWorkbook');
      expect(freshWorkbook.sheets[0]?.name).toBe('DataSheet');

      binding2.destroy();
      freshBinding.destroy();
      ydoc2.destroy();
    });
  });

  describe('cell operations', () => {
    beforeEach(() => {
      binding.initializeFromWorkbook();
    });

    it('should set cell value', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCellValue(sheetId, 0, 0, 'Hello');

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;
      const yCell = yCells.get('0,0');

      expect(yCell?.get('raw')).toBe('Hello');
      expect(yCell?.get('isFormula')).toBe(false);
    });

    it('should set cell formula', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCellFormula(sheetId, 0, 0, 'SUM(A2:A10)');

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;
      const yCell = yCells.get('0,0');

      expect(yCell?.get('raw')).toBe('=SUM(A2:A10)');
      expect(yCell?.get('isFormula')).toBe(true);
    });

    it('should set cell style', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCellStyle(sheetId, 0, 0, {
        font: { bold: true, size: 14 },
        fill: '#FF0000',
      });

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;
      const yCell = yCells.get('0,0');

      const styleStr = yCell?.get('style') as string;
      const style = JSON.parse(styleStr);

      expect(style.font.bold).toBe(true);
      expect(style.font.size).toBe(14);
      expect(style.fill).toBe('#FF0000');
    });

    it('should batch set multiple cells', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCells(sheetId, [
        { row: 0, col: 0, value: 'A1' },
        { row: 0, col: 1, value: 'B1' },
        { row: 1, col: 0, value: '=A1' },
      ]);

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;

      expect(yCells.get('0,0')?.get('raw')).toBe('A1');
      expect(yCells.get('0,1')?.get('raw')).toBe('B1');
      expect(yCells.get('1,0')?.get('raw')).toBe('=A1');
      expect(yCells.get('1,0')?.get('isFormula')).toBe(true);
    });

    it('should delete cell', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCellValue(sheetId, 0, 0, 'ToDelete');

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;

      expect(yCells.has('0,0')).toBe(true);

      binding.deleteCell(sheetId, 0, 0);
      expect(yCells.has('0,0')).toBe(false);
    });
  });

  describe('sheet operations', () => {
    beforeEach(() => {
      binding.initializeFromWorkbook();
    });

    it('should add new sheet', () => {
      const sheetId = binding.addSheet('NewSheet');

      const ySheetOrder = ydoc.getArray('sheetOrder');
      const ySheets = ydoc.getMap('sheets');

      expect(ySheetOrder.length).toBe(2);
      expect(ySheets.has(sheetId)).toBe(true);

      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yProperties = ySheet.get('properties') as Y.Map<unknown>;
      expect(yProperties.get('name')).toBe('NewSheet');
    });

    it('should remove sheet', () => {
      const sheetId = binding.addSheet('ToRemove');
      expect(ydoc.getArray('sheetOrder').length).toBe(2);

      binding.removeSheet(sheetId);

      expect(ydoc.getArray('sheetOrder').length).toBe(1);
      expect(ydoc.getMap('sheets').has(sheetId)).toBe(false);
    });

    it('should rename sheet', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.renameSheet(sheetId, 'RenamedSheet');

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yProperties = ySheet.get('properties') as Y.Map<unknown>;

      expect(yProperties.get('name')).toBe('RenamedSheet');
    });
  });

  describe('column and row operations', () => {
    beforeEach(() => {
      binding.initializeFromWorkbook();
    });

    it('should set column width', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setColumnWidth(sheetId, 0, 150);

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yColumnWidths = ySheet.get('columnWidths') as Y.Map<number>;

      expect(yColumnWidths.get('0')).toBe(150);
    });

    it('should set row height', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setRowHeight(sheetId, 0, 30);

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yRowHeights = ySheet.get('rowHeights') as Y.Map<number>;

      expect(yRowHeights.get('0')).toBe(30);
    });
  });

  describe('merged regions', () => {
    beforeEach(() => {
      binding.initializeFromWorkbook();
    });

    it('should add merged region', () => {
      const sheetId = workbook.sheets[0]!.id;
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 2 },
      };

      binding.addMergedRegion(sheetId, range);

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yMergedRegions = ySheet.get('mergedRegions') as Y.Array<unknown>;

      expect(yMergedRegions.length).toBe(1);
      const stored = JSON.parse(yMergedRegions.get(0) as string);
      expect(stored.start.row).toBe(0);
      expect(stored.end.col).toBe(2);
    });

    it('should remove merged region', () => {
      const sheetId = workbook.sheets[0]!.id;
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 2 },
      };

      binding.addMergedRegion(sheetId, range);
      binding.removeMergedRegion(sheetId, range);

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yMergedRegions = ySheet.get('mergedRegions') as Y.Array<unknown>;

      expect(yMergedRegions.length).toBe(0);
    });
  });

  describe('remote changes', () => {
    beforeEach(() => {
      binding.initializeFromWorkbook();
    });

    it('should notify on remote cell changes', async () => {
      const changes: unknown[] = [];
      binding.onRemoteChange((c) => changes.push(...c));

      // Simulate remote change by applying update from another doc
      const remoteDoc = new Y.Doc();
      const remoteBinding = new YjsBinding(createWorkbook('Remote'), remoteDoc, {
        localOrigin: 'remote',
      });
      remoteBinding.initializeFromWorkbook();

      // Sync initial state
      Y.applyUpdate(remoteDoc, Y.encodeStateAsUpdate(ydoc));
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(remoteDoc));

      // Make change on remote
      const sheetId = workbook.sheets[0]!.id;
      remoteBinding.setCellValue(sheetId, 5, 5, 'RemoteValue');

      // Apply remote update to local
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(remoteDoc));

      // Wait for batch delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(changes.length).toBeGreaterThan(0);

      remoteBinding.destroy();
      remoteDoc.destroy();
    });
  });

  describe('undo/redo', () => {
    beforeEach(() => {
      binding.initializeFromWorkbook();
    });

    it('should track undo state after changes', () => {
      // After initialization, undo may already be available
      const initialUndoState = binding.canUndo();

      const sheetId = workbook.sheets[0]!.id;
      binding.setCellValue(sheetId, 0, 0, 'Value1');

      // After a cell change, undo should definitely be available
      expect(binding.canUndo()).toBe(true);
    });

    it('should undo cell changes', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCellValue(sheetId, 0, 0, 'Value1');

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;

      expect(yCells.get('0,0')?.get('raw')).toBe('Value1');

      binding.undo();

      // After undo, cell should be removed or empty
      expect(yCells.get('0,0')).toBeUndefined();
    });

    it('should redo undone changes', () => {
      const sheetId = workbook.sheets[0]!.id;
      binding.setCellValue(sheetId, 0, 0, 'Value1');
      binding.undo();
      binding.redo();

      const ySheets = ydoc.getMap('sheets');
      const ySheet = ySheets.get(sheetId) as Y.Map<unknown>;
      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>>;

      expect(yCells.get('0,0')?.get('raw')).toBe('Value1');
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      binding.initializeFromWorkbook();

      const callback = vi.fn();
      binding.onRemoteChange(callback);

      binding.destroy();

      // Callbacks should be cleared
      // Further changes should not trigger callbacks
    });
  });
});

describe('AwarenessState', () => {
  let awareness: MockAwareness;
  let awarenessState: AwarenessState;

  beforeEach(() => {
    awareness = new MockAwareness();
    awarenessState = new AwarenessState(
      awareness as unknown as import('y-protocols/awareness').Awareness,
      {
        id: 'user1',
        name: 'Test User',
        color: '#FF0000',
      }
    );
  });

  afterEach(() => {
    awarenessState.destroy();
  });

  describe('local state management', () => {
    it('should initialize with user info', () => {
      const state = awarenessState.getLocalState();
      expect(state?.user.id).toBe('user1');
      expect(state?.user.name).toBe('Test User');
      expect(state?.isEditing).toBe(false);
    });

    it('should set cursor position', () => {
      awarenessState.setLocalCursor('Sheet1', 5, 3);

      const state = awarenessState.getLocalState();
      expect(state?.cursor?.sheet).toBe('Sheet1');
      expect(state?.cursor?.row).toBe(5);
      expect(state?.cursor?.col).toBe(3);
    });

    it('should set selection range', () => {
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 5, col: 5 },
      };
      awarenessState.setLocalSelection('Sheet1', range);

      const state = awarenessState.getLocalState();
      expect(state?.selection?.sheet).toBe('Sheet1');
      expect(state?.selection?.range.start.row).toBe(0);
      expect(state?.selection?.range.end.col).toBe(5);
    });

    it('should set editing state', () => {
      awarenessState.setLocalEditing(true, { sheet: 'Sheet1', row: 2, col: 3 });

      const state = awarenessState.getLocalState();
      expect(state?.isEditing).toBe(true);
      expect(state?.editingCell?.row).toBe(2);
      expect(state?.editingCell?.col).toBe(3);
    });

    it('should clear editing cell when not editing', () => {
      awarenessState.setLocalEditing(true, { sheet: 'Sheet1', row: 2, col: 3 });
      awarenessState.setLocalEditing(false);

      const state = awarenessState.getLocalState();
      expect(state?.isEditing).toBe(false);
      expect(state?.editingCell).toBeUndefined();
    });
  });

  describe('remote state tracking', () => {
    it('should get remote states', () => {
      // Add a remote user
      awareness.setRemoteState(12345, {
        user: { id: 'user2', name: 'Remote User', color: '#00FF00' },
        isEditing: false,
        lastActive: Date.now(),
      });

      const states = awarenessState.getRemoteStates();
      expect(states.size).toBe(1);
      expect(states.get(12345)?.user.name).toBe('Remote User');
    });

    it('should notify on remote awareness changes', () => {
      const callback = vi.fn();
      awarenessState.onRemoteAwareness(callback);

      awareness.setRemoteState(12345, {
        user: { id: 'user2', name: 'Remote User', color: '#00FF00' },
        isEditing: false,
        lastActive: Date.now(),
      });

      expect(callback).toHaveBeenCalled();
    });

    it('should get users on specific sheet', () => {
      awareness.setRemoteState(12345, {
        user: { id: 'user2', name: 'Remote User', color: '#00FF00' },
        cursor: { sheet: 'Sheet1', row: 0, col: 0 },
        isEditing: false,
        lastActive: Date.now(),
      });

      awareness.setRemoteState(67890, {
        user: { id: 'user3', name: 'Another User', color: '#0000FF' },
        cursor: { sheet: 'Sheet2', row: 0, col: 0 },
        isEditing: false,
        lastActive: Date.now(),
      });

      const usersOnSheet1 = awarenessState.getUsersOnSheet('Sheet1');
      expect(usersOnSheet1.length).toBe(1);
      expect(usersOnSheet1[0]?.user.name).toBe('Remote User');
    });

    it('should get editing users', () => {
      awareness.setRemoteState(12345, {
        user: { id: 'user2', name: 'Editing User', color: '#00FF00' },
        isEditing: true,
        editingCell: { sheet: 'Sheet1', row: 0, col: 0 },
        lastActive: Date.now(),
      });

      const editingUsers = awarenessState.getEditingUsers();
      expect(editingUsers.length).toBe(1);
      expect(editingUsers[0]?.user.name).toBe('Editing User');
    });

    it('should check if cell is being edited', () => {
      awareness.setRemoteState(12345, {
        user: { id: 'user2', name: 'Editing User', color: '#00FF00' },
        isEditing: true,
        editingCell: { sheet: 'Sheet1', row: 5, col: 3 },
        lastActive: Date.now(),
      });

      const editor = awarenessState.getCellEditor('Sheet1', 5, 3);
      expect(editor?.user.name).toBe('Editing User');

      const noEditor = awarenessState.getCellEditor('Sheet1', 0, 0);
      expect(noEditor).toBeNull();
    });
  });

  describe('static methods', () => {
    it('should generate consistent colors for user IDs', () => {
      const color1 = AwarenessState.generateUserColor('user1');
      const color2 = AwarenessState.generateUserColor('user1');
      const color3 = AwarenessState.generateUserColor('user2');

      expect(color1).toBe(color2);
      expect(color1).not.toBe(''); // Has a color
      // Different users may get different colors
      expect(typeof color3).toBe('string');
    });

    it('should create user info', () => {
      const userInfo = AwarenessState.createUserInfo('user1', 'Test User');

      expect(userInfo.id).toBe('user1');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.color).toBeDefined();
    });
  });
});

describe('ConflictResolver', () => {
  let ydoc: Y.Doc;
  let resolver: ConflictResolver;

  beforeEach(() => {
    ydoc = new Y.Doc();
    resolver = new ConflictResolver(ydoc);
  });

  afterEach(() => {
    resolver.destroy();
    ydoc.destroy();
  });

  describe('sheet rename collision', () => {
    it('should resolve rename collision by adding suffix', () => {
      const existingNames = new Set(['sheet1', 'sheet2']);
      const result = resolver.resolveSheetRenameCollision('Sheet1', 'sheet-id', existingNames);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe('Sheet1 (1)');
    });

    it('should allow rename if no collision', () => {
      const existingNames = new Set(['sheet1', 'sheet2']);
      const result = resolver.resolveSheetRenameCollision('Sheet3', 'sheet-id', existingNames);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe('Sheet3');
    });

    it('should increment suffix for multiple collisions', () => {
      const existingNames = new Set(['sheet1', 'sheet1 (1)', 'sheet1 (2)']);
      const result = resolver.resolveSheetRenameCollision('Sheet1', 'sheet-id', existingNames);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe('Sheet1 (3)');
    });
  });

  describe('merged region overlap', () => {
    it('should detect overlapping regions', () => {
      const existingRegions: CellRange[] = [
        { start: { row: 0, col: 0 }, end: { row: 5, col: 5 } },
      ];

      const newRegion: CellRange = {
        start: { row: 3, col: 3 },
        end: { row: 8, col: 8 },
      };

      const result = resolver.resolveMergedRegionOverlap(newRegion, existingRegions);

      expect(result.success).toBe(false);
      expect(result.strategy).toBe('keep_remote');
    });

    it('should allow non-overlapping regions', () => {
      const existingRegions: CellRange[] = [
        { start: { row: 0, col: 0 }, end: { row: 5, col: 5 } },
      ];

      const newRegion: CellRange = {
        start: { row: 10, col: 10 },
        end: { row: 15, col: 15 },
      };

      const result = resolver.resolveMergedRegionOverlap(newRegion, existingRegions);

      expect(result.success).toBe(true);
    });
  });

  describe('style conflict resolution', () => {
    it('should merge cell styles', () => {
      const localStyle = {
        font: { bold: true, size: 12 },
        fill: '#FF0000',
      };

      const remoteStyle = {
        font: { italic: true, size: 14 },
        horizontalAlign: 'center' as const,
      };

      const result = resolver.resolveCellStyleConflict(localStyle, remoteStyle);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('merge');

      const merged = result.resolvedValue as {
        font: { bold: boolean; italic: boolean; size: number };
        fill: string;
        horizontalAlign: string;
      };

      expect(merged.font.bold).toBe(true);
      expect(merged.font.italic).toBe(true);
      expect(merged.font.size).toBe(14); // Remote wins
      expect(merged.fill).toBe('#FF0000');
      expect(merged.horizontalAlign).toBe('center');
    });
  });

  describe('formula reference invalidation', () => {
    it('should replace invalid references with #REF!', () => {
      const formula = '=A1+B2+C3';
      const invalidRefs = ['B2'];

      const result = resolver.resolveFormulaReferenceInvalidation(formula, invalidRefs);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe('=A1+#REF!+C3');
    });

    it('should handle multiple invalid references', () => {
      const formula = '=SUM(A1:A10)+B2*C3';
      const invalidRefs = ['A1:A10', 'C3'];

      const result = resolver.resolveFormulaReferenceInvalidation(formula, invalidRefs);

      expect(result.resolvedValue).toContain('#REF!');
    });

    it('should return unchanged formula if no invalid refs', () => {
      const formula = '=A1+B2';
      const invalidRefs: string[] = [];

      const result = resolver.resolveFormulaReferenceInvalidation(formula, invalidRefs);

      expect(result.resolvedValue).toBe(formula);
    });
  });

  describe('conflict notification', () => {
    it('should notify callbacks of conflicts', () => {
      const callback = vi.fn();
      resolver.onConflict(callback);

      const existingNames = new Set(['sheet1']);
      resolver.resolveSheetRenameCollision('Sheet1', 'sheet-id', existingNames);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].type).toBe('sheet_rename_collision');
    });

    it('should maintain conflict history', () => {
      const existingNames = new Set(['sheet1']);
      resolver.resolveSheetRenameCollision('Sheet1', 'id1', existingNames);
      resolver.resolveSheetRenameCollision('Sheet1', 'id2', existingNames);

      const history = resolver.getConflictHistory();
      expect(history.length).toBe(2);
    });

    it('should allow unsubscribing from conflicts', () => {
      const callback = vi.fn();
      const unsubscribe = resolver.onConflict(callback);

      unsubscribe();

      const existingNames = new Set(['sheet1']);
      resolver.resolveSheetRenameCollision('Sheet1', 'sheet-id', existingNames);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Integration: YjsBinding + AwarenessState', () => {
  it('should work together for full collaboration scenario', () => {
    // Create two "users"
    const ydoc1 = new Y.Doc();
    const ydoc2 = new Y.Doc();

    const workbook1 = createWorkbook('Shared');
    const workbook2 = createWorkbook('Shared');

    const binding1 = new YjsBinding(workbook1, ydoc1, { localOrigin: 'user1' });
    const binding2 = new YjsBinding(workbook2, ydoc2, { localOrigin: 'user2' });

    // User 1 initializes
    binding1.initializeFromWorkbook();

    // Sync to user 2
    Y.applyUpdate(ydoc2, Y.encodeStateAsUpdate(ydoc1));
    binding2.syncFromYjs();

    expect(workbook2.sheets[0]?.name).toBe(workbook1.sheets[0]?.name);

    // User 1 makes a change
    const sheetId = workbook1.sheets[0]!.id;
    binding1.setCellValue(sheetId, 0, 0, 'From User 1');

    // Sync to user 2
    Y.applyUpdate(ydoc2, Y.encodeStateAsUpdate(ydoc1));

    // Check that user 2 sees the change
    const ySheets2 = ydoc2.getMap('sheets');
    const ySheet2 = ySheets2.get(sheetId) as Y.Map<unknown>;
    const yCells2 = ySheet2.get('cells') as Y.Map<Y.Map<unknown>>;

    expect(yCells2.get('0,0')?.get('raw')).toBe('From User 1');

    // User 2 makes a change
    binding2.setCellValue(sheetId, 0, 1, 'From User 2');

    // Sync back to user 1
    Y.applyUpdate(ydoc1, Y.encodeStateAsUpdate(ydoc2));

    const ySheets1 = ydoc1.getMap('sheets');
    const ySheet1 = ySheets1.get(sheetId) as Y.Map<unknown>;
    const yCells1 = ySheet1.get('cells') as Y.Map<Y.Map<unknown>>;

    expect(yCells1.get('0,1')?.get('raw')).toBe('From User 2');

    binding1.destroy();
    binding2.destroy();
    ydoc1.destroy();
    ydoc2.destroy();
  });
});
