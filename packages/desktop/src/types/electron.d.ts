/**
 * @file Electron API type declarations
 * @description Type definitions for the Electron API exposed to the renderer
 */

// ============================================
// Offline API Types
// ============================================

/** Metadata for a stored workbook */
export interface WorkbookMeta {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  size: number;
}

/** Recent file entry */
export interface RecentFile {
  path: string;
  name: string;
  lastOpened: string;
}

/** Recovery file metadata */
export interface RecoveryFile {
  id: string;
  originalPath: string | null;
  name: string;
  savedAt: string;
  size: number;
}

/** Offline API interface */
export interface OfflineAPI {
  // Storage
  saveWorkbookLocally(id: string, data: string, name?: string): Promise<void>;
  loadLocalWorkbook(id: string): Promise<string | null>;
  listLocalWorkbooks(): Promise<WorkbookMeta[]>;
  deleteLocalWorkbook(id: string): Promise<void>;
  workbookExists(id: string): Promise<boolean>;
  getWorkbookMeta(id: string): Promise<WorkbookMeta | null>;
  getStorageStats(): Promise<{ totalSize: number; workbookCount: number }>;
  clearAllWorkbooks(): Promise<void>;

  // Recent files
  getRecentFiles(): Promise<RecentFile[]>;
  addRecentFile(path: string, name: string): Promise<void>;
  clearRecentFiles(): Promise<void>;
  removeRecentFile(path: string): Promise<void>;
  getMostRecentFile(): Promise<RecentFile | null>;

  // Auto-save
  setAutoSaveEnabled(
    enabled: boolean,
    options?: {
      workbookId?: string;
      originalPath?: string | null;
      name?: string;
      interval?: number;
    }
  ): Promise<void>;
  getRecoveryFiles(): Promise<RecoveryFile[]>;
  recoverFile(id: string): Promise<string | null>;
  deleteRecoveryFile(id: string): Promise<void>;
  markUnsavedChanges(): Promise<void>;
  markSaved(): Promise<void>;
  forceAutoSave(): Promise<void>;
  isAutoSaveEnabled(): Promise<boolean>;
  setAutoSaveInterval(intervalMs: number): Promise<void>;
  getAutoSaveInterval(): Promise<number>;
  clearAllRecoveryFiles(): Promise<void>;
}

// ============================================
// File API Types
// ============================================

/** Result of opening a file via the new File API */
export interface FileAPIOpenResult {
  /** The file path that was opened */
  path: string;
  /** The workbook data as JSON string */
  data: string;
  /** The file type (xlsx, xls, csv) */
  fileType: 'xlsx' | 'xls' | 'csv';
}

/** Document information */
export interface DocumentInfo {
  /** Current file path, or null if new/unsaved */
  path: string | null;
  /** Whether the document has unsaved changes */
  dirty: boolean;
  /** Display name (file name or "Untitled") */
  name: string;
}

/** File API interface exposed to renderer */
export interface FileAPI {
  // File Dialogs
  openFileDialog(): Promise<FileAPIOpenResult | null>;
  saveFileDialog(data: string, defaultName?: string): Promise<string | null>;
  saveAsDialog(data: string, currentPath?: string): Promise<string | null>;

  // File Operations
  openFile(path: string): Promise<string>;
  saveFile(path: string, data: string): Promise<void>;
  exportCsv(sheetData: string, defaultName?: string): Promise<string | null>;

  // Document State
  setDocumentDirty(dirty: boolean): void;
  setDocumentPath(path: string | null): void;
  getCurrentDocument(): Promise<DocumentInfo>;
  newDocument(): void;

  // Menu Event Listeners
  onMenuNew(callback: () => void): () => void;
  onMenuOpen(callback: () => void): () => void;
  onMenuSave(callback: () => void): () => void;
  onMenuSaveAs(callback: () => void): () => void;
  onMenuExportCsv(callback: () => void): () => void;
  onBeforeClose(callback: () => Promise<boolean>): () => void;
  confirmClose(): void;
  cancelClose(): void;
  onFileOpenPath(callback: (filePath: string) => void): () => void;
}

// ============================================
// Electron API Types
// ============================================

/** Result of a file open operation */
export interface FileOpenResult {
  success: boolean;
  filePath?: string;
  data?: string;
  error?: string;
}

/** Result of a file save operation */
export interface FileSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/** Confirmation dialog options */
export interface ConfirmDialogOptions {
  title: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

/** Message dialog options */
export interface MessageDialogOptions {
  type?: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  detail?: string;
}

/** Application paths */
export interface AppPaths {
  userData: string;
  documents: string;
  downloads: string;
  temp: string;
}

/** Menu actions that can be received from the main process */
export type MenuAction =
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:save-as'
  | 'file:export-csv'
  | 'file:print'
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:cut'
  | 'edit:copy'
  | 'edit:paste'
  | 'edit:select-all'
  | 'edit:find'
  | 'edit:replace'
  | 'view:zoom-in'
  | 'view:zoom-out'
  | 'view:zoom-reset'
  | 'view:toggle-formula-bar'
  | 'view:toggle-gridlines'
  | 'insert:row'
  | 'insert:column'
  | 'insert:chart'
  | 'format:cells'
  | 'format:row-height'
  | 'format:column-width'
  | 'help:about';

/** Menu state for enabling/disabling menu items */
export interface MenuState {
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
}

/** Electron API exposed to the renderer process */
export interface ElectronAPI {
  // File operations (legacy)
  openFile: () => Promise<FileOpenResult>;
  saveFile: (data: string, currentPath?: string) => Promise<FileSaveResult>;
  saveFileAs: (data: string) => Promise<FileSaveResult>;
  exportCsv: (data: string) => Promise<FileSaveResult>;

  // Window management
  setTitle: (title: string) => Promise<void>;
  setDocumentEdited: (edited: boolean) => Promise<void>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  forceClose: () => Promise<void>;

  // Application info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;
  getPaths: () => Promise<AppPaths>;

  // Dialogs
  confirm: (options: ConfirmDialogOptions) => Promise<number>;
  showError: (title: string, content: string) => Promise<void>;
  showMessage: (options: MessageDialogOptions) => Promise<void>;
  showUnsavedChangesDialog: () => Promise<'save' | 'discard' | 'cancel'>;

  // Print
  print: () => Promise<void>;
  exportPdf: () => Promise<FileSaveResult>;

  // Event listeners (return cleanup functions)
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
  onFileOpen: (callback: (filePath: string) => void) => () => void;
  onBeforeClose: (callback: () => void) => () => void;
  onMenuStateUpdate: (callback: (state: MenuState) => void) => () => void;
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    offlineAPI?: OfflineAPI;
    fileAPI?: FileAPI;
  }
}

export {};
