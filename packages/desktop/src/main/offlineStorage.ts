/**
 * @file Offline storage for workbooks
 * @description Provides local file storage for offline workbook persistence
 */

import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

/** Metadata for a stored workbook */
export interface WorkbookMeta {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  size: number;
}

/** Storage error types */
export type StorageErrorType =
  | 'DISK_FULL'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_DATA'
  | 'UNKNOWN';

/** Custom error for storage operations */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly type: StorageErrorType,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * OfflineStorage class for managing local workbook storage
 */
export class OfflineStorage {
  private static instance: OfflineStorage | null = null;
  private storagePath: string;
  private metaFilePath: string;
  private initialized: boolean = false;

  private constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'workbooks');
    this.metaFilePath = path.join(this.storagePath, 'meta.json');
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  /**
   * Initializes the storage directory
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.storagePath, { recursive: true });

      // Initialize meta file if it doesn't exist
      try {
        await fs.access(this.metaFilePath);
      } catch {
        await fs.writeFile(this.metaFilePath, JSON.stringify({ workbooks: {} }), 'utf-8');
      }

      this.initialized = true;
    } catch (error) {
      throw this.mapError(error, 'Failed to initialize storage');
    }
  }

  /**
   * Maps filesystem errors to StorageError
   */
  private mapError(error: unknown, context: string): StorageError {
    if (error instanceof StorageError) {
      return error;
    }

    const fsError = error as NodeJS.ErrnoException;
    let type: StorageErrorType = 'UNKNOWN';
    let message = context;

    switch (fsError.code) {
      case 'ENOSPC':
        type = 'DISK_FULL';
        message = 'Disk is full. Please free up space and try again.';
        break;
      case 'EACCES':
      case 'EPERM':
        type = 'PERMISSION_DENIED';
        message = 'Permission denied. Please check file permissions.';
        break;
      case 'ENOENT':
        type = 'NOT_FOUND';
        message = 'File or directory not found.';
        break;
      default:
        message = `${context}: ${fsError.message || 'Unknown error'}`;
    }

    return new StorageError(message, type, fsError instanceof Error ? fsError : undefined);
  }

  /**
   * Reads the metadata file
   */
  private async readMeta(): Promise<{ workbooks: Record<string, WorkbookMeta> }> {
    try {
      const content = await fs.readFile(this.metaFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // If parsing fails, return empty
      return { workbooks: {} };
    }
  }

  /**
   * Writes the metadata file
   */
  private async writeMeta(meta: { workbooks: Record<string, WorkbookMeta> }): Promise<void> {
    await fs.writeFile(this.metaFilePath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  /**
   * Generates a safe filename from workbook ID
   */
  private getWorkbookPath(id: string): string {
    // Sanitize the ID to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.storagePath, `${safeId}.json`);
  }

  /**
   * Saves a workbook to local storage
   */
  async saveWorkbook(id: string, data: string, name?: string): Promise<void> {
    await this.initialize();

    if (!id || typeof id !== 'string') {
      throw new StorageError('Invalid workbook ID', 'INVALID_DATA');
    }

    if (!data || typeof data !== 'string') {
      throw new StorageError('Invalid workbook data', 'INVALID_DATA');
    }

    try {
      const workbookPath = this.getWorkbookPath(id);
      const now = new Date().toISOString();

      // Write the workbook data
      await fs.writeFile(workbookPath, data, 'utf-8');

      // Update metadata
      const meta = await this.readMeta();
      const existingMeta = meta.workbooks[id];

      meta.workbooks[id] = {
        id,
        name: name || existingMeta?.name || `Workbook ${id}`,
        createdAt: existingMeta?.createdAt || now,
        modifiedAt: now,
        size: Buffer.byteLength(data, 'utf-8'),
      };

      await this.writeMeta(meta);
    } catch (error) {
      throw this.mapError(error, 'Failed to save workbook');
    }
  }

  /**
   * Loads a workbook from local storage
   */
  async loadWorkbook(id: string): Promise<string | null> {
    await this.initialize();

    if (!id || typeof id !== 'string') {
      throw new StorageError('Invalid workbook ID', 'INVALID_DATA');
    }

    try {
      const workbookPath = this.getWorkbookPath(id);
      const data = await fs.readFile(workbookPath, 'utf-8');
      return data;
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code === 'ENOENT') {
        return null;
      }
      throw this.mapError(error, 'Failed to load workbook');
    }
  }

  /**
   * Lists all locally stored workbooks
   */
  async listWorkbooks(): Promise<WorkbookMeta[]> {
    await this.initialize();

    try {
      const meta = await this.readMeta();
      const workbooks = Object.values(meta.workbooks);

      // Verify files still exist and clean up orphaned metadata
      const validWorkbooks: WorkbookMeta[] = [];
      const orphanedIds: string[] = [];

      for (const workbook of workbooks) {
        try {
          await fs.access(this.getWorkbookPath(workbook.id));
          validWorkbooks.push(workbook);
        } catch {
          orphanedIds.push(workbook.id);
        }
      }

      // Clean up orphaned metadata
      if (orphanedIds.length > 0) {
        for (const id of orphanedIds) {
          delete meta.workbooks[id];
        }
        await this.writeMeta(meta);
      }

      // Sort by modified date (newest first)
      return validWorkbooks.sort(
        (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
      );
    } catch (error) {
      throw this.mapError(error, 'Failed to list workbooks');
    }
  }

  /**
   * Deletes a workbook from local storage
   */
  async deleteWorkbook(id: string): Promise<void> {
    await this.initialize();

    if (!id || typeof id !== 'string') {
      throw new StorageError('Invalid workbook ID', 'INVALID_DATA');
    }

    try {
      const workbookPath = this.getWorkbookPath(id);

      // Delete the file
      try {
        await fs.unlink(workbookPath);
      } catch (error) {
        const fsError = error as NodeJS.ErrnoException;
        if (fsError.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, continue to clean up metadata
      }

      // Remove from metadata
      const meta = await this.readMeta();
      delete meta.workbooks[id];
      await this.writeMeta(meta);
    } catch (error) {
      throw this.mapError(error, 'Failed to delete workbook');
    }
  }

  /**
   * Checks if a workbook exists in local storage
   */
  async workbookExists(id: string): Promise<boolean> {
    await this.initialize();

    try {
      const workbookPath = this.getWorkbookPath(id);
      await fs.access(workbookPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets metadata for a specific workbook
   */
  async getWorkbookMeta(id: string): Promise<WorkbookMeta | null> {
    await this.initialize();

    try {
      const meta = await this.readMeta();
      return meta.workbooks[id] || null;
    } catch {
      return null;
    }
  }

  /**
   * Gets the storage path
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * Gets storage usage statistics
   */
  async getStorageStats(): Promise<{ totalSize: number; workbookCount: number }> {
    await this.initialize();

    try {
      const meta = await this.readMeta();
      const workbooks = Object.values(meta.workbooks);

      return {
        totalSize: workbooks.reduce((sum, wb) => sum + wb.size, 0),
        workbookCount: workbooks.length,
      };
    } catch {
      return { totalSize: 0, workbookCount: 0 };
    }
  }

  /**
   * Clears all stored workbooks
   */
  async clearAll(): Promise<void> {
    await this.initialize();

    try {
      const meta = await this.readMeta();
      const ids = Object.keys(meta.workbooks);

      for (const id of ids) {
        try {
          await fs.unlink(this.getWorkbookPath(id));
        } catch {
          // Ignore errors for individual files
        }
      }

      await this.writeMeta({ workbooks: {} });
    } catch (error) {
      throw this.mapError(error, 'Failed to clear storage');
    }
  }
}

// Export singleton instance getter
export function getOfflineStorage(): OfflineStorage {
  return OfflineStorage.getInstance();
}
