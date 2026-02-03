/**
 * @file File API for renderer process
 * @description Exposes file operations API via context bridge
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * Result of opening a file
 */
export interface FileOpenResult {
  /** The file path that was opened */
  path: string;
  /** The workbook data as JSON string */
  data: string;
  /** The file type (xlsx, xls, csv) */
  fileType: 'xlsx' | 'xls' | 'csv';
}

/**
 * Document information
 */
export interface DocumentInfo {
  /** Current file path, or null if new/unsaved */
  path: string | null;
  /** Whether the document has unsaved changes */
  dirty: boolean;
  /** Display name (file name or "Untitled") */
  name: string;
}

/**
 * File API interface exposed to renderer
 */
export interface FileAPI {
  // ============================================
  // File Dialogs
  // ============================================

  /**
   * Opens a file dialog and returns the selected file's contents
   * @returns FileOpenResult or null if cancelled
   */
  openFileDialog(): Promise<FileOpenResult | null>;

  /**
   * Opens a save dialog and saves the data
   * @param data - Workbook data as JSON string
   * @param defaultName - Default file name
   * @returns The saved file path or null if cancelled
   */
  saveFileDialog(data: string, defaultName?: string): Promise<string | null>;

  /**
   * Opens a Save As dialog with current path pre-filled
   * @param data - Workbook data as JSON string
   * @param currentPath - Current file path
   * @returns The saved file path or null if cancelled
   */
  saveAsDialog(data: string, currentPath?: string): Promise<string | null>;

  // ============================================
  // File Operations
  // ============================================

  /**
   * Opens a file at the specified path
   * @param path - File path to open
   * @returns Workbook JSON data
   */
  openFile(path: string): Promise<string>;

  /**
   * Saves workbook data to a file
   * @param path - File path to save to
   * @param data - Workbook data as JSON string
   */
  saveFile(path: string, data: string): Promise<void>;

  /**
   * Exports current sheet as CSV
   * @param sheetData - Sheet data as JSON string
   * @param defaultName - Default file name
   * @returns The saved file path or null if cancelled
   */
  exportCsv(sheetData: string, defaultName?: string): Promise<string | null>;

  // ============================================
  // Document State
  // ============================================

  /**
   * Sets the document dirty state
   * @param dirty - Whether the document has unsaved changes
   */
  setDocumentDirty(dirty: boolean): void;

  /**
   * Sets the current document path
   * @param path - The file path
   */
  setDocumentPath(path: string | null): void;

  /**
   * Gets the current document information
   */
  getCurrentDocument(): Promise<DocumentInfo>;

  /**
   * Creates a new document
   */
  newDocument(): void;

  // ============================================
  // Menu Event Listeners
  // ============================================

  /**
   * Listens for File > New menu action
   */
  onMenuNew(callback: () => void): () => void;

  /**
   * Listens for File > Open menu action
   */
  onMenuOpen(callback: () => void): () => void;

  /**
   * Listens for File > Save menu action
   */
  onMenuSave(callback: () => void): () => void;

  /**
   * Listens for File > Save As menu action
   */
  onMenuSaveAs(callback: () => void): () => void;

  /**
   * Listens for File > Export CSV menu action
   */
  onMenuExportCsv(callback: () => void): () => void;

  /**
   * Listens for before close event to check for unsaved changes
   * Callback should return false to cancel the close
   */
  onBeforeClose(callback: () => Promise<boolean>): () => void;

  /**
   * Confirms that the window can be closed
   * Call this after handling unsaved changes
   */
  confirmClose(): void;

  /**
   * Cancels the close operation
   */
  cancelClose(): void;

  /**
   * Listens for file open requests (from file associations, drag & drop, etc.)
   */
  onFileOpenPath(callback: (filePath: string) => void): () => void;
}

/** The File API implementation */
const fileAPI: FileAPI = {
  // ============================================
  // File Dialogs
  // ============================================

  openFileDialog: async (): Promise<FileOpenResult | null> => {
    return ipcRenderer.invoke('file:openDialog');
  },

  saveFileDialog: async (data: string, defaultName?: string): Promise<string | null> => {
    return ipcRenderer.invoke('file:saveDialog', data, defaultName);
  },

  saveAsDialog: async (data: string, currentPath?: string): Promise<string | null> => {
    return ipcRenderer.invoke('file:saveAsDialog', data, currentPath);
  },

  // ============================================
  // File Operations
  // ============================================

  openFile: async (path: string): Promise<string> => {
    return ipcRenderer.invoke('file:open', path);
  },

  saveFile: async (path: string, data: string): Promise<void> => {
    return ipcRenderer.invoke('file:save', path, data);
  },

  exportCsv: async (sheetData: string, defaultName?: string): Promise<string | null> => {
    return ipcRenderer.invoke('file:exportCsv', sheetData, defaultName);
  },

  // ============================================
  // Document State
  // ============================================

  setDocumentDirty: (dirty: boolean): void => {
    ipcRenderer.send('document:setDirty', dirty);
  },

  setDocumentPath: (path: string | null): void => {
    ipcRenderer.send('document:setPath', path);
  },

  getCurrentDocument: async (): Promise<DocumentInfo> => {
    return ipcRenderer.invoke('document:getCurrent');
  },

  newDocument: (): void => {
    ipcRenderer.send('document:new');
  },

  // ============================================
  // Menu Event Listeners
  // ============================================

  onMenuNew: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, action: string): void => {
      if (action === 'file:new') {
        callback();
      }
    };
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  onMenuOpen: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, action: string): void => {
      if (action === 'file:open') {
        callback();
      }
    };
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  onMenuSave: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, action: string): void => {
      if (action === 'file:save') {
        callback();
      }
    };
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  onMenuSaveAs: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, action: string): void => {
      if (action === 'file:save-as') {
        callback();
      }
    };
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  onMenuExportCsv: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, action: string): void => {
      if (action === 'file:export-csv') {
        callback();
      }
    };
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  onBeforeClose: (callback: () => Promise<boolean>): (() => void) => {
    const handler = async (): Promise<void> => {
      const canClose = await callback();
      if (canClose) {
        ipcRenderer.send('window:confirmClose');
      } else {
        ipcRenderer.send('window:cancelClose');
      }
    };
    ipcRenderer.on('app:before-close', handler);
    return () => {
      ipcRenderer.removeListener('app:before-close', handler);
    };
  },

  confirmClose: (): void => {
    ipcRenderer.send('window:confirmClose');
  },

  cancelClose: (): void => {
    ipcRenderer.send('window:cancelClose');
  },

  onFileOpenPath: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, filePath: string): void => {
      callback(filePath);
    };
    ipcRenderer.on('file:open-path', handler);
    return () => {
      ipcRenderer.removeListener('file:open-path', handler);
    };
  },
};

/**
 * Exposes the File API to the renderer process
 */
export function exposeFileAPI(): void {
  contextBridge.exposeInMainWorld('fileAPI', fileAPI);
}

// Type declaration for use in renderer
declare global {
  interface Window {
    fileAPI: FileAPI;
  }
}
