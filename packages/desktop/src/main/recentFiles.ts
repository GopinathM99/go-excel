/**
 * @file Recent files management
 * @description Tracks recently opened files with persistence
 */

import { app } from 'electron';
import Store from 'electron-store';
import fs from 'fs/promises';

/** Maximum number of recent files to track */
const MAX_RECENT_FILES = 10;

/** Recent file entry */
export interface RecentFile {
  path: string;
  name: string;
  lastOpened: string;
}

/** Store schema for type safety */
interface StoreSchema {
  recentFiles: RecentFile[];
}

/**
 * RecentFiles class for managing recently opened files
 */
export class RecentFiles {
  private static instance: RecentFiles | null = null;
  private store: Store<StoreSchema>;

  private constructor() {
    this.store = new Store<StoreSchema>({
      name: 'recent-files',
      defaults: {
        recentFiles: [],
      },
      cwd: app.getPath('userData'),
    });
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): RecentFiles {
    if (!RecentFiles.instance) {
      RecentFiles.instance = new RecentFiles();
    }
    return RecentFiles.instance;
  }

  /**
   * Validates that a file path exists and is accessible
   */
  private async isValidPath(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Adds a file to the recent files list
   */
  async addRecent(filePath: string, name: string): Promise<void> {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    if (!name || typeof name !== 'string') {
      throw new Error('Invalid file name');
    }

    // Verify the file exists
    const exists = await this.isValidPath(filePath);
    if (!exists) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const recentFiles = this.store.get('recentFiles', []);

    // Remove existing entry for the same path (case-insensitive on Windows)
    const normalizedPath = this.normalizePath(filePath);
    const filteredFiles = recentFiles.filter(
      (file) => this.normalizePath(file.path) !== normalizedPath
    );

    // Add new entry at the beginning
    const newEntry: RecentFile = {
      path: filePath,
      name,
      lastOpened: new Date().toISOString(),
    };

    const updatedFiles = [newEntry, ...filteredFiles].slice(0, MAX_RECENT_FILES);

    this.store.set('recentFiles', updatedFiles);

    // Also update the OS recent documents
    try {
      app.addRecentDocument(filePath);
    } catch {
      // Ignore errors with OS recent documents
    }
  }

  /**
   * Normalizes a file path for comparison
   */
  private normalizePath(filePath: string): string {
    // On Windows, paths are case-insensitive
    if (process.platform === 'win32') {
      return filePath.toLowerCase().replace(/\\/g, '/');
    }
    return filePath;
  }

  /**
   * Gets the list of recent files, removing invalid paths
   */
  async getRecent(): Promise<RecentFile[]> {
    const recentFiles = this.store.get('recentFiles', []);
    const validFiles: RecentFile[] = [];
    const invalidPaths: string[] = [];

    // Check each file still exists
    for (const file of recentFiles) {
      const exists = await this.isValidPath(file.path);
      if (exists) {
        validFiles.push(file);
      } else {
        invalidPaths.push(file.path);
      }
    }

    // If there were invalid paths, update the store
    if (invalidPaths.length > 0) {
      this.store.set('recentFiles', validFiles);
    }

    return validFiles;
  }

  /**
   * Clears all recent files
   */
  clearRecent(): void {
    this.store.set('recentFiles', []);

    // Also clear OS recent documents
    try {
      app.clearRecentDocuments();
    } catch {
      // Ignore errors with OS recent documents
    }
  }

  /**
   * Removes a specific file from the recent files list
   */
  removeRecent(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      return;
    }

    const recentFiles = this.store.get('recentFiles', []);
    const normalizedPath = this.normalizePath(filePath);

    const filteredFiles = recentFiles.filter(
      (file) => this.normalizePath(file.path) !== normalizedPath
    );

    if (filteredFiles.length !== recentFiles.length) {
      this.store.set('recentFiles', filteredFiles);
    }
  }

  /**
   * Updates the name of a recent file
   */
  updateRecentName(filePath: string, newName: string): void {
    if (!filePath || !newName) {
      return;
    }

    const recentFiles = this.store.get('recentFiles', []);
    const normalizedPath = this.normalizePath(filePath);

    const updatedFiles = recentFiles.map((file) => {
      if (this.normalizePath(file.path) === normalizedPath) {
        return { ...file, name: newName };
      }
      return file;
    });

    this.store.set('recentFiles', updatedFiles);
  }

  /**
   * Gets the count of recent files
   */
  getRecentCount(): number {
    return this.store.get('recentFiles', []).length;
  }

  /**
   * Checks if a file is in the recent files list
   */
  isRecent(filePath: string): boolean {
    if (!filePath) {
      return false;
    }

    const recentFiles = this.store.get('recentFiles', []);
    const normalizedPath = this.normalizePath(filePath);

    return recentFiles.some(
      (file) => this.normalizePath(file.path) === normalizedPath
    );
  }

  /**
   * Gets the most recently opened file
   */
  getMostRecent(): RecentFile | null {
    const recentFiles = this.store.get('recentFiles', []);
    return recentFiles[0] || null;
  }

  /**
   * Syncs with OS recent documents
   * Call this on app startup to populate OS recent documents
   */
  async syncWithOS(): Promise<void> {
    const recentFiles = await this.getRecent();

    for (const file of recentFiles) {
      try {
        app.addRecentDocument(file.path);
      } catch {
        // Ignore errors
      }
    }
  }
}

// Export singleton instance getter
export function getRecentFiles(): RecentFiles {
  return RecentFiles.getInstance();
}
