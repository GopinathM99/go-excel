/**
 * @file IPC (Inter-Process Communication) handlers
 * @description Handles communication between main and renderer processes
 */

import { app, dialog, ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { WindowManager } from './window';
import { setupOfflineIpcHandlers, initializeOfflineServices } from './offlineIpc';
import {
  showOpenDialog,
  showSaveDialog,
  showSaveAsDialog,
  showExportCsvDialog,
  showUnsavedChangesDialog,
} from './fileDialogs';
import { openFile, saveFile, exportToCsv } from './fileOperations';
import { getDocumentState } from './documentState';

/** File filter definitions for open/save dialogs */
const FILE_FILTERS = {
  excel: [
    { name: 'Excel Workbook', extensions: ['xlsx'] },
    { name: 'Excel 97-2003 Workbook', extensions: ['xls'] },
    { name: 'CSV (Comma delimited)', extensions: ['csv'] },
    { name: 'All Files', extensions: ['*'] },
  ],
  csv: [
    { name: 'CSV (Comma delimited)', extensions: ['csv'] },
    { name: 'All Files', extensions: ['*'] },
  ],
};

/**
 * Result of a file open operation
 */
interface FileOpenResult {
  success: boolean;
  filePath?: string;
  data?: string;
  error?: string;
}

/**
 * Result of a file save operation
 */
interface FileSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Sets up all IPC handlers
 */
export function setupIpcHandlers(): void {
  // Setup offline IPC handlers (storage, recent files, auto-save)
  setupOfflineIpcHandlers();

  // Initialize offline services
  initializeOfflineServices().catch((error) => {
    console.error('Failed to initialize offline services:', error);
  });

  // Setup file operation IPC handlers
  setupFileIpcHandlers();

  // Setup document state IPC handlers
  setupDocumentStateIpcHandlers();

  // ============================================
  // Legacy File Dialog Operations (kept for backward compatibility)
  // ============================================

  /**
   * Opens a file dialog and returns the selected file's contents
   * Note: Actual XLSX parsing will be implemented in Batch 2
   */
  ipcMain.handle('dialog:open', async (): Promise<FileOpenResult> => {
    const mainWindow = WindowManager.getMainWindow();
    if (!mainWindow) {
      return { success: false, error: 'No window available' };
    }

    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Spreadsheet',
        filters: FILE_FILTERS.excel,
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'User cancelled' };
      }

      const filePath = result.filePaths[0]!;

      // For now, read file as buffer - actual parsing will be added later
      // This is a stub that reads the file but doesn't parse XLSX
      const extension = path.extname(filePath).toLowerCase();

      if (extension === '.csv') {
        // CSV can be read as text
        const data = await fs.readFile(filePath, 'utf-8');

        // Add to recent documents
        app.addRecentDocument(filePath);

        // Update window title
        WindowManager.setWindowTitle(path.basename(filePath));

        return {
          success: true,
          filePath,
          data,
        };
      } else {
        // XLSX/XLS - return placeholder for now
        // Full implementation will come in Batch 2 with XLSX library

        app.addRecentDocument(filePath);
        WindowManager.setWindowTitle(path.basename(filePath));

        return {
          success: true,
          filePath,
          data: '', // Placeholder - XLSX parsing not yet implemented
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });

  /**
   * Saves data to the current file path
   * Note: Actual XLSX generation will be implemented in Batch 2
   */
  ipcMain.handle(
    'dialog:save',
    async (_, data: string, currentPath?: string): Promise<FileSaveResult> => {
      if (!currentPath) {
        // No current path, trigger Save As
        return ipcMain.emit('dialog:saveAs', _, data) as unknown as FileSaveResult;
      }

      try {
        // For now, only CSV saving is supported
        const extension = path.extname(currentPath).toLowerCase();

        if (extension === '.csv') {
          await fs.writeFile(currentPath, data, 'utf-8');

          // Mark document as not edited
          const mainWindow = WindowManager.getMainWindow();
          if (mainWindow) {
            mainWindow.setDocumentEdited(false);
          }

          return { success: true, filePath: currentPath };
        } else {
          // XLSX saving not yet implemented
          return {
            success: false,
            error: 'XLSX saving not yet implemented. Please save as CSV.',
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    }
  );

  /**
   * Opens a Save As dialog and saves the data
   */
  ipcMain.handle(
    'dialog:saveAs',
    async (_, data: string): Promise<FileSaveResult> => {
      const mainWindow = WindowManager.getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'No window available' };
      }

      try {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save Spreadsheet',
          filters: FILE_FILTERS.excel,
          defaultPath: 'Untitled.xlsx',
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'User cancelled' };
        }

        const filePath = result.filePath;
        const extension = path.extname(filePath).toLowerCase();

        if (extension === '.csv') {
          await fs.writeFile(filePath, data, 'utf-8');

          app.addRecentDocument(filePath);
          WindowManager.setWindowTitle(path.basename(filePath));
          mainWindow.setDocumentEdited(false);

          return { success: true, filePath };
        } else {
          // XLSX saving not yet implemented
          return {
            success: false,
            error: 'XLSX saving not yet implemented. Please save as CSV.',
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    }
  );

  /**
   * Exports data as CSV
   */
  ipcMain.handle(
    'dialog:exportCsv',
    async (_, data: string): Promise<FileSaveResult> => {
      const mainWindow = WindowManager.getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'No window available' };
      }

      try {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Export as CSV',
          filters: FILE_FILTERS.csv,
          defaultPath: 'export.csv',
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'User cancelled' };
        }

        await fs.writeFile(result.filePath, data, 'utf-8');

        return { success: true, filePath: result.filePath };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
      }
    }
  );

  // ============================================
  // Window Management
  // ============================================

  /**
   * Sets the window title
   */
  ipcMain.handle('window:setTitle', (_, title: string): void => {
    WindowManager.setWindowTitle(title);
  });

  /**
   * Sets the document edited state (shows unsaved indicator on macOS)
   */
  ipcMain.handle('window:setEdited', (_, edited: boolean): void => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.setDocumentEdited(edited);
    }
  });

  /**
   * Minimizes the window
   */
  ipcMain.handle('window:minimize', (): void => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  /**
   * Maximizes or unmaximizes the window
   */
  ipcMain.handle('window:maximize', (): void => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  /**
   * Closes the window
   */
  ipcMain.handle('window:close', (): void => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.close();
    }
  });

  /**
   * Confirms window close (called from renderer after unsaved changes check)
   */
  ipcMain.handle('window:forceClose', (): void => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.setDocumentEdited(false);
      mainWindow.close();
    }
  });

  // ============================================
  // Application Info
  // ============================================

  /**
   * Returns the application version
   */
  ipcMain.handle('app:version', (): string => {
    return app.getVersion();
  });

  /**
   * Returns the current platform
   */
  ipcMain.handle('app:platform', (): NodeJS.Platform => {
    return process.platform;
  });

  /**
   * Returns application paths
   */
  ipcMain.handle('app:paths', (): Record<string, string> => {
    return {
      userData: app.getPath('userData'),
      documents: app.getPath('documents'),
      downloads: app.getPath('downloads'),
      temp: app.getPath('temp'),
    };
  });

  // ============================================
  // Clipboard Operations
  // ============================================

  /**
   * Shows a confirmation dialog
   */
  ipcMain.handle(
    'dialog:confirm',
    async (
      _,
      options: {
        title: string;
        message: string;
        detail?: string;
        buttons?: string[];
        defaultId?: number;
        cancelId?: number;
      }
    ): Promise<number> => {
      const mainWindow = WindowManager.getMainWindow();
      if (!mainWindow) {
        return -1;
      }

      const msgBoxOptions: Electron.MessageBoxOptions = {
        type: 'question',
        title: options.title,
        message: options.message,
        buttons: options.buttons ?? ['OK', 'Cancel'],
        defaultId: options.defaultId ?? 0,
        cancelId: options.cancelId ?? 1,
      };

      if (options.detail !== undefined) {
        msgBoxOptions.detail = options.detail;
      }

      const result = await dialog.showMessageBox(mainWindow, msgBoxOptions);

      return result.response;
    }
  );

  /**
   * Shows an error dialog
   */
  ipcMain.handle(
    'dialog:error',
    async (_, title: string, content: string): Promise<void> => {
      const mainWindow = WindowManager.getMainWindow();
      if (mainWindow) {
        await dialog.showErrorBox(title, content);
      }
    }
  );

  /**
   * Shows an info/message dialog
   */
  ipcMain.handle(
    'dialog:message',
    async (
      _,
      options: {
        type?: 'info' | 'warning' | 'error';
        title: string;
        message: string;
        detail?: string;
      }
    ): Promise<void> => {
      const mainWindow = WindowManager.getMainWindow();
      if (!mainWindow) {
        return;
      }

      const msgOptions: Electron.MessageBoxOptions = {
        type: options.type ?? 'info',
        title: options.title,
        message: options.message,
      };

      if (options.detail !== undefined) {
        msgOptions.detail = options.detail;
      }

      await dialog.showMessageBox(mainWindow, msgOptions);
    }
  );

  // ============================================
  // Print
  // ============================================

  /**
   * Opens the print dialog
   */
  ipcMain.handle('print', async (): Promise<void> => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.print();
    }
  });

  /**
   * Exports to PDF
   */
  ipcMain.handle('print:pdf', async (): Promise<FileSaveResult> => {
    const mainWindow = WindowManager.getMainWindow();
    if (!mainWindow) {
      return { success: false, error: 'No window available' };
    }

    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export as PDF',
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
        defaultPath: 'spreadsheet.pdf',
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'User cancelled' };
      }

      const pdfData = await mainWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
      });

      await fs.writeFile(result.filePath, pdfData);

      return { success: true, filePath: result.filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });
}

