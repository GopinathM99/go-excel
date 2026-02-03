/**
 * @file Auto-save functionality
 * @description Provides automatic saving and crash recovery for workbooks
 */

import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

/** Default auto-save interval in milliseconds (30 seconds) */
const DEFAULT_AUTO_SAVE_INTERVAL = 30000;

/** Maximum age for recovery files (7 days in milliseconds) */
const MAX_RECOVERY_FILE_AGE = 7 * 24 * 60 * 60 * 1000;

/** Recovery file metadata */
export interface RecoveryFile {
  id: string;
  originalPath: string | null;
  name: string;
  savedAt: string;
  size: number;
}

/** Auto-save callback type */
export type AutoSaveCallback = () => Promise<string | null>;

/**
 * AutoSave class for managing automatic saving and crash recovery
 */
export class AutoSave {
  private static instance: AutoSave | null = null;

  private recoveryPath: string;
  private autoSaveInterval: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentWorkbookId: string | null = null;
  private currentWorkbookPath: string | null = null;
  private saveCallback: AutoSaveCallback | null = null;
  private hasUnsavedChanges: boolean = false;
  private initialized: boolean = false;
  private isEnabled: boolean = false;

  private constructor() {
    this.recoveryPath = path.join(app.getPath('userData'), 'recovery');
    this.autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL;
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): AutoSave {
    if (!AutoSave.instance) {
      AutoSave.instance = new AutoSave();
    }
    return AutoSave.instance;
  }

