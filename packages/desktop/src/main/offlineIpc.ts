/**
 * @file Offline IPC handlers
 * @description IPC handlers for offline storage, recent files, and auto-save
 */

import { ipcMain } from 'electron';
import { getOfflineStorage, WorkbookMeta, StorageError } from './offlineStorage';
import { getRecentFiles, RecentFile } from './recentFiles';
import { getAutoSave, RecoveryFile } from './autoSave';
import { WindowManager } from './window';

/** Current workbook data callback for auto-save */
let currentWorkbookDataCallback: (() => Promise<string | null>) | null = null;

/**
 * Sets up all offline-related IPC handlers
 */
export function setupOfflineIpcHandlers(): void {
  const offlineStorage = getOfflineStorage();
  const recentFiles = getRecentFiles();
  const autoSave = getAutoSave();

  // ============================================
  // Offline Storage Handlers
  // ============================================

  /**
   * Saves a workbook to local storage
   */
  ipcMain.handle(
    'offline:saveWorkbook',
    async (_, id: string, data: string, name?: string): Promise<void> => {
      try {
        await offlineStorage.saveWorkbook(id, data, name);
      } catch (error) {
        if (error instanceof StorageError) {
          throw new Error(`Storage error (${error.type}): ${error.message}`);
        }
        throw error;
      }
    }
  );

  /**
   * Loads a workbook from local storage
   */
  ipcMain.handle(
    'offline:loadWorkbook',
    async (_, id: string): Promise<string | null> => {
      try {
        return await offlineStorage.loadWorkbook(id);
      } catch (error) {
        if (error instanceof StorageError) {
          throw new Error(`Storage error (${error.type}): ${error.message}`);
        }
        throw error;
      }
    }
  );

  /**
   * Lists all locally stored workbooks
   */
  ipcMain.handle(
    'offline:listWorkbooks',
    async (): Promise<WorkbookMeta[]> => {
      try {
        return await offlineStorage.listWorkbooks();
      } catch (error) {
        if (error instanceof StorageError) {
          throw new Error(`Storage error (${error.type}): ${error.message}`);
        }
        throw error;
      }
    }
  );

  /**
   * Deletes a workbook from local storage
   */
  ipcMain.handle(
    'offline:deleteWorkbook',
    async (_, id: string): Promise<void> => {
      try {
        await offlineStorage.deleteWorkbook(id);
      } catch (error) {
        if (error instanceof StorageError) {
          throw new Error(`Storage error (${error.type}): ${error.message}`);
        }
        throw error;
      }
    }
  );

  /**
   * Checks if a workbook exists in local storage
   */
  ipcMain.handle(
    'offline:workbookExists',
    async (_, id: string): Promise<boolean> => {
      return await offlineStorage.workbookExists(id);
    }
  );

  /**
   * Gets metadata for a specific workbook
   */
  ipcMain.handle(
    'offline:getWorkbookMeta',
    async (_, id: string): Promise<WorkbookMeta | null> => {
      return await offlineStorage.getWorkbookMeta(id);
    }
  );

  /**
   * Gets storage usage statistics
   */
  ipcMain.handle(
    'offline:getStorageStats',
    async (): Promise<{ totalSize: number; workbookCount: number }> => {
      return await offlineStorage.getStorageStats();
    }
  );

  /**
   * Clears all stored workbooks
   */
  ipcMain.handle(
    'offline:clearAll',
    async (): Promise<void> => {
      await offlineStorage.clearAll();
    }
  );

  // ============================================
  // Recent Files Handlers
  // ============================================

  /**
   * Gets the list of recent files
   */
  ipcMain.handle(
    'recent:getFiles',
    async (): Promise<RecentFile[]> => {
      return await recentFiles.getRecent();
    }
  );

  /**
   * Adds a file to the recent files list
   */
  ipcMain.handle(
    'recent:addFile',
    async (_, filePath: string, name: string): Promise<void> => {
      await recentFiles.addRecent(filePath, name);
    }
  );

  /**
   * Clears all recent files
   */
  ipcMain.handle('recent:clearFiles', (): void => {
    recentFiles.clearRecent();
  });

  /**
   * Removes a specific file from recent files
   */
  ipcMain.handle('recent:removeFile', (_, filePath: string): void => {
    recentFiles.removeRecent(filePath);
  });

  /**
   * Gets the most recently opened file
   */
  ipcMain.handle(
    'recent:getMostRecent',
    (): RecentFile | null => {
      return recentFiles.getMostRecent();
    }
  );

  // ============================================
  // Auto-save Handlers
  // ============================================

  /**
   * Enables or disables auto-save
   */
  ipcMain.handle(
    'autosave:setEnabled',
    async (
      _,
      enabled: boolean,
      options?: {
        workbookId?: string;
        originalPath?: string | null;
        name?: string;
        interval?: number;
      }
    ): Promise<void> => {
      if (enabled) {
        if (!options?.workbookId) {
          throw new Error('workbookId is required when enabling auto-save');
        }

        // Create a callback that requests data from the renderer
        const saveCallback = async (): Promise<string | null> => {
          if (currentWorkbookDataCallback) {
            return await currentWorkbookDataCallback();
          }

          // Request data from renderer via IPC
          const mainWindow = WindowManager.getMainWindow();
          if (!mainWindow) {
            return null;
          }

          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              resolve(null);
            }, 5000);

            // Send request for workbook data
            mainWindow.webContents.send('autosave:requestData');

            // Wait for response
            const handler = (_event: Electron.IpcMainEvent, data: string | null): void => {
              clearTimeout(timeout);
              ipcMain.removeListener('autosave:provideData', handler);
              resolve(data);
            };

            ipcMain.once('autosave:provideData', handler);
          });
        };

        const autoSaveOptions: {
          interval?: number;
          originalPath?: string | null;
          name?: string;
        } = {};

        if (options.interval !== undefined) {
          autoSaveOptions.interval = options.interval;
        }
        if (options.originalPath !== undefined) {
          autoSaveOptions.originalPath = options.originalPath;
        }
        if (options.name !== undefined) {
          autoSaveOptions.name = options.name;
        }

        await autoSave.enableAutoSave(options.workbookId, saveCallback, autoSaveOptions);
      } else {
        autoSave.disableAutoSave();
      }
    }
  );

  /**
   * Gets all recovery files
   */
  ipcMain.handle(
    'autosave:getRecoveryFiles',
    async (): Promise<RecoveryFile[]> => {
      return await autoSave.getRecoveryFiles();
    }
  );

  /**
   * Recovers a file by its ID
   */
  ipcMain.handle(
    'autosave:recoverFile',
    async (_, id: string): Promise<string | null> => {
      return await autoSave.recoverFile(id);
    }
  );

  /**
   * Deletes a recovery file
   */
  ipcMain.handle(
    'autosave:deleteRecoveryFile',
    async (_, id: string): Promise<void> => {
      await autoSave.deleteRecoveryFile(id);
    }
  );

  /**
   * Marks that there are unsaved changes
   */
  ipcMain.handle('autosave:markUnsavedChanges', (): void => {
    autoSave.markUnsavedChanges();
  });

  /**
   * Marks that changes have been saved
   */
  ipcMain.handle('autosave:markSaved', (): void => {
    autoSave.markSaved();
  });

  /**
   * Forces an immediate auto-save
   */
  ipcMain.handle(
    'autosave:forceAutoSave',
    async (): Promise<void> => {
      await autoSave.forceAutoSave();
    }
  );

  /**
   * Checks if auto-save is enabled
   */
  ipcMain.handle('autosave:isEnabled', (): boolean => {
    return autoSave.isAutoSaveEnabled();
  });

  /**
   * Sets the auto-save interval
   */
  ipcMain.handle('autosave:setInterval', (_, intervalMs: number): void => {
    autoSave.setAutoSaveInterval(intervalMs);
  });

  /**
   * Gets the current auto-save interval
   */
  ipcMain.handle('autosave:getInterval', (): number => {
    return autoSave.getAutoSaveInterval();
  });

  /**
   * Clears all recovery files
   */
  ipcMain.handle(
    'autosave:clearAllRecoveryFiles',
    async (): Promise<void> => {
      await autoSave.clearAllRecoveryFiles();
    }
  );

  // ============================================
  // Renderer to Main communication for auto-save data
  // ============================================

  /**
   * Receives workbook data from renderer for auto-save
   */
  ipcMain.on('autosave:provideData', (event, _data: string | null): void => {
    // This is handled by the once listener in setEnabled
    // Just emit it to any waiting handlers
    event.sender.send('autosave:dataReceived');
  });
}

/**
 * Sets a callback function to get workbook data for auto-save
 * This can be used instead of IPC for direct data access
 */
export function setAutoSaveDataCallback(
  callback: (() => Promise<string | null>) | null
): void {
  currentWorkbookDataCallback = callback;
}

/**
 * Initializes offline services on app startup
 */
export async function initializeOfflineServices(): Promise<void> {
  const recentFiles = getRecentFiles();
  const autoSave = getAutoSave();

  // Sync recent files with OS
  await recentFiles.syncWithOS();

  // Clean up old recovery files
  await autoSave.cleanupOldRecoveryFiles();
}

/**
 * Cleans up on app shutdown
 */
export async function cleanupOfflineServices(): Promise<void> {
  const autoSave = getAutoSave();

  // Disable auto-save
  autoSave.disableAutoSave();
}