/**
 * Sets up file operation IPC handlers
 */
function setupFileIpcHandlers(): void {
  // ============================================
  // File Dialogs (New API)
  // ============================================

  /**
   * Opens file dialog and reads the file
   */
  ipcMain.handle('file:openDialog', async () => {
    const dialogResult = await showOpenDialog();

    if (!dialogResult.selected || !dialogResult.filePath) {
      return null;
    }

    const fileResult = await openFile(dialogResult.filePath);

    if (!fileResult.success || !fileResult.data) {
      return null;
    }

    // Update document state
    const docState = getDocumentState();
    await docState.setDocumentPath(dialogResult.filePath);
    docState.setDocumentDirty(false);

    return {
      path: dialogResult.filePath,
      data: fileResult.data,
      fileType: fileResult.fileType,
    };
  });

  /**
   * Opens save dialog and saves the file
   */
  ipcMain.handle('file:saveDialog', async (_, data: string, defaultName?: string) => {
    const docState = getDocumentState();
    const suggestedName = defaultName || docState.getSuggestedSaveName();

    const dialogResult = await showSaveDialog(suggestedName);

    if (!dialogResult.selected || !dialogResult.filePath) {
      return null;
    }

    const saveResult = await saveFile(dialogResult.filePath, data);

    if (!saveResult.success) {
      return null;
    }

    // Update document state
    await docState.setDocumentPath(dialogResult.filePath);
    docState.setDocumentDirty(false);

    return dialogResult.filePath;
  });

  /**
   * Opens Save As dialog
   */
  ipcMain.handle('file:saveAsDialog', async (_, data: string, currentPath?: string) => {
    const dialogResult = await showSaveAsDialog(currentPath);

    if (!dialogResult.selected || !dialogResult.filePath) {
      return null;
    }

    const saveResult = await saveFile(dialogResult.filePath, data);

    if (!saveResult.success) {
      return null;
    }

    // Update document state
    const docState = getDocumentState();
    await docState.setDocumentPath(dialogResult.filePath);
    docState.setDocumentDirty(false);

    return dialogResult.filePath;
  });

  /**
   * Opens a file at a specific path
   */
  ipcMain.handle('file:open', async (_, filePath: string) => {
    const result = await openFile(filePath);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to open file');
    }

    // Update document state
    const docState = getDocumentState();
    await docState.setDocumentPath(filePath);
    docState.setDocumentDirty(false);

    return result.data;
  });

  /**
   * Saves to a specific path
   */
  ipcMain.handle('file:save', async (_, filePath: string, data: string) => {
    const result = await saveFile(filePath, data);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save file');
    }

    // Update document state
    const docState = getDocumentState();
    docState.setDocumentDirty(false);
  });

  /**
   * Exports as CSV
   */
  ipcMain.handle('file:exportCsv', async (_, sheetData: string, defaultName?: string) => {
    const dialogResult = await showExportCsvDialog(defaultName);

    if (!dialogResult.selected || !dialogResult.filePath) {
      return null;
    }

    const result = await exportToCsv(dialogResult.filePath, sheetData);

    if (!result.success) {
      return null;
    }

    return dialogResult.filePath;
  });

  // ============================================
  // Window Close Handlers
  // ============================================

  /**
   * Confirms window close
   */
  ipcMain.on('window:confirmClose', () => {
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      // Force close without triggering the close event again
      mainWindow.setDocumentEdited(false);
      mainWindow.destroy();
    }
  });

  /**
   * Cancels window close
   */
  ipcMain.on('window:cancelClose', () => {
    // Do nothing - just don't close the window
  });
}

/**
 * Sets up document state IPC handlers
 */
function setupDocumentStateIpcHandlers(): void {
  const docState = getDocumentState();

  /**
   * Sets document dirty state
   */
  ipcMain.on('document:setDirty', (_, dirty: boolean) => {
    docState.setDocumentDirty(dirty);
  });

  /**
   * Sets document path
   */
  ipcMain.on('document:setPath', async (_, filePath: string | null) => {
    await docState.setDocumentPath(filePath);
  });

  /**
   * Gets current document info
   */
  ipcMain.handle('document:getCurrent', () => {
    return docState.getCurrentDocument();
  });

  /**
   * Creates a new document
   */
  ipcMain.on('document:new', () => {
    docState.newDocument();
  });

  /**
   * Shows unsaved changes dialog
   */
  ipcMain.handle('document:showUnsavedDialog', async () => {
    const docInfo = docState.getCurrentDocument();
    return await showUnsavedChangesDialog(docInfo.name);
  });
}
