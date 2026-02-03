/**
 * @file Offline API for renderer process
 * @description Exposes offline storage, recent files, and auto-save APIs via context bridge
 */

import { contextBridge, ipcRenderer } from 'electron';

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

/** API exposed to the renderer process */
const offlineAPI: OfflineAPI = {
  // ============================================
  // Offline Storage
  // ============================================

  /**
   * Saves a workbook to local storage
   */
  saveWorkbookLocally: (id: string, data: string, name?: string): Promise<void> =>
    ipcRenderer.invoke('offline:saveWorkbook', id, data, name),

  /**
   * Loads a workbook from local storage
   */
  loadLocalWorkbook: (id: string): Promise<string | null> =>
    ipcRenderer.invoke('offline:loadWorkbook', id),

  /**
   * Lists all locally stored workbooks
   */
  listLocalWorkbooks: (): Promise<WorkbookMeta[]> =>
    ipcRenderer.invoke('offline:listWorkbooks'),

  /**
   * Deletes a workbook from local storage
   */
  deleteLocalWorkbook: (id: string): Promise<void> =>
    ipcRenderer.invoke('offline:deleteWorkbook', id),

  /**
   * Checks if a workbook exists in local storage
   */
  workbookExists: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('offline:workbookExists', id),

  /**
   * Gets metadata for a specific workbook
   */
  getWorkbookMeta: (id: string): Promise<WorkbookMeta | null> =>
    ipcRenderer.invoke('offline:getWorkbookMeta', id),

  /**
   * Gets storage usage statistics
   */
  getStorageStats: (): Promise<{ totalSize: number; workbookCount: number }> =>
    ipcRenderer.invoke('offline:getStorageStats'),

  /**
   * Clears all stored workbooks
   */
  clearAllWorkbooks: (): Promise<void> =>
    ipcRenderer.invoke('offline:clearAll'),

  // ============================================
  // Recent Files
  // ============================================

  /**
   * Gets the list of recent files
   */
  getRecentFiles: (): Promise<RecentFile[]> =>
    ipcRenderer.invoke('recent:getFiles'),

  /**
   * Adds a file to the recent files list
   */
  addRecentFile: (path: string, name: string): Promise<void> =>
    ipcRenderer.invoke('recent:addFile', path, name),

  /**
   * Clears all recent files
   */
  clearRecentFiles: (): Promise<void> =>
    ipcRenderer.invoke('recent:clearFiles'),

  /**
   * Removes a specific file from recent files
   */
  removeRecentFile: (path: string): Promise<void> =>
    ipcRenderer.invoke('recent:removeFile', path),

  /**
   * Gets the most recently opened file
   */
  getMostRecentFile: (): Promise<RecentFile | null> =>
    ipcRenderer.invoke('recent:getMostRecent'),

  // ============================================
  // Auto-save
  // ============================================

  /**
   * Enables or disables auto-save
   */
  setAutoSaveEnabled: (
    enabled: boolean,
    options?: {
      workbookId?: string;
      originalPath?: string | null;
      name?: string;
      interval?: number;
    }
  ): Promise<void> =>
    ipcRenderer.invoke('autosave:setEnabled', enabled, options),

  /**
   * Gets all recovery files
   */
  getRecoveryFiles: (): Promise<RecoveryFile[]> =>
    ipcRenderer.invoke('autosave:getRecoveryFiles'),

  /**
   * Recovers a file by its ID
   */
  recoverFile: (id: string): Promise<string | null> =>
    ipcRenderer.invoke('autosave:recoverFile', id),

  /**
   * Deletes a recovery file
   */
  deleteRecoveryFile: (id: string): Promise<void> =>
    ipcRenderer.invoke('autosave:deleteRecoveryFile', id),

  /**
   * Marks that there are unsaved changes
   */
  markUnsavedChanges: (): Promise<void> =>
    ipcRenderer.invoke('autosave:markUnsavedChanges'),

  /**
   * Marks that changes have been saved
   */
  markSaved: (): Promise<void> =>
    ipcRenderer.invoke('autosave:markSaved'),

  /**
   * Forces an immediate auto-save
   */
  forceAutoSave: (): Promise<void> =>
    ipcRenderer.invoke('autosave:forceAutoSave'),

  /**
   * Checks if auto-save is enabled
   */
  isAutoSaveEnabled: (): Promise<boolean> =>
    ipcRenderer.invoke('autosave:isEnabled'),

  /**
   * Sets the auto-save interval
   */
  setAutoSaveInterval: (intervalMs: number): Promise<void> =>
    ipcRenderer.invoke('autosave:setInterval', intervalMs),

  /**
   * Gets the current auto-save interval
   */
  getAutoSaveInterval: (): Promise<number> =>
    ipcRenderer.invoke('autosave:getInterval'),

  /**
   * Clears all recovery files
   */
  clearAllRecoveryFiles: (): Promise<void> =>
    ipcRenderer.invoke('autosave:clearAllRecoveryFiles'),
};

/**
 * Exposes the offline API to the renderer process
 */
export function exposeOfflineAPI(): void {
  contextBridge.exposeInMainWorld('offlineAPI', offlineAPI);
}

// Type declaration for use in renderer
declare global {
  interface Window {
    offlineAPI: OfflineAPI;
  }
}
