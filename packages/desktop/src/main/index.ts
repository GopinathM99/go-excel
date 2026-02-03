/**
 * @file Electron main process entry point
 * @description Creates and manages the main application window
 */

import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { setupMenu } from './menu';
import { setupIpcHandlers } from './ipc';
import { WindowManager } from './window';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
// This is only needed for Windows Squirrel installer
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // electron-squirrel-startup is not installed, which is fine for non-Squirrel builds
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

/**
 * Creates the main application window
 */
function createWindow(): BrowserWindow {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready-to-show
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
    // Platform-specific window options
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 15, y: 10 },
        }
      : {
          // Windows/Linux: use default title bar for now
          frame: true,
        }),
  });

  // Register window with WindowManager
  WindowManager.setMainWindow(mainWindow);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    const devServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:3000';
    mainWindow.loadURL(devServerUrl);

    // Open DevTools in development
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the bundled index.html
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    // Check if document has unsaved changes
    const isEdited = mainWindow?.isDocumentEdited() ?? false;
    if (isEdited) {
      // Let the renderer handle the close confirmation
      event.preventDefault();
      mainWindow?.webContents.send('app:before-close');
    }
  });

  // Cleanup when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  // Set app name for macOS
  if (process.platform === 'darwin') {
    app.name = 'Excel Clone';
  }

  // Create the main window
  createWindow();

  // Setup the application menu
  setupMenu();

  // Setup IPC handlers
  setupIpcHandlers();
}

// App lifecycle events

// This method will be called when Electron has finished initialization
app.whenReady().then(initializeApp);

// macOS: Re-create window when dock icon is clicked and no windows exist
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle second instance (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Someone tried to run a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();

      // Handle file open from command line
      const filePath = commandLine.find((arg) =>
        arg.endsWith('.xlsx') || arg.endsWith('.xls') || arg.endsWith('.csv')
      );
      if (filePath) {
        mainWindow.webContents.send('file:open-path', filePath);
      }
    }
  });
}

// Handle file open on macOS (drag & drop on dock, double-click file)
app.on('open-file', (event, filePath) => {
  event.preventDefault();

  if (mainWindow) {
    mainWindow.webContents.send('file:open-path', filePath);
  } else {
    // Store file path to open after window creation
    app.once('ready', () => {
      // Wait for window to be created
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.webContents.send('file:open-path', filePath);
        }
      }, 1000);
    });
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Only allow navigation to the app's own URLs in development
    if (isDev && parsedUrl.origin === 'http://localhost:3000') {
      return;
    }

    // Block all other navigations in production
    if (!isDev) {
      event.preventDefault();
    }
  });
});

// Export for testing
export { createWindow, mainWindow };
