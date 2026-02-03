/**
 * YjsBinding - Bind Yjs CRDT document to spreadsheet model for real-time collaboration
 *
 * This module provides two-way synchronization between the local spreadsheet model
 * and a Yjs document, enabling real-time collaborative editing.
 */

import * as Y from 'yjs';
import { UndoManager as YUndoManager } from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import type { Workbook } from '../models/Workbook';
import type { Sheet } from '../models/Sheet';
import type { Cell } from '../models/Cell';
import type { CellStyle } from '../models/CellStyle';
import type { CellAddress } from '../models/CellAddress';
import type { CellRange } from '../models/CellRange';
import type { CellValue } from '../models/CellValue';
import { cellAddressKey } from '../models/CellAddress';

/**
 * Types of changes that can occur
 */
export type ChangeType =
  | 'cell_value'
  | 'cell_formula'
  | 'cell_style'
  | 'sheet_add'
  | 'sheet_remove'
  | 'sheet_rename'
  | 'sheet_property'
  | 'workbook_property'
  | 'row_insert'
  | 'row_delete'
  | 'column_insert'
  | 'column_delete'
  | 'merged_region_add'
  | 'merged_region_remove';

/**
 * Change event data
 */
export interface Change {
  /** Type of change */
  type: ChangeType;
  /** Sheet ID (if applicable) */
  sheetId?: string;
  /** Cell address (if applicable) */
  address?: CellAddress;
  /** Range affected (if applicable) */
  range?: CellRange;
  /** New value */
  newValue?: unknown;
  /** Old value */
  oldValue?: unknown;
  /** Origin of change ('local' | 'remote' | client ID) */
  origin: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Callback for remote changes
 */
export type RemoteChangeCallback = (changes: Change[]) => void;

/**
 * Callback for connection state changes
 */
export type ConnectionStateCallback = (connected: boolean) => void;

/**
 * Yjs document structure for spreadsheet
 */
interface YSpreadsheetDoc {
  /** Workbook metadata */
  metadata: Y.Map<unknown>;
  /** Sheet order (array of sheet IDs) */
  sheetOrder: Y.Array<string>;
  /** Sheets map (sheetId -> sheet data) */
  sheets: Y.Map<Y.Map<unknown>>;
}

/**
 * Sheet data structure in Yjs
 */
interface YSheetData {
  /** Sheet properties */
  properties: Y.Map<unknown>;
  /** Cells map (cellKey -> cell data) */
  cells: Y.Map<Y.Map<unknown>>;
  /** Column widths */
  columnWidths: Y.Map<number>;
  /** Row heights */
  rowHeights: Y.Map<number>;
  /** Merged regions */
  mergedRegions: Y.Array<unknown>;
}

/**
 * Options for YjsBinding
 */
export interface YjsBindingOptions {
  /** Origin identifier for local changes */
  localOrigin?: string;
  /** Whether to track undo/redo */
  enableUndo?: boolean;
  /** Maximum undo stack size */
  maxUndoStackSize?: number;
  /** Debounce delay for batching changes (ms) */
  batchDelay?: number;
}

/**
 * YjsBinding class - Binds Yjs document to spreadsheet model
 */
export class YjsBinding {
  private workbook: Workbook;
  private ydoc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private undoManager: YUndoManager | null = null;
  private options: Required<YjsBindingOptions>;

  // Yjs data structures
  private yMetadata: Y.Map<unknown>;
  private ySheetOrder: Y.Array<string>;
  private ySheets: Y.Map<Y.Map<unknown>>;

  // Callbacks
  private remoteChangeCallbacks: Set<RemoteChangeCallback>;
  private connectionCallbacks: Set<ConnectionStateCallback>;

