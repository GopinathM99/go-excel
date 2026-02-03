/**
 * @file Window management utilities
 * @description Provides utilities for managing application windows
 */

import { BrowserWindow, screen } from 'electron';

/** Window state to persist */
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

/** Default window dimensions */
const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1400,
  height: 900,
  isMaximized: false,
  isFullScreen: false,
};

/**
 * WindowManager class for managing application windows
 */
export class WindowManager {
  private static mainWindow: BrowserWindow | null = null;
  private static windowState: WindowState = { ...DEFAULT_WINDOW_STATE };

  /**
   * Sets the main window reference
   */
  static setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    this.setupWindowStateHandlers(window);
  }

  /**
   * Gets the main window reference
   */
  static getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Sets up window state tracking handlers
   */
  private static setupWindowStateHandlers(window: BrowserWindow): void {
    // Track window state changes
    const saveState = (): void => {
      if (!window.isMinimized() && !window.isMaximized() && !window.isFullScreen()) {
        const bounds = window.getBounds();
        this.windowState = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false,
          isFullScreen: false,
        };
      }
      this.windowState.isMaximized = window.isMaximized();
      this.windowState.isFullScreen = window.isFullScreen();
    };

    window.on('resize', saveState);
    window.on('move', saveState);
    window.on('close', saveState);
  }

  /**
   * Gets the current window state
   */
  static getWindowState(): WindowState {
    return { ...this.windowState };
  }

  /**
   * Restores window state
   */
  static restoreWindowState(window: BrowserWindow, state: WindowState): void {
    // Validate that the window position is on a visible display
    const bounds = { x: state.x, y: state.y, width: state.width, height: state.height };

    if (this.isWindowPositionValid(bounds)) {
      window.setBounds(bounds as Electron.Rectangle);
    } else {
      // Position not valid (display removed), center on primary display
      window.setSize(state.width, state.height);
      window.center();
    }

    if (state.isMaximized) {
      window.maximize();
    }

    if (state.isFullScreen) {
      window.setFullScreen(true);
    }
  }

  /**
   * Checks if window position is on a visible display
   */
  private static isWindowPositionValid(
    bounds: { x?: number; y?: number; width: number; height: number }
  ): boolean {
    if (bounds.x === undefined || bounds.y === undefined) {
      return false;
    }

    const displays = screen.getAllDisplays();
    return displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      return (
        bounds.x! >= x &&
        bounds.x! < x + width &&
        bounds.y! >= y &&
        bounds.y! < y + height
      );
    });
  }

  /**
   * Sets the window title with optional document name
   */
  static setWindowTitle(documentName?: string): void {
    const window = this.mainWindow;
    if (!window) return;

    const appName = 'Excel Clone';
    const title = documentName ? `${documentName} - ${appName}` : appName;
    window.setTitle(title);

    // On macOS, also set the represented filename for proxy icon
    if (process.platform === 'darwin' && documentName) {
      // This would require the full path, but for now we just set the title
    }
  }

  /**
   * Sets the represented filename (macOS only)
   * Shows the file icon in the title bar and enables drag-out
   */
  static setRepresentedFilename(filePath: string | null): void {
    const window = this.mainWindow;
    if (!window || process.platform !== 'darwin') return;

    if (filePath) {
      window.setRepresentedFilename(filePath);
    } else {
      window.setRepresentedFilename('');
    }
  }

  /**
   * Shows a sheet-style dialog (macOS) or modal dialog (other platforms)
   */
  static showSheet(
    _options: Electron.MessageBoxOptions,
    callback?: (response: number) => void
  ): void {
    const window = this.mainWindow;
    if (!window) return;

    // Electron handles sheet presentation automatically on macOS
    // when the parent window is provided
    import('electron').then(({ dialog }) => {
      dialog.showMessageBox(window, _options).then((result) => {
        callback?.(result.response);
      });
    });
  }

  /**
   * Focuses the main window
   */
  static focus(): void {
    const window = this.mainWindow;
    if (!window) return;

    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  }

  /**
   * Shows a progress indicator in the taskbar/dock
   */
  static setProgress(progress: number): void {
    const window = this.mainWindow;
    if (!window) return;

    // progress: 0-1 for progress, -1 for indeterminate, > 1 to remove
    window.setProgressBar(progress);
  }

  /**
   * Flashes the window frame to get user attention
   */
  static flashFrame(flash: boolean = true): void {
    const window = this.mainWindow;
    if (!window) return;

    window.flashFrame(flash);
  }

  /**
   * Sets the overlay icon (Windows only)
   */
  static setOverlayIcon(
    iconPath: string | null,
    description: string = ''
  ): void {
    const window = this.mainWindow;
    if (!window || process.platform !== 'win32') return;

    if (iconPath) {
      const { nativeImage } = require('electron');
      const icon = nativeImage.createFromPath(iconPath);
      window.setOverlayIcon(icon, description);
    } else {
      window.setOverlayIcon(null, '');
    }
  }

  /**
   * Gets the content bounds (excludes title bar)
   */
  static getContentBounds(): Electron.Rectangle | null {
    const window = this.mainWindow;
    if (!window) return null;

    return window.getContentBounds();
  }

  /**
   * Checks if the window is focused
   */
  static isFocused(): boolean {
    return this.mainWindow?.isFocused() ?? false;
  }

  /**
   * Checks if the window is maximized
   */
  static isMaximized(): boolean {
    return this.mainWindow?.isMaximized() ?? false;
  }

  /**
   * Checks if the window is in full screen
   */
  static isFullScreen(): boolean {
    return this.mainWindow?.isFullScreen() ?? false;
  }

  /**
   * Sends a message to the renderer process
   */
  static send(channel: string, ...args: unknown[]): void {
    const window = this.mainWindow;
    if (!window) return;

    window.webContents.send(channel, ...args);
  }
}