  /**
   * Initializes the recovery directory
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.recoveryPath, { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize recovery directory:', error);
      throw error;
    }
  }

  /**
   * Generates a recovery file path
   */
  private getRecoveryFilePath(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.recoveryPath, `${safeId}.recovery.json`);
  }

  /**
   * Generates a metadata file path for a recovery file
   */
  private getRecoveryMetaPath(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.recoveryPath, `${safeId}.meta.json`);
  }

  /**
   * Enables auto-save with the specified configuration
   */
  async enableAutoSave(
    workbookId: string,
    saveCallback: AutoSaveCallback,
    options?: {
      interval?: number;
      originalPath?: string | null;
      name?: string;
    }
  ): Promise<void> {
    await this.initialize();

    // Disable any existing auto-save
    this.disableAutoSave();

    this.currentWorkbookId = workbookId;
    this.currentWorkbookPath = options?.originalPath || null;
    this.saveCallback = saveCallback;
    this.autoSaveInterval = options?.interval || DEFAULT_AUTO_SAVE_INTERVAL;
    this.isEnabled = true;

    // Store metadata for recovery identification
    const metaPath = this.getRecoveryMetaPath(workbookId);
    const meta = {
      id: workbookId,
      originalPath: this.currentWorkbookPath,
      name: options?.name || `Untitled - ${workbookId}`,
      createdAt: new Date().toISOString(),
    };

    try {
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write recovery metadata:', error);
    }

    // Start auto-save interval
    this.intervalId = setInterval(async () => {
      if (this.hasUnsavedChanges) {
        await this.performAutoSave();
      }
    }, this.autoSaveInterval);

    // Clean up old recovery files on startup
    await this.cleanupOldRecoveryFiles();
  }

  /**
   * Disables auto-save
   */
  disableAutoSave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isEnabled = false;
    this.saveCallback = null;
    this.hasUnsavedChanges = false;
  }

  /**
   * Marks that there are unsaved changes
   */
  markUnsavedChanges(): void {
    this.hasUnsavedChanges = true;
  }

  /**
   * Marks that changes have been saved
   */
  markSaved(): void {
    this.hasUnsavedChanges = false;
  }

  /**
   * Performs an auto-save operation
   */
  private async performAutoSave(): Promise<void> {
    if (!this.saveCallback || !this.currentWorkbookId) {
      return;
    }

    try {
      const data = await this.saveCallback();

      if (data) {
        const recoveryPath = this.getRecoveryFilePath(this.currentWorkbookId);
        await fs.writeFile(recoveryPath, data, 'utf-8');

        // Update metadata with latest save time
        const metaPath = this.getRecoveryMetaPath(this.currentWorkbookId);
        try {
          const metaContent = await fs.readFile(metaPath, 'utf-8');
          const meta = JSON.parse(metaContent);
          meta.savedAt = new Date().toISOString();
          meta.size = Buffer.byteLength(data, 'utf-8');
          await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
        } catch {
          // Ignore metadata update errors
        }
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  /**
   * Forces an immediate auto-save
   */
  async forceAutoSave(): Promise<void> {
    await this.performAutoSave();
  }

  /**
   * Gets all recovery files
   */
  async getRecoveryFiles(): Promise<RecoveryFile[]> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.recoveryPath);
      const recoveryFiles: RecoveryFile[] = [];

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metaPath = path.join(this.recoveryPath, file);

          try {
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(metaContent);

            // Verify the recovery file exists
            const recoveryPath = this.getRecoveryFilePath(meta.id);
            try {
              const stats = await fs.stat(recoveryPath);

              recoveryFiles.push({
                id: meta.id,
                originalPath: meta.originalPath || null,
                name: meta.name || `Recovery - ${meta.id}`,
                savedAt: meta.savedAt || meta.createdAt,
                size: stats.size,
              });
            } catch {
              // Recovery file doesn't exist, skip
            }
          } catch {
            // Invalid metadata file, skip
          }
        }
      }

      // Sort by saved date (newest first)
      return recoveryFiles.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get recovery files:', error);
      return [];
    }
  }

  /**
   * Recovers a file by its ID
   */
  async recoverFile(id: string): Promise<string | null> {
    await this.initialize();

    if (!id || typeof id !== 'string') {
      throw new Error('Invalid recovery file ID');
    }

    const recoveryPath = this.getRecoveryFilePath(id);

    try {
      const data = await fs.readFile(recoveryPath, 'utf-8');
      return data;
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes a recovery file
   */
  async deleteRecoveryFile(id: string): Promise<void> {
    await this.initialize();

    if (!id || typeof id !== 'string') {
      return;
    }

    const recoveryPath = this.getRecoveryFilePath(id);
    const metaPath = this.getRecoveryMetaPath(id);

    try {
      await fs.unlink(recoveryPath);
    } catch {
      // Ignore if file doesn't exist
    }

    try {
      await fs.unlink(metaPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Cleans up old recovery files
   */
  async cleanupOldRecoveryFiles(): Promise<void> {
    await this.initialize();

    const now = Date.now();
    const recoveryFiles = await this.getRecoveryFiles();

    for (const file of recoveryFiles) {
      const savedTime = new Date(file.savedAt).getTime();
      const age = now - savedTime;

      if (age > MAX_RECOVERY_FILE_AGE) {
        await this.deleteRecoveryFile(file.id);
      }
    }
  }

  /**
   * Cleans up the current workbook's recovery file
   * Call this after a successful save
   */
  async cleanupCurrentRecoveryFile(): Promise<void> {
    if (this.currentWorkbookId) {
      await this.deleteRecoveryFile(this.currentWorkbookId);
    }
  }

  /**
   * Sets the auto-save interval
   */
  setAutoSaveInterval(intervalMs: number): void {
    if (intervalMs < 1000) {
      throw new Error('Auto-save interval must be at least 1000ms');
    }

    this.autoSaveInterval = intervalMs;

    // Restart interval if currently running
    if (this.isEnabled && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(async () => {
        if (this.hasUnsavedChanges) {
          await this.performAutoSave();
        }
      }, this.autoSaveInterval);
    }
  }

  /**
   * Gets the current auto-save interval
   */
  getAutoSaveInterval(): number {
    return this.autoSaveInterval;
  }

  /**
   * Checks if auto-save is currently enabled
   */
  isAutoSaveEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Gets whether there are unsaved changes
   */
  getHasUnsavedChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  /**
   * Gets the recovery folder path
   */
  getRecoveryPath(): string {
    return this.recoveryPath;
  }

  /**
   * Clears all recovery files
   */
  async clearAllRecoveryFiles(): Promise<void> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.recoveryPath);

      for (const file of files) {
        try {
          await fs.unlink(path.join(this.recoveryPath, file));
        } catch {
          // Ignore individual file errors
        }
      }
    } catch (error) {
      console.error('Failed to clear recovery files:', error);
    }
  }
}

// Export singleton instance getter
export function getAutoSave(): AutoSave {
  return AutoSave.getInstance();
}