  // State tracking
  private isApplyingRemoteChanges = false;
  private pendingChanges: Change[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;
  private isInitialized = false;

  // Observer cleanup
  private observers: Array<() => void> = [];

  /**
   * Creates a new YjsBinding instance
   * @param workbook - The local workbook model
   * @param ydoc - Yjs document to bind to
   * @param options - Configuration options
   */
  constructor(
    workbook: Workbook,
    ydoc: Y.Doc,
    options: YjsBindingOptions = {}
  ) {
    this.workbook = workbook;
    this.ydoc = ydoc;
    this.options = {
      localOrigin: options.localOrigin ?? 'local',
      enableUndo: options.enableUndo ?? true,
      maxUndoStackSize: options.maxUndoStackSize ?? 100,
      batchDelay: options.batchDelay ?? 50,
    };

    this.remoteChangeCallbacks = new Set();
    this.connectionCallbacks = new Set();

    // Initialize Yjs data structures
    this.yMetadata = this.ydoc.getMap('metadata');
    this.ySheetOrder = this.ydoc.getArray('sheetOrder');
    this.ySheets = this.ydoc.getMap('sheets');

    // Set up observers
    this.setupObservers();

    // Initialize undo manager if enabled
    if (this.options.enableUndo) {
      this.setupUndoManager();
    }
  }

  /**
   * Initialize the Yjs document from the workbook
   * Call this once when creating a new collaborative session
   */
  initializeFromWorkbook(): void {
    if (this.isInitialized) return;

    this.ydoc.transact(() => {
      // Set workbook metadata
      this.yMetadata.set('id', this.workbook.id);
      this.yMetadata.set('name', this.workbook.name);
      this.yMetadata.set('calcMode', this.workbook.calcMode);
      this.yMetadata.set('activeSheetIndex', this.workbook.activeSheetIndex);

      // Initialize sheets
      for (const sheet of this.workbook.sheets) {
        this.addSheetToYjs(sheet);
        this.ySheetOrder.push([sheet.id]);
      }
    }, this.options.localOrigin);

    this.isInitialized = true;
  }

  /**
   * Sync local workbook from existing Yjs document
   * Call this when joining an existing collaborative session
   */
  syncFromYjs(): void {
    if (this.isInitialized) return;

    this.isApplyingRemoteChanges = true;
    try {
      // Read workbook metadata
      const name = this.yMetadata.get('name') as string | undefined;
      if (name) {
        this.workbook.name = name;
      }

      const calcMode = this.yMetadata.get('calcMode') as
        | 'auto'
        | 'manual'
        | 'autoExceptTables'
        | undefined;
      if (calcMode) {
        this.workbook.calcMode = calcMode;
      }

      // Read sheets
      const sheetOrder = this.ySheetOrder.toArray();
      const sheets: Sheet[] = [];

      for (const sheetId of sheetOrder) {
        const ySheet = this.ySheets.get(sheetId);
        if (ySheet) {
          const sheet = this.readSheetFromYjs(sheetId, ySheet);
          if (sheet) {
            sheets.push(sheet);
          }
        }
      }

      if (sheets.length > 0) {
        this.workbook.sheets = sheets;
      }

      const activeIndex = this.yMetadata.get('activeSheetIndex') as number | undefined;
      if (typeof activeIndex === 'number' && activeIndex < sheets.length) {
        this.workbook.activeSheetIndex = activeIndex;
      }
    } finally {
      this.isApplyingRemoteChanges = false;
    }

    this.isInitialized = true;
  }

  /**
   * Connect to a WebSocket provider
   * @param provider - y-websocket provider instance
   */
  connect(provider: WebsocketProvider): void {
    if (this.isDestroyed) return;

    this.provider = provider;

    // Listen for connection state changes
    provider.on('status', (event: { status: string }) => {
      const connected = event.status === 'connected';
      this.notifyConnectionState(connected);
    });

    // Handle sync completion
    provider.on('sync', (synced: boolean) => {
      if (synced && !this.isInitialized) {
        // Check if document has data
        if (this.ySheetOrder.length > 0) {
          this.syncFromYjs();
        } else {
          this.initializeFromWorkbook();
        }
      }
    });
  }

  /**
   * Disconnect from the provider
   */
  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider = null;
      this.notifyConnectionState(false);
    }
  }

  /**
   * Set a cell value
   * @param sheetId - Sheet ID
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   * @param value - Raw value to set
   */
  setCellValue(sheetId: string, row: number, col: number, value: string): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    const cellKey = cellAddressKey({ row, col });
    const isFormula = value.startsWith('=');

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>> | undefined;
      if (!yCells) return;

      let yCell = yCells.get(cellKey);
      if (!yCell) {
        yCell = new Y.Map();
        yCells.set(cellKey, yCell);
      }

