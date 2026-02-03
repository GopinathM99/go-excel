/**
 * @file Preload script for Electron renderer process
 * @description Exposes a safe, limited API to the renderer through context bridge
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { exposeOfflineAPI } from './offlineApi';
import { exposeFileAPI } from './fileApi';

/** Result of a file open operation */
interface FileOpenResult {
  success: boolean;
  filePath?: string;
  data?: string;
  error?: string;
}

/** Result of a file save operation */
interface FileSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/** Confirmation dialog options */
interface ConfirmDialogOptions {
  title: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

/** Message dialog options */
interface MessageDialogOptions {
  type?: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  detail?: string;
}

/** Application paths */
interface AppPaths {
  userData: string;
  documents: string;
  downloads: string;
  temp: string;
}

/** API exposed to the renderer process */
const electronAPI = {
  // ============================================
  // File Operations
  // ============================================

  /**
   * Opens a file dialog and returns the selected file's contents
   */
  openFile: (): Promise<FileOpenResult> => ipcRenderer.invoke('dialog:open'),

  /**
   * Saves data to the current file path
   */
  saveFile: (data: string, currentPath?: string): Promise<FileSaveResult> =>
    ipcRenderer.invoke('dialog:save', data, currentPath),

  /**
   * Opens a Save As dialog and saves the data
   */
  saveFileAs: (data: string): Promise<FileSaveResult> =>
    ipcRenderer.invoke('dialog:saveAs', data),

  /**
   * Exports data as CSV
   */
  exportCsv: (data: string): Promise<FileSaveResult> =>
    ipcRenderer.invoke('dialog:exportCsv', data),

  // ============================================
  // Window Management
  // ============================================

  /**
   * Sets the window title
   */
  setTitle: (title: string): Promise<void> =>
    ipcRenderer.invoke('window:setTitle', title),

  /**
   * Sets the document edited state (shows unsaved indicator on macOS)
   */
  setDocumentEdited: (edited: boolean): Promise<void> =>
    ipcRenderer.invoke('window:setEdited', edited),

  /**
   * Minimizes the window
   */
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),

  /**
   * Maximizes or unmaximizes the window
   */
  maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),

  /**
   * Closes the window
   */
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),

  /**
   * Force closes the window (after unsaved changes confirmation)
   */
  forceClose: (): Promise<void> => ipcRenderer.invoke('window:forceClose'),

  // ============================================
  // Application Info
  // ============================================

  /**
   * Returns the application version
   */
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  /**
   * Returns the current platform
   */
  getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:platform'),

  /**
   * Returns application paths
   */
  getPaths: (): Promise<AppPaths> => ipcRenderer.invoke('app:paths'),

  // ============================================
  // Dialogs
  // ============================================

  /**
   * Shows a confirmation dialog
   * Returns the index of the clicked button
   */
  confirm: (options: ConfirmDialogOptions): Promise<number> =>
    ipcRenderer.invoke('dialog:confirm', options),

  /**
   * Shows an error dialog
   */
  showError: (title: string, content: string): Promise<void> =>
    ipcRenderer.invoke('dialog:error', title, content),

  /**
   * Shows an info/message dialog
   */
  showMessage: (options: MessageDialogOptions): Promise<void> =>
    ipcRenderer.invoke('dialog:message', options),

  /**
   * Shows unsaved changes dialog
   * Returns 'save' | 'discard' | 'cancel'
   */
  showUnsavedChangesDialog: (): Promise<'save' | 'discard' | 'cancel'> =>
    ipcRenderer.invoke('document:showUnsavedDialog'),

  // ============================================
  // Print
  // ============================================

  /**
   * Opens the print dialog
   */
  print: (): Promise<void> => ipcRenderer.invoke('print'),

  /**
   * Exports to PDF
   */
  exportPdf: (): Promise<FileSaveResult> => ipcRenderer.invoke('print:pdf'),

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Listens for menu actions from the main process
   */
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, action: string): void => {
      callback(action);
    };
    ipcRenderer.on('menu:action', handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },

  /**
   * Listens for file open requests (from drag & drop, file association, etc.)
   */
  onFileOpen: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, filePath: string): void => {
      callback(filePath);
    };
    ipcRenderer.on('file:open-path', handler);

    return () => {
      ipcRenderer.removeListener('file:open-path', handler);
    };
  },

  /**
   * Listens for before-close event (to check for unsaved changes)
   */
  onBeforeClose: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback();
    };
    ipcRenderer.on('app:before-close', handler);

    return () => {
      ipcRenderer.removeListener('app:before-close', handler);
    };
  },

  /**
   * Listens for menu state updates
   */
  onMenuStateUpdate: (
    callback: (state: { canUndo?: boolean; canRedo?: boolean; hasSelection?: boolean }) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      state: { canUndo?: boolean; canRedo?: boolean; hasSelection?: boolean }
    ): void => {
      callback(state);
    };
    ipcRenderer.on('menu:state-update', handler);

    return () => {
      ipcRenderer.removeListener('menu:state-update', handler);
    };
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Expose the offline API to the renderer process
exposeOfflineAPI();

// Expose the file API to the renderer process
exposeFileAPI();

// Type declaration for use in renderer
export type ElectronAPI = typeof electronAPI;

// Also export for type usage
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
