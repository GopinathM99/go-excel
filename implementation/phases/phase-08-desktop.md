# Phase 8: Desktop Shell

**Status:** ✅ Complete
**Sprint:** 9
**Goal:** Desktop application wrapper
**Last Updated:** 2024-01-31

---

## Tasks

### 1. Electron/Tauri Setup (Medium) ✅ COMPLETE
- [x] Package web app for desktop
- [x] Native window chrome (hiddenInset on macOS)
- [x] Menu bar integration (File, Edit, View, Insert, Format, Window, Help)
- [x] Application lifecycle management
- [x] Single instance lock
- [x] Context isolation with preload script
- [x] IPC handlers for all operations
- [x] electron-builder configuration for all platforms

**Files Created:**
- `packages/desktop/package.json`
- `packages/desktop/electron-builder.json`
- `packages/desktop/electron.vite.config.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/menu.ts`
- `packages/desktop/src/main/ipc.ts`
- `packages/desktop/src/main/window.ts`
- `packages/desktop/src/preload/index.ts`
- `packages/desktop/src/types/electron.d.ts`

### 2. File System Integration (Medium) ✅ COMPLETE
- [x] Native Open/Save dialogs with XLSX integration
- [x] Recent files list
- [x] File associations (.xlsx, .csv) - configured in electron-builder
- [x] Auto-save to local storage
- [x] Document state tracking (dirty indicator, window title)
- [x] Unsaved changes dialog on close

**Files Created:**
- `packages/desktop/src/main/fileDialogs.ts`
- `packages/desktop/src/main/fileOperations.ts`
- `packages/desktop/src/main/documentState.ts`
- `packages/desktop/src/preload/fileApi.ts`

### 3. Offline Mode (Small) ✅ COMPLETE
- [x] Full functionality without network
- [x] Local storage for workbooks
- [x] Recent files tracking (max 10)
- [x] Auto-save with crash recovery
- [x] Recovery file management

**Files Created:**
- `packages/desktop/src/main/offlineStorage.ts`
- `packages/desktop/src/main/recentFiles.ts`
- `packages/desktop/src/main/autoSave.ts`
- `packages/desktop/src/preload/offlineApi.ts`
- `packages/desktop/src/main/offlineIpc.ts`

---

## Key Files to Create

```
packages/desktop/
├── package.json
├── tsconfig.json
├── electron-builder.json           # Build configuration
├── src/
│   ├── main/
│   │   ├── index.ts                # Main process entry
│   │   ├── window.ts               # Window management
│   │   ├── menu.ts                 # Application menu
│   │   ├── ipc.ts                  # IPC handlers
│   │   └── fileHandlers.ts         # File operations
│   ├── preload/
│   │   └── index.ts                # Preload script (context bridge)
│   └── renderer/
│       └── index.ts                # Points to web app
├── resources/
│   ├── icon.icns                   # macOS icon
│   ├── icon.ico                    # Windows icon
│   └── icon.png                    # Linux icon
└── build/
    └── entitlements.mac.plist      # macOS entitlements
```

---

## Technical Implementation

### Main Process (main/index.ts)
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { setupMenu } from './menu';
import { setupFileHandlers } from './fileHandlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',  // macOS
    frame: true,
  });

  // Load web app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../web/dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  setupMenu();
  setupFileHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### Preload Script (preload/index.ts)
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: string) => ipcRenderer.invoke('dialog:saveFile', data),
  saveFileAs: (data: string) => ipcRenderer.invoke('dialog:saveFileAs', data),

  // Recent files
  getRecentFiles: () => ipcRenderer.invoke('recentFiles:get'),
  addRecentFile: (path: string) => ipcRenderer.invoke('recentFiles:add', path),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,

  // Window
  setDocumentEdited: (edited: boolean) => ipcRenderer.invoke('window:setEdited', edited),
  setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),

  // Events
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:action', (_, action) => callback(action));
  },
});
```

### Menu (main/menu.ts)
```typescript
import { Menu, MenuItem, app, shell } from 'electron';

export function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendAction('new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => sendAction('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendAction('save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendAction('saveAs') },
        { type: 'separator' },
        { label: 'Export as CSV', click: () => sendAction('exportCsv') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendAction('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendAction('redo') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    // ... more menus
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
```

### File Handlers (main/fileHandlers.ts)
```typescript
import { ipcMain, dialog, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

const RECENT_FILES_KEY = 'recentFiles';
const MAX_RECENT_FILES = 10;

export function setupFileHandlers() {
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Spreadsheets', extensions: ['xlsx', 'xls', 'csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths[0]) {
      const filePath = result.filePaths[0];
      const data = await fs.readFile(filePath);
      return { path: filePath, data: data.toString('base64') };
    }
    return null;
  });

  ipcMain.handle('dialog:saveFile', async (_, data: string, filePath?: string) => {
    if (!filePath) {
      return saveFileAs(data);
    }
    await fs.writeFile(filePath, Buffer.from(data, 'base64'));
    return filePath;
  });

  ipcMain.handle('dialog:saveFileAs', async (_, data: string) => {
    return saveFileAs(data);
  });
}

async function saveFileAs(data: string): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Excel Workbook', extensions: ['xlsx'] },
      { name: 'CSV', extensions: ['csv'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, Buffer.from(data, 'base64'));
    return result.filePath;
  }
  return null;
}
```

### electron-builder.json
```json
{
  "$schema": "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  "appId": "com.excel.clone",
  "productName": "Excel Clone",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "!node_modules"
  ],
  "mac": {
    "target": ["dmg", "zip"],
    "icon": "resources/icon.icns",
    "category": "public.app-category.productivity"
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "resources/icon.ico"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "resources/icon.png",
    "category": "Office"
  },
  "fileAssociations": [
    {
      "ext": "xlsx",
      "name": "Excel Workbook",
      "role": "Editor"
    },
    {
      "ext": "csv",
      "name": "CSV File",
      "role": "Editor"
    }
  ]
}
```

---

## Verification

- [ ] Open/save files via native dialogs
- [ ] Work fully offline
- [ ] Verify auto-save
- [ ] Test file associations
- [ ] Test on macOS, Windows, Linux