      yCell.set('raw', value);
      yCell.set('isFormula', isFormula);
      yCell.set('row', row);
      yCell.set('col', col);
    }, this.options.localOrigin);
  }

  /**
   * Set a cell formula
   * @param sheetId - Sheet ID
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   * @param formula - Formula string (without leading '=')
   */
  setCellFormula(sheetId: string, row: number, col: number, formula: string): void {
    this.setCellValue(sheetId, row, col, `=${formula}`);
  }

  /**
   * Set a cell's style
   * @param sheetId - Sheet ID
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   * @param style - Cell style to apply
   */
  setCellStyle(
    sheetId: string,
    row: number,
    col: number,
    style: CellStyle
  ): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    const cellKey = cellAddressKey({ row, col });

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>> | undefined;
      if (!yCells) return;

      let yCell = yCells.get(cellKey);
      if (!yCell) {
        yCell = new Y.Map();
        yCell.set('row', row);
        yCell.set('col', col);
        yCell.set('raw', '');
        yCell.set('isFormula', false);
        yCells.set(cellKey, yCell);
      }

      // Store style as JSON (Yjs maps don't deeply observe nested objects well)
      yCell.set('style', JSON.stringify(style));
    }, this.options.localOrigin);
  }

  /**
   * Set multiple cells at once (batch operation)
   * @param sheetId - Sheet ID
   * @param cells - Array of cell updates
   */
  setCells(
    sheetId: string,
    cells: Array<{ row: number; col: number; value: string; style?: CellStyle }>
  ): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>> | undefined;
      if (!yCells) return;

      for (const cell of cells) {
        const cellKey = cellAddressKey({ row: cell.row, col: cell.col });
        const isFormula = cell.value.startsWith('=');

        let yCell = yCells.get(cellKey);
        if (!yCell) {
          yCell = new Y.Map();
          yCells.set(cellKey, yCell);
        }

        yCell.set('raw', cell.value);
        yCell.set('isFormula', isFormula);
        yCell.set('row', cell.row);
        yCell.set('col', cell.col);

        if (cell.style) {
          yCell.set('style', JSON.stringify(cell.style));
        }
      }
    }, this.options.localOrigin);
  }

  /**
   * Delete a cell
   * @param sheetId - Sheet ID
   * @param row - Row index
   * @param col - Column index
   */
  deleteCell(sheetId: string, row: number, col: number): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    const cellKey = cellAddressKey({ row, col });

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>> | undefined;
      if (!yCells) return;

      yCells.delete(cellKey);
    }, this.options.localOrigin);
  }

  /**
   * Add a new sheet
   * @param name - Sheet name
   * @returns ID of the new sheet
   */
  addSheet(name: string): string {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return '';

    const sheetId = this.generateId();

    this.ydoc.transact(() => {
      // Create sheet data structure
      const ySheet = new Y.Map<unknown>();
      const yProperties = new Y.Map<unknown>();
      const yCells = new Y.Map<Y.Map<unknown>>();
      const yColumnWidths = new Y.Map<number>();
      const yRowHeights = new Y.Map<number>();
      const yMergedRegions = new Y.Array<unknown>();

      yProperties.set('id', sheetId);
      yProperties.set('name', name);
      yProperties.set('zoom', 100);
      yProperties.set('showGridlines', true);
      yProperties.set('showHeaders', true);

      ySheet.set('properties', yProperties);
      ySheet.set('cells', yCells);
      ySheet.set('columnWidths', yColumnWidths);
      ySheet.set('rowHeights', yRowHeights);
      ySheet.set('mergedRegions', yMergedRegions);

      this.ySheets.set(sheetId, ySheet);
      this.ySheetOrder.push([sheetId]);
    }, this.options.localOrigin);

    return sheetId;
  }

  /**
   * Remove a sheet
   * @param sheetId - ID of sheet to remove
   */
  removeSheet(sheetId: string): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      // Remove from sheets map
      this.ySheets.delete(sheetId);

      // Remove from order array
      const index = this.ySheetOrder.toArray().indexOf(sheetId);
      if (index !== -1) {
        this.ySheetOrder.delete(index, 1);
      }
    }, this.options.localOrigin);
  }

  /**
   * Rename a sheet
   * @param sheetId - Sheet ID
   * @param newName - New name
   */
  renameSheet(sheetId: string, newName: string): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yProperties = ySheet.get('properties') as Y.Map<unknown> | undefined;
      if (!yProperties) return;

      yProperties.set('name', newName);
    }, this.options.localOrigin);
  }

  /**
   * Set column width
   * @param sheetId - Sheet ID
   * @param col - Column index
   * @param width - Width in pixels
   */
  setColumnWidth(sheetId: string, col: number, width: number): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yColumnWidths = ySheet.get('columnWidths') as Y.Map<number> | undefined;
      if (!yColumnWidths) return;

      yColumnWidths.set(col.toString(), width);
    }, this.options.localOrigin);
  }

  /**
   * Set row height
   * @param sheetId - Sheet ID
   * @param row - Row index
   * @param height - Height in pixels
   */
  setRowHeight(sheetId: string, row: number, height: number): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yRowHeights = ySheet.get('rowHeights') as Y.Map<number> | undefined;
      if (!yRowHeights) return;

      yRowHeights.set(row.toString(), height);
    }, this.options.localOrigin);
  }

  /**
   * Add a merged region
   * @param sheetId - Sheet ID
   * @param range - Range to merge
   */
  addMergedRegion(sheetId: string, range: CellRange): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yMergedRegions = ySheet.get('mergedRegions') as Y.Array<unknown> | undefined;
      if (!yMergedRegions) return;

      yMergedRegions.push([JSON.stringify(range)]);
    }, this.options.localOrigin);
  }

  /**
   * Remove a merged region
   * @param sheetId - Sheet ID
   * @param range - Range to unmerge
   */
  removeMergedRegion(sheetId: string, range: CellRange): void {
    if (this.isDestroyed || this.isApplyingRemoteChanges) return;

    this.ydoc.transact(() => {
      const ySheet = this.ySheets.get(sheetId);
      if (!ySheet) return;

      const yMergedRegions = ySheet.get('mergedRegions') as Y.Array<unknown> | undefined;
      if (!yMergedRegions) return;

      const rangeStr = JSON.stringify(range);
      const regions = yMergedRegions.toArray();
      const index = regions.findIndex((r) => r === rangeStr);

      if (index !== -1) {
        yMergedRegions.delete(index, 1);
      }
    }, this.options.localOrigin);
  }

  /**
   * Register a callback for remote changes
   * @param callback - Function to call when remote changes occur
   * @returns Unsubscribe function
   */
  onRemoteChange(callback: RemoteChangeCallback): () => void {
    this.remoteChangeCallbacks.add(callback);
    return () => {
      this.remoteChangeCallbacks.delete(callback);
    };
  }

  /**
   * Register a callback for connection state changes
   * @param callback - Function to call when connection state changes
   * @returns Unsubscribe function
   */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Undo the last operation
   */
  undo(): void {
    if (this.undoManager && this.undoManager.canUndo()) {
      this.undoManager.undo();
    }
  }

  /**
   * Redo the last undone operation
   */
  redo(): void {
    if (this.undoManager && this.undoManager.canRedo()) {
      this.undoManager.redo();
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoManager?.canUndo() ?? false;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.undoManager?.canRedo() ?? false;
  }

  /**
   * Get the Yjs document
   */
  getYDoc(): Y.Doc {
    return this.ydoc;
  }

  /**
   * Get the local workbook reference
   */
  getWorkbook(): Workbook {
    return this.workbook;
  }

  /**
   * Check if connected to provider
   */
  isConnected(): boolean {
    return this.provider?.wsconnected ?? false;
  }

  /**
   * Clean up and destroy the binding
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Remove observers
    for (const cleanup of this.observers) {
      cleanup();
    }
    this.observers = [];

    // Destroy undo manager
    if (this.undoManager) {
      this.undoManager.destroy();
      this.undoManager = null;
    }

    // Disconnect provider
    this.disconnect();

    // Clear callbacks
    this.remoteChangeCallbacks.clear();
    this.connectionCallbacks.clear();
  }

  // ============ Private Methods ============

  /**
   * Set up Yjs observers for remote changes
   */
  private setupObservers(): void {
    // Observe metadata changes
    const metadataObserver = (event: Y.YMapEvent<unknown>) => {
      if (this.isApplyingRemoteChanges || event.transaction.origin === this.options.localOrigin) {
        return;
      }

      this.isApplyingRemoteChanges = true;
      try {
        for (const [key, change] of event.changes.keys) {
          if (key === 'name' && change.action === 'update') {
            this.workbook.name = this.yMetadata.get('name') as string;
            this.queueChange({
              type: 'workbook_property',
              newValue: this.workbook.name,
              oldValue: change.oldValue,
              origin: String(event.transaction.origin ?? 'remote'),
              timestamp: Date.now(),
            });
          }
        }
      } finally {
        this.isApplyingRemoteChanges = false;
      }
    };
    this.yMetadata.observe(metadataObserver);
    this.observers.push(() => this.yMetadata.unobserve(metadataObserver));

    // Observe sheet order changes
    const sheetOrderObserver = (event: Y.YArrayEvent<string>) => {
      if (this.isApplyingRemoteChanges || event.transaction.origin === this.options.localOrigin) {
        return;
      }

      this.handleSheetOrderChange(event);
    };
    this.ySheetOrder.observe(sheetOrderObserver);
    this.observers.push(() => this.ySheetOrder.unobserve(sheetOrderObserver));

    // Observe sheets map changes
    const sheetsObserver = (event: Y.YMapEvent<Y.Map<unknown>>) => {
      if (this.isApplyingRemoteChanges || event.transaction.origin === this.options.localOrigin) {
        return;
      }

      this.handleSheetsChange(event);
    };
    this.ySheets.observe(sheetsObserver);
    this.observers.push(() => this.ySheets.unobserve(sheetsObserver));

    // Deep observe for cell changes
    const deepObserver = (events: Y.YEvent<unknown>[]) => {
      for (const event of events) {
        if (event.transaction.origin === this.options.localOrigin) {
          continue;
        }

        this.handleDeepChange(event);
      }
    };
    this.ySheets.observeDeep(deepObserver);
    this.observers.push(() => this.ySheets.unobserveDeep(deepObserver));
  }

  /**
   * Set up the undo manager
   */
  private setupUndoManager(): void {
    // Track cells and properties for undo
    const trackedTypes = new Set<Y.Map<unknown> | Y.Array<unknown>>();
    trackedTypes.add(this.yMetadata);
    trackedTypes.add(this.ySheetOrder);
    trackedTypes.add(this.ySheets);

    this.undoManager = new YUndoManager(Array.from(trackedTypes), {
      trackedOrigins: new Set([this.options.localOrigin]),
    });
  }

  /**
   * Add a sheet to Yjs from a Sheet object
   */
  private addSheetToYjs(sheet: Sheet): void {
    const ySheet = new Y.Map<unknown>();
    const yProperties = new Y.Map<unknown>();
    const yCells = new Y.Map<Y.Map<unknown>>();
    const yColumnWidths = new Y.Map<number>();
    const yRowHeights = new Y.Map<number>();
    const yMergedRegions = new Y.Array<unknown>();

    // Set properties
    yProperties.set('id', sheet.id);
    yProperties.set('name', sheet.name);
    yProperties.set('zoom', sheet.zoom);
    yProperties.set('showGridlines', sheet.showGridlines);
    yProperties.set('showHeaders', sheet.showHeaders);
    yProperties.set('hidden', sheet.hidden ?? false);
    if (sheet.tabColor) {
      yProperties.set('tabColor', sheet.tabColor);
    }

    // Set cells
    for (const [key, cell] of sheet.cells) {
      const yCell = new Y.Map<unknown>();
      yCell.set('row', cell.address.row);
      yCell.set('col', cell.address.col);
      yCell.set('raw', cell.content.raw);
      yCell.set('isFormula', cell.content.isFormula);
      if (cell.style) {
        yCell.set('style', JSON.stringify(cell.style));
      }
      yCells.set(key, yCell);
    }

    // Set column widths
    for (const [col, width] of sheet.columnWidths) {
      yColumnWidths.set(col.toString(), width);
    }

    // Set row heights
    for (const [row, height] of sheet.rowHeights) {
      yRowHeights.set(row.toString(), height);
    }

    // Set merged regions
    for (const region of sheet.mergedRegions) {
      yMergedRegions.push([JSON.stringify(region.range)]);
    }

    ySheet.set('properties', yProperties);
    ySheet.set('cells', yCells);
    ySheet.set('columnWidths', yColumnWidths);
    ySheet.set('rowHeights', yRowHeights);
    ySheet.set('mergedRegions', yMergedRegions);

    this.ySheets.set(sheet.id, ySheet);
  }

  /**
   * Read a sheet from Yjs data
   */
  private readSheetFromYjs(sheetId: string, ySheet: Y.Map<unknown>): Sheet | null {
    const yProperties = ySheet.get('properties') as Y.Map<unknown> | undefined;
    if (!yProperties) return null;

    const sheet: Sheet = {
      id: sheetId,
      name: (yProperties.get('name') as string) ?? 'Sheet',
      cells: new Map(),
      columnWidths: new Map(),
      rowHeights: new Map(),
      hiddenColumns: new Set(),
      hiddenRows: new Set(),
      mergedRegions: [],
      conditionalFormats: [],
      charts: [],
      columnStyles: new Map(),
      rowStyles: new Map(),
      zoom: (yProperties.get('zoom') as number) ?? 100,
      showGridlines: (yProperties.get('showGridlines') as boolean) ?? true,
      showHeaders: (yProperties.get('showHeaders') as boolean) ?? true,
      hidden: (yProperties.get('hidden') as boolean) ?? false,
      tabColor: yProperties.get('tabColor') as string | undefined,
    };

    // Read cells
    const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>> | undefined;
    if (yCells) {
      for (const [key, yCell] of yCells) {
        const cell = this.readCellFromYjs(yCell);
        if (cell) {
          sheet.cells.set(key, cell);
        }
      }
    }

    // Read column widths
    const yColumnWidths = ySheet.get('columnWidths') as Y.Map<number> | undefined;
    if (yColumnWidths) {
      for (const [col, width] of yColumnWidths) {
        sheet.columnWidths.set(parseInt(col, 10), width);
      }
    }

    // Read row heights
    const yRowHeights = ySheet.get('rowHeights') as Y.Map<number> | undefined;
    if (yRowHeights) {
      for (const [row, height] of yRowHeights) {
        sheet.rowHeights.set(parseInt(row, 10), height);
      }
    }

    // Read merged regions
    const yMergedRegions = ySheet.get('mergedRegions') as Y.Array<unknown> | undefined;
    if (yMergedRegions) {
      for (const regionStr of yMergedRegions) {
        try {
          const range = JSON.parse(regionStr as string) as CellRange;
          sheet.mergedRegions.push({ range });
        } catch {
          // Skip invalid regions
        }
      }
    }

    return sheet;
  }

  /**
   * Read a cell from Yjs data
   */
  private readCellFromYjs(yCell: Y.Map<unknown>): Cell | null {
    const row = yCell.get('row') as number | undefined;
    const col = yCell.get('col') as number | undefined;

    if (typeof row !== 'number' || typeof col !== 'number') {
      return null;
    }

    const raw = (yCell.get('raw') as string) ?? '';
    const isFormula = (yCell.get('isFormula') as boolean) ?? false;
    const styleStr = yCell.get('style') as string | undefined;

    let style: CellStyle | undefined;
    if (styleStr) {
      try {
        style = JSON.parse(styleStr) as CellStyle;
      } catch {
        // Skip invalid style
      }
    }

    // Import CellValue type - use empty value for now
    const value: CellValue = { type: 'empty' };

    return {
      address: { row, col },
      content: { raw, isFormula },
      value,
      style,
    };
  }

  /**
   * Handle sheet order changes
   */
  private handleSheetOrderChange(event: Y.YArrayEvent<string>): void {
    this.isApplyingRemoteChanges = true;
    try {
      // Handle additions
      for (const item of event.changes.added) {
        const sheetId = item.content.getContent()[0] as string;
        const ySheet = this.ySheets.get(sheetId);

        if (ySheet && !this.workbook.sheets.find((s) => s.id === sheetId)) {
          const sheet = this.readSheetFromYjs(sheetId, ySheet);
          if (sheet) {
            this.workbook.sheets.push(sheet);
            this.queueChange({
              type: 'sheet_add',
              sheetId,
              newValue: sheet.name,
              origin: 'remote',
              timestamp: Date.now(),
            });
          }
        }
      }

      // Handle deletions
      for (const item of event.changes.deleted) {
        const sheetId = item.content.getContent()[0] as string;
        const index = this.workbook.sheets.findIndex((s) => s.id === sheetId);

        if (index !== -1) {
          const removed = this.workbook.sheets.splice(index, 1)[0];
          this.queueChange({
            type: 'sheet_remove',
            sheetId,
            oldValue: removed?.name,
            origin: 'remote',
            timestamp: Date.now(),
          });
        }
      }
    } finally {
      this.isApplyingRemoteChanges = false;
    }
  }

  /**
   * Handle sheets map changes
   */
  private handleSheetsChange(event: Y.YMapEvent<Y.Map<unknown>>): void {
    // This is handled by sheetOrder observer
  }

  /**
   * Handle deep changes (cell updates, etc.)
   */
  private handleDeepChange(event: Y.YEvent<unknown>): void {
    if (this.isApplyingRemoteChanges) return;

    this.isApplyingRemoteChanges = true;
    try {
      const path = event.path;

      // Determine what changed based on path
      if (path.length >= 2) {
        const sheetId = path[0] as string;
        const section = path[1] as string;

        if (section === 'cells' && event instanceof Y.YMapEvent) {
          this.handleCellsChange(sheetId, event as Y.YMapEvent<Y.Map<unknown>>);
        } else if (section === 'properties' && event instanceof Y.YMapEvent) {
          this.handlePropertiesChange(sheetId, event as Y.YMapEvent<unknown>);
        }
      }
    } finally {
      this.isApplyingRemoteChanges = false;
    }
  }

  /**
   * Handle cell changes
   */
  private handleCellsChange(sheetId: string, event: Y.YMapEvent<Y.Map<unknown>>): void {
    const sheet = this.workbook.sheets.find((s) => s.id === sheetId);
    if (!sheet) return;

    const ySheet = this.ySheets.get(sheetId);
    if (!ySheet) return;

    const yCells = ySheet.get('cells') as Y.Map<Y.Map<unknown>> | undefined;
    if (!yCells) return;

    for (const [key, change] of event.changes.keys) {
      if (change.action === 'add' || change.action === 'update') {
        const yCell = yCells.get(key);
        if (yCell) {
          const cell = this.readCellFromYjs(yCell);
          if (cell) {
            sheet.cells.set(key, cell);
            this.queueChange({
              type: cell.content.isFormula ? 'cell_formula' : 'cell_value',
              sheetId,
              address: cell.address,
              newValue: cell.content.raw,
              origin: 'remote',
              timestamp: Date.now(),
            });
          }
        }
      } else if (change.action === 'delete') {
        const oldCell = sheet.cells.get(key);
        sheet.cells.delete(key);
        this.queueChange({
          type: 'cell_value',
          sheetId,
          oldValue: oldCell?.content.raw,
          origin: 'remote',
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Handle sheet properties changes
   */
  private handlePropertiesChange(sheetId: string, event: Y.YMapEvent<unknown>): void {
    const sheet = this.workbook.sheets.find((s) => s.id === sheetId);
    if (!sheet) return;

    for (const [key, change] of event.changes.keys) {
      if (key === 'name' && (change.action === 'add' || change.action === 'update')) {
        const ySheet = this.ySheets.get(sheetId);
        const yProperties = ySheet?.get('properties') as Y.Map<unknown> | undefined;
        const newName = yProperties?.get('name') as string;

        if (newName) {
          sheet.name = newName;
          this.queueChange({
            type: 'sheet_rename',
            sheetId,
            newValue: newName,
            oldValue: change.oldValue,
            origin: 'remote',
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  /**
   * Queue a change for batched notification
   */
  private queueChange(change: Change): void {
    this.pendingChanges.push(change);

    // Debounce notifications
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushChanges();
    }, this.options.batchDelay);
  }

  /**
   * Flush pending changes to callbacks
   */
  private flushChanges(): void {
    if (this.pendingChanges.length === 0) return;

    const changes = [...this.pendingChanges];
    this.pendingChanges = [];

    for (const callback of this.remoteChangeCallbacks) {
      try {
        callback(changes);
      } catch (error) {
        console.error('Error in remote change callback:', error);
      }
    }
  }

  /**
   * Notify connection state callbacks
   */
  private notifyConnectionState(connected: boolean): void {
    for (const callback of this.connectionCallbacks) {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
