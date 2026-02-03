/**
 * @file Native file dialog handlers
 * @description Provides native file dialogs for open, save, and export operations
 */

import { dialog, BrowserWindow, FileFilter } from 'electron';
import path from 'path';
import { WindowManager } from './window';

/** File filter definitions for open/save dialogs */
export const FILE_FILTERS: {
  excelOpen: FileFilter[];
  excelSave: FileFilter[];
  csv: FileFilter[];
} = {
  /** All Excel-compatible file types for opening */
  excelOpen: [
    { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
    { name: 'CSV Files', extensions: ['csv'] },
    { name: 'All Files', extensions: ['*'] },
  ],
  /** Excel workbook format for saving */
  excelSave: [
    { name: 'Excel Workbook', extensions: ['xlsx'] },
    { name: 'CSV (Comma delimited)', extensions: ['csv'] },
  ],
  /** CSV format only */
  csv: [
    { name: 'CSV (Comma delimited)', extensions: ['csv'] },
    { name: 'All Files', extensions: ['*'] },
  ],
};

/**
 * Result of a file dialog operation
 */
export interface FileDialogResult {
  /** Whether a file was selected (not cancelled) */
  selected: boolean;
  /** The selected file path, or null if cancelled */
  filePath: string | null;
  /** The file name without path */
  fileName: string | null;
  /** The file extension (lowercase, without dot) */
  extension: string | null;
}

/**
 * Shows a native file open dialog
 * @returns FileDialogResult with selected file info or null if cancelled
 */
export async function showOpenDialog(): Promise<FileDialogResult> {
  const mainWindow = WindowManager.getMainWindow();
  if (!mainWindow) {
    return { selected: false, filePath: null, fileName: null, extension: null };
  }

  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Spreadsheet',
      filters: FILE_FILTERS.excelOpen,
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { selected: false, filePath: null, fileName: null, extension: null };
    }

    const filePath = result.filePaths[0]!;
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase().slice(1);

    return {
      selected: true,
      filePath,
      fileName,
      extension,
    };
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return { selected: false, filePath: null, fileName: null, extension: null };
  }
}

/**
 * Shows a native save file dialog
 * @param defaultName - Default file name to suggest
 * @returns FileDialogResult with selected file info or null if cancelled
 */
export async function showSaveDialog(defaultName?: string): Promise<FileDialogResult> {
  const mainWindow = WindowManager.getMainWindow();
  if (!mainWindow) {
    return { selected: false, filePath: null, fileName: null, extension: null };
  }

  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Spreadsheet',
      filters: FILE_FILTERS.excelSave,
      defaultPath: defaultName || 'Untitled.xlsx',
    });

    if (result.canceled || !result.filePath) {
      return { selected: false, filePath: null, fileName: null, extension: null };
    }

    const filePath = result.filePath;
    const extension = path.extname(filePath).toLowerCase().slice(1);

    // Ensure file has an extension
    let finalPath = filePath;
    if (!extension) {
      // Default to xlsx if no extension provided
      finalPath = filePath + '.xlsx';
    }

    return {
      selected: true,
      filePath: finalPath,
      fileName: path.basename(finalPath),
      extension: path.extname(finalPath).toLowerCase().slice(1) || 'xlsx',
    };
  } catch (error) {
    console.error('Error showing save dialog:', error);
    return { selected: false, filePath: null, fileName: null, extension: null };
  }
}

/**
 * Shows a native Save As dialog with current path pre-filled
 * @param currentPath - Current file path to use as default
 * @returns FileDialogResult with selected file info or null if cancelled
 */
