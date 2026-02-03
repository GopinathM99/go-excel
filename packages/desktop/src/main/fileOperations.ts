/**
 * @file File read/write operations with XLSX and CSV support
 * @description Handles reading and writing workbook files
 */

import fs from 'fs/promises';
import path from 'path';
import { readXlsxFromFile, writeXlsxToFile, parseCsv, exportCsv } from '@excel/core';
import type { Workbook } from '@excel/core';
import { showFileErrorDialog } from './fileDialogs';

/**
 * Result of a file read operation
 */
export interface FileReadResult {
  success: boolean;
  data?: string;
  error?: string;
  fileType?: 'xlsx' | 'xls' | 'csv';
}

/**
 * Result of a file write operation
 */
export interface FileWriteResult {
  success: boolean;
  error?: string;
}

/**
 * Opens and reads a file, returning serialized workbook data
 * @param filePath - Path to the file to open
 * @returns FileReadResult with workbook data as JSON string
 */
export async function openFile(filePath: string): Promise<FileReadResult> {
  try {
    // Check if file exists
    await fs.access(filePath);

    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case '.xlsx':
      case '.xls':
        return await openXlsxFile(filePath, extension.slice(1) as 'xlsx' | 'xls');

      case '.csv':
        return await openCsvFile(filePath);

      default:
        return {
          success: false,
          error: `Unsupported file type: ${extension}`,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await showFileErrorDialog(
        'File Not Found',
        `The file "${path.basename(filePath)}" could not be found.`,
        filePath
      );
      return { success: false, error: 'File not found' };
    }

    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      await showFileErrorDialog(
        'Permission Denied',
        `You don't have permission to open "${path.basename(filePath)}".`,
        'Please check the file permissions and try again.'
      );
      return { success: false, error: 'Permission denied' };
    }

    await showFileErrorDialog(
      'Error Opening File',
      `Could not open "${path.basename(filePath)}".`,
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Opens an XLSX/XLS file
 */
async function openXlsxFile(
  filePath: string,
  fileType: 'xlsx' | 'xls'
): Promise<FileReadResult> {
  try {
    const workbook = await readXlsxFromFile(filePath);

    // Serialize workbook for transfer to renderer
    const serialized = serializeWorkbook(workbook);

    return {
      success: true,
      data: serialized,
      fileType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await showFileErrorDialog(
      'Error Reading Excel File',
      `Could not read "${path.basename(filePath)}".`,
      errorMessage
    );

    return {
      success: false,
      error: `Failed to parse Excel file: ${errorMessage}`,
    };
  }
}

/**
 * Opens a CSV file
 */
async function openCsvFile(filePath: string): Promise<FileReadResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.csv');

    // Parse CSV into a sheet
    const result = parseCsv(content, fileName);

    if (!result.success || !result.sheet) {
      return {
        success: false,
        error: 'Failed to parse CSV file',
      };
    }

    // Create a minimal workbook structure with the parsed sheet
    const workbook: Partial<Workbook> = {
      id: crypto.randomUUID(),
      name: fileName,
      sheets: [result.sheet],
      activeSheetIndex: 0,
      namedRanges: [],
      properties: {
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
      styles: [],
      calcMode: 'auto',
      isDirty: false,
    };

    const serialized = serializeWorkbook(workbook as Workbook);

    return {
      success: true,
      data: serialized,
      fileType: 'csv',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await showFileErrorDialog(
      'Error Reading CSV File',
      `Could not read "${path.basename(filePath)}".`,
      errorMessage
    );

    return {
      success: false,
      error: `Failed to read CSV file: ${errorMessage}`,
    };
  }
}

/**
 * Saves workbook data to a file
 * @param filePath - Path to save the file to
 * @param workbookData - Serialized workbook data (JSON string)
 * @returns FileWriteResult
 */
export async function saveFile(
  filePath: string,
  workbookData: string
): Promise<FileWriteResult> {
  try {
    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case '.xlsx':
        return await saveXlsxFile(filePath, workbookData);

      case '.csv':
        return await saveCsvFile(filePath, workbookData);

      default:
        // Default to xlsx if no recognized extension
        return await saveXlsxFile(filePath + '.xlsx', workbookData);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
      await showFileErrorDialog(
        'Disk Full',
        'The file could not be saved because the disk is full.',
        'Please free up some disk space and try again.'
      );
      return { success: false, error: 'Disk full' };
    }

    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      await showFileErrorDialog(
        'Permission Denied',
        `You don't have permission to save to "${path.basename(filePath)}".`,
        'Please check the file permissions or save to a different location.'
      );
      return { success: false, error: 'Permission denied' };
    }

    if ((error as NodeJS.ErrnoException).code === 'EROFS') {
      await showFileErrorDialog(
        'Read-Only File System',
        'The file could not be saved because the file system is read-only.',
        'Please save to a different location.'
      );
      return { success: false, error: 'Read-only file system' };
    }

    await showFileErrorDialog(
      'Error Saving File',
      `Could not save "${path.basename(filePath)}".`,
      errorMessage
    );
    return { success: false, error: errorMessage };
  }
}

/**
 * Saves workbook as XLSX file
 */
async function saveXlsxFile(
  filePath: string,
  workbookData: string
): Promise<FileWriteResult> {
  try {
    const workbook = deserializeWorkbook(workbookData);
    await writeXlsxToFile(workbook, filePath);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to save XLSX file: ${errorMessage}`);
  }
}

/**
 * Saves workbook as CSV file (active sheet only)
 */
async function saveCsvFile(
  filePath: string,
  workbookData: string
): Promise<FileWriteResult> {
  try {
    const workbook = deserializeWorkbook(workbookData);

    if (!workbook.sheets || workbook.sheets.length === 0) {
      throw new Error('No sheets to export');
    }

    // Export the active sheet (or first sheet)
    const activeIndex = workbook.activeSheetIndex ?? 0;
    const sheet = workbook.sheets[activeIndex] ?? workbook.sheets[0];

    if (!sheet) {
      throw new Error('No sheet to export');
    }

    const csvContent = exportCsv(sheet);
    await fs.writeFile(filePath, csvContent, 'utf-8');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to save CSV file: ${errorMessage}`);
  }
}

