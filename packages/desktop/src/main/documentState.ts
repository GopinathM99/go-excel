/**
 * @file Document state management
 * @description Tracks current document state including file path, dirty state, and window title
 */

import { app } from 'electron';
import path from 'path';
import { WindowManager } from './window';
import { getRecentFiles } from './recentFiles';

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
 * DocumentState class for tracking the current document state
 */
class DocumentStateManager {
  private static instance: DocumentStateManager | null = null;

  private currentPath: string | null = null;
  private isDirty: boolean = false;
  private documentName: string = 'Untitled';

  /** Callback for before-close confirmation */
  private beforeCloseCallback: (() => Promise<boolean>) | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): DocumentStateManager {
    if (!DocumentStateManager.instance) {
      DocumentStateManager.instance = new DocumentStateManager();
    }
    return DocumentStateManager.instance;
  }

  /**
   * Sets the current document path
   * @param filePath - The file path, or null for a new document
   */
  async setDocumentPath(filePath: string | null): Promise<void> {
    this.currentPath = filePath;

    if (filePath) {
      this.documentName = path.basename(filePath);

      // Add to recent files
      try {
        const recentFiles = getRecentFiles();
        await recentFiles.addRecent(filePath, this.documentName);
      } catch (error) {
        console.error('Failed to add to recent files:', error);
      }

      // Update OS recent documents
      try {
        app.addRecentDocument(filePath);
      } catch (error) {
        console.error('Failed to add OS recent document:', error);
      }

      // Set represented filename on macOS
      WindowManager.setRepresentedFilename(filePath);
    } else {
      this.documentName = 'Untitled';
      WindowManager.setRepresentedFilename(null);
    }

    // Update window title
    this.updateWindowTitle();
  }

  /**
   * Sets the document dirty state (unsaved changes)
   * @param dirty - Whether the document has unsaved changes
   */
  setDocumentDirty(dirty: boolean): void {
    this.isDirty = dirty;

    // Update macOS document edited state
    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.setDocumentEdited(dirty);
    }

    // Update window title
    this.updateWindowTitle();
  }

  /**
   * Gets the current document information
   */
  getCurrentDocument(): DocumentInfo {
    return {
      path: this.currentPath,
      dirty: this.isDirty,
      name: this.documentName,
    };
  }

  /**
   * Gets the current file path
   */
  getPath(): string | null {
    return this.currentPath;
  }

  /**
   * Gets the current dirty state
   */
  getDirty(): boolean {
    return this.isDirty;
  }

  /**
   * Gets the current document name
   */
  getName(): string {
    return this.documentName;
  }

  /**
   * Updates the window title based on current state
   */
  private updateWindowTitle(): void {
    const appName = 'Excel Clone';
    const dirtyIndicator = this.isDirty ? '*' : '';
    const title = `${dirtyIndicator}${this.documentName} - ${appName}`;

    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.setTitle(title);
    }
  }

  /**
   * Creates a new document (resets state)
   */
  newDocument(): void {
    this.currentPath = null;
    this.isDirty = false;
    this.documentName = 'Untitled';

    WindowManager.setRepresentedFilename(null);

    const mainWindow = WindowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.setDocumentEdited(false);
    }

    this.updateWindowTitle();
  }

  /**
   * Marks the document as saved
   * Called after a successful save operation
   */
  markSaved(): void {
    this.setDocumentDirty(false);
  }

  /**
   * Sets a callback to be called before closing the window
   * The callback should return true to allow close, false to cancel
   */
  setBeforeCloseCallback(callback: (() => Promise<boolean>) | null): void {
    this.beforeCloseCallback = callback;
  }

  /**
   * Checks if the window can be closed
   * Returns true if there are no unsaved changes, or user confirms discard
   */
  async canClose(): Promise<boolean> {
    if (!this.isDirty) {
      return true;
    }

    if (this.beforeCloseCallback) {
      return await this.beforeCloseCallback();
    }

    // If no callback is set, allow close
    return true;
  }

  /**
   * Gets file extension from path
   */
  getExtension(): string | null {
    if (!this.currentPath) {
      return null;
    }
    return path.extname(this.currentPath).toLowerCase().slice(1);
  }

  /**
   * Gets the directory containing the current file
   */
  getDirectory(): string | null {
    if (!this.currentPath) {
      return null;
    }
    return path.dirname(this.currentPath);
  }

  /**
   * Checks if the current document is a new (unsaved) document
   */
  isNewDocument(): boolean {
    return this.currentPath === null;
  }

  /**
   * Gets a suggested save name based on current state
   */
  getSuggestedSaveName(): string {
    if (this.currentPath) {
      return path.basename(this.currentPath);
    }
    return 'Untitled.xlsx';
  }
}

// Export singleton instance getter
export function getDocumentState(): DocumentStateManager {
  return DocumentStateManager.getInstance();
}

// Export type
export type { DocumentStateManager };
