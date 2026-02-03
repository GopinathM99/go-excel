/**
 * @file Application menu setup
 * @description Defines the native menu bar for the application
 */

import {
  app,
  Menu,
  MenuItemConstructorOptions,
  BrowserWindow,
  shell,
} from 'electron';
import { WindowManager } from './window';

/** Menu action types that can be sent to the renderer */
export type MenuAction =
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:save-as'
  | 'file:export-csv'
  | 'file:print'
  | 'edit:undo'
  | 'edit:redo'
  | 'edit:cut'
  | 'edit:copy'
  | 'edit:paste'
  | 'edit:select-all'
  | 'edit:find'
  | 'edit:replace'
  | 'view:zoom-in'
  | 'view:zoom-out'
  | 'view:zoom-reset'
  | 'view:toggle-formula-bar'
  | 'view:toggle-gridlines'
  | 'insert:row'
  | 'insert:column'
  | 'insert:chart'
  | 'format:cells'
  | 'format:row-height'
  | 'format:column-width'
  | 'help:about';

/**
 * Sends a menu action to the focused window's renderer
 */
function sendMenuAction(action: MenuAction): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.send('menu:action', action);
  }
}

/**
 * Creates the File menu
 */
function createFileMenu(): MenuItemConstructorOptions {
  return {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendMenuAction('file:new'),
      },
      {
        label: 'Open...',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendMenuAction('file:open'),
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendMenuAction('file:save'),
      },
      {
        label: 'Save As...',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => sendMenuAction('file:save-as'),
      },
      { type: 'separator' },
      {
        label: 'Export as CSV...',
        click: () => sendMenuAction('file:export-csv'),
      },
      { type: 'separator' },
      {
        label: 'Print...',
        accelerator: 'CmdOrCtrl+P',
        click: () => sendMenuAction('file:print'),
      },
      { type: 'separator' },
      {
        label: 'Recent Files',
        role: 'recentDocuments',
        submenu: [
          {
            label: 'Clear Recent',
            role: 'clearRecentDocuments',
          },
        ],
      },
      { type: 'separator' },
      ...(process.platform === 'darwin'
        ? []
        : [
            {
              label: 'Exit',
              accelerator: 'Alt+F4',
              click: () => app.quit(),
            } as MenuItemConstructorOptions,
          ]),
    ],
  };
}

/**
 * Creates the Edit menu
 */
function createEditMenu(): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: () => sendMenuAction('edit:undo'),
      },
      {
        label: 'Redo',
        accelerator: process.platform === 'darwin' ? 'Cmd+Shift+Z' : 'Ctrl+Y',
        click: () => sendMenuAction('edit:redo'),
      },
      { type: 'separator' },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut',
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy',
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste',
      },
      { type: 'separator' },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: () => sendMenuAction('edit:select-all'),
      },
      { type: 'separator' },
      {
        label: 'Find...',
        accelerator: 'CmdOrCtrl+F',
        click: () => sendMenuAction('edit:find'),
      },
      {
        label: 'Find and Replace...',
        accelerator: 'CmdOrCtrl+H',
        click: () => sendMenuAction('edit:replace'),
      },
    ],
  };
}

/**
 * Creates the View menu
 */
function createViewMenu(): MenuItemConstructorOptions {
  return {
    label: 'View',
    submenu: [
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: () => sendMenuAction('view:zoom-in'),
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => sendMenuAction('view:zoom-out'),
      },
      {
        label: 'Reset Zoom',
        accelerator: 'CmdOrCtrl+0',
        click: () => sendMenuAction('view:zoom-reset'),
      },
      { type: 'separator' },
      {
        label: 'Toggle Formula Bar',
        click: () => sendMenuAction('view:toggle-formula-bar'),
      },
      {
        label: 'Toggle Gridlines',
        click: () => sendMenuAction('view:toggle-gridlines'),
      },
      { type: 'separator' },
      {
        label: 'Toggle Full Screen',
        accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          if (window) {
            window.setFullScreen(!window.isFullScreen());
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          if (window) {
            window.webContents.toggleDevTools();
          }
        },
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
    ],
  };
}

/**
 * Creates the Insert menu
 */
function createInsertMenu(): MenuItemConstructorOptions {
  return {
    label: 'Insert',
    submenu: [
      {
        label: 'Row Above',
        click: () => sendMenuAction('insert:row'),
      },
      {
        label: 'Column Left',
        click: () => sendMenuAction('insert:column'),
      },
      { type: 'separator' },
      {
        label: 'Chart...',
        click: () => sendMenuAction('insert:chart'),
      },
    ],
  };
}

/**
 * Creates the Format menu
 */
function createFormatMenu(): MenuItemConstructorOptions {
  return {
    label: 'Format',
    submenu: [
      {
        label: 'Format Cells...',
        accelerator: 'CmdOrCtrl+1',
        click: () => sendMenuAction('format:cells'),
      },
      { type: 'separator' },
      {
        label: 'Row Height...',
        click: () => sendMenuAction('format:row-height'),
      },
      {
        label: 'Column Width...',
        click: () => sendMenuAction('format:column-width'),
      },
    ],
  };
}

/**
 * Creates the Window menu (macOS specific)
 */
function createWindowMenu(): MenuItemConstructorOptions {
  return {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(process.platform === 'darwin'
        ? ([
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' },
          ] as MenuItemConstructorOptions[])
        : [{ role: 'close' } as MenuItemConstructorOptions]),
    ],
  };
}

/**
 * Creates the Help menu
 */
function createHelpMenu(): MenuItemConstructorOptions {
  return {
    role: 'help',
    submenu: [
      {
        label: 'Documentation',
        click: () => {
          shell.openExternal('https://github.com/example/excel-clone#readme');
        },
      },
      {
        label: 'Report Issue',
        click: () => {
          shell.openExternal('https://github.com/example/excel-clone/issues');
        },
      },
      { type: 'separator' },
      {
        label: 'About Excel Clone',
        click: () => sendMenuAction('help:about'),
      },
    ],
  };
}

/**
 * Creates the macOS app menu
 */
function createMacAppMenu(): MenuItemConstructorOptions {
  return {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Preferences...',
        accelerator: 'Cmd+,',
        click: () => {
          // TODO: Open preferences window
        },
      },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

/**
 * Sets up the application menu
 */
export function setupMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [createMacAppMenu()] : []),
    createFileMenu(),
    createEditMenu(),
    createViewMenu(),
    createInsertMenu(),
    createFormatMenu(),
    createWindowMenu(),
    createHelpMenu(),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Updates the menu state (e.g., enabling/disabling items)
 */
export function updateMenuState(state: {
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
}): void {
  // This would be used to dynamically enable/disable menu items
  // based on the application state. For now, it's a placeholder.
  const mainWindow = WindowManager.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('menu:state-update', state);
  }
}