/**
 * Exports a single sheet as CSV
 * @param filePath - Path to save the CSV file
 * @param sheetData - Serialized sheet data (JSON string)
 * @returns FileWriteResult
 */
export async function exportToCsv(
  filePath: string,
  sheetData: string
): Promise<FileWriteResult> {
  try {
    // Parse the sheet data
    const sheet = JSON.parse(sheetData);

    // Convert to CSV
    const csvContent = exportCsv(sheet);

    // Write to file
    await fs.writeFile(filePath, csvContent, 'utf-8');

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await showFileErrorDialog(
      'Error Exporting CSV',
      'Could not export the sheet as CSV.',
      errorMessage
    );

    return { success: false, error: errorMessage };
  }
}

/**
 * Serializes a workbook for transfer to the renderer
 * Handles Map to Object conversion for JSON serialization
 */
function serializeWorkbook(workbook: Workbook): string {
  // Deep clone and convert Maps to objects
  const serializable = JSON.parse(JSON.stringify(workbook, (_key, value) => {
    if (value instanceof Map) {
      // Convert Map to object with special marker
      const obj: Record<string, unknown> = { __isMap: true };
      for (const [k, v] of value.entries()) {
        obj[String(k)] = v;
      }
      return obj;
    }
    if (value instanceof Set) {
      // Convert Set to array with special marker
      return { __isSet: true, values: Array.from(value) };
    }
    return value;
  }));

  return JSON.stringify(serializable);
}

/**
 * Deserializes workbook data from the renderer
 * Handles Object to Map conversion
 */
function deserializeWorkbook(data: string): Workbook {
  const parsed = JSON.parse(data, (_key, value) => {
    if (value && typeof value === 'object') {
      if (value.__isMap) {
        const map = new Map();
        for (const [k, v] of Object.entries(value)) {
          if (k !== '__isMap') {
            map.set(k, v);
          }
        }
        return map;
      }
      if (value.__isSet) {
        return new Set(value.values);
      }
    }
    return value;
  });

  return parsed as Workbook;
}

/**
 * Checks if a file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file info (size, modification time, etc.)
 */
export async function getFileInfo(filePath: string): Promise<{
  size: number;
  modifiedAt: Date;
  createdAt: Date;
} | null> {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a backup of a file before overwriting
 */
export async function createBackup(filePath: string): Promise<string | null> {
  try {
    const exists = await fileExists(filePath);
    if (!exists) {
      return null;
    }

    const backupPath = filePath + '.bak';
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return null;
  }
}

/**
 * Removes a backup file
 */
export async function removeBackup(backupPath: string): Promise<void> {
  try {
    await fs.unlink(backupPath);
  } catch (error) {
    // Ignore errors when removing backup
    console.error('Failed to remove backup:', error);
  }
}