export async function showSaveAsDialog(currentPath?: string): Promise<FileDialogResult> {
  const mainWindow = WindowManager.getMainWindow();
  if (!mainWindow) {
    return { selected: false, filePath: null, fileName: null, extension: null };
  }

  try {
    // Extract default directory and filename from current path
    let defaultPath = 'Untitled.xlsx';
    if (currentPath) {
      defaultPath = currentPath;
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save As',
      filters: FILE_FILTERS.excelSave,
      defaultPath,
    });

    if (result.canceled || !result.filePath) {
      return { selected: false, filePath: null, fileName: null, extension: null };
    }

    const filePath = result.filePath;
    let extension = path.extname(filePath).toLowerCase().slice(1);

    // Ensure file has an extension
    let finalPath = filePath;
    if (!extension) {
      // Default to xlsx if no extension provided
      finalPath = filePath + '.xlsx';
      extension = 'xlsx';
    }

    return {
      selected: true,
      filePath: finalPath,
      fileName: path.basename(finalPath),
      extension,
    };
  } catch (error) {
    console.error('Error showing save as dialog:', error);
    return { selected: false, filePath: null, fileName: null, extension: null };
  }
}

/**
 * Shows a dialog to export as CSV
 * @param defaultName - Default file name to suggest
 * @returns FileDialogResult with selected file info or null if cancelled
 */
export async function showExportCsvDialog(defaultName?: string): Promise<FileDialogResult> {
  const mainWindow = WindowManager.getMainWindow();
  if (!mainWindow) {
    return { selected: false, filePath: null, fileName: null, extension: null };
  }

  try {
    // Generate default CSV name from current name or use 'export.csv'
    let csvDefaultName = 'export.csv';
    if (defaultName) {
      const baseName = path.basename(defaultName, path.extname(defaultName));
      csvDefaultName = baseName + '.csv';
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export as CSV',
      filters: FILE_FILTERS.csv,
      defaultPath: csvDefaultName,
    });

    if (result.canceled || !result.filePath) {
      return { selected: false, filePath: null, fileName: null, extension: null };
    }

    const filePath = result.filePath;
    let extension = path.extname(filePath).toLowerCase().slice(1);

    // Ensure file has .csv extension
    let finalPath = filePath;
    if (extension !== 'csv') {
      finalPath = filePath + '.csv';
      extension = 'csv';
    }

    return {
      selected: true,
      filePath: finalPath,
      fileName: path.basename(finalPath),
      extension,
    };
  } catch (error) {
    console.error('Error showing export CSV dialog:', error);
    return { selected: false, filePath: null, fileName: null, extension: null };
  }
}

/**
 * Shows an error dialog for file operations
 * @param title - Dialog title
 * @param message - Error message
 * @param detail - Additional details
 */
export async function showFileErrorDialog(
  title: string,
  message: string,
  detail?: string
): Promise<void> {
  const mainWindow = WindowManager.getMainWindow();

  const options: Electron.MessageBoxOptions = {
    type: 'error',
    title,
    message,
    buttons: ['OK'],
  };

  if (detail !== undefined) {
    options.detail = detail;
  }

  await dialog.showMessageBox(mainWindow || (undefined as unknown as BrowserWindow), options);
}

/**
 * Shows an unsaved changes confirmation dialog
 * @param fileName - The name of the file with unsaved changes
 * @returns 'save' | 'discard' | 'cancel'
 */
export async function showUnsavedChangesDialog(
  fileName: string
): Promise<'save' | 'discard' | 'cancel'> {
  const mainWindow = WindowManager.getMainWindow();
  if (!mainWindow) {
    return 'cancel';
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Unsaved Changes',
    message: `Do you want to save changes to "${fileName}"?`,
    detail: 'Your changes will be lost if you don\'t save them.',
    buttons: ['Save', 'Don\'t Save', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
  });

  switch (result.response) {
    case 0:
      return 'save';
    case 1:
      return 'discard';
    default:
      return 'cancel';
  }
}

/**
 * Shows a confirmation dialog for overwriting a file
 * @param fileName - The name of the file to overwrite
 * @returns true if user confirms, false otherwise
 */
export async function showOverwriteConfirmDialog(fileName: string): Promise<boolean> {
  const mainWindow = WindowManager.getMainWindow();
  if (!mainWindow) {
    return false;
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Confirm Save',
    message: `A file named "${fileName}" already exists. Do you want to replace it?`,
    buttons: ['Replace', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });

  return result.response === 0;
}
