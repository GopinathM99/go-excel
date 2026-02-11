import { useCallback, useState, useEffect, useRef } from 'react';
import { useSpreadsheetStore, type SheetData } from '../store/spreadsheet';
import './Toolbar.css';

/**
 * Type declarations for the File System Access API.
 * This API is available in Chromium-based browsers but is not yet part
 * of the standard TypeScript DOM lib types.
 */
interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | ArrayBuffer | ArrayBufferView): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLocal {
  createWritable(): Promise<FileSystemWritableFileStream>;
  requestPermission?(descriptor: { mode: string }): Promise<string>;
}

/**
 * Module-level variable to persist the file handle across saves.
 * Stored outside React to avoid stale closure issues with useCallback.
 */
let currentFileHandle: FileSystemFileHandleLocal | null = null;

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: FilePickerAcceptType[];
}

interface FileSystemFileHandleRead {
  getFile(): Promise<File>;
}

/**
 * Escape a CSV field value, quoting it if it contains delimiters,
 * quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Build CSV content string from the cell data map.
 */
function buildCsvContent(cells: Map<string, { value: string }>): string {
  // Determine the used range by scanning all cell keys
  let maxRow = -1;
  let maxCol = -1;

  for (const key of cells.keys()) {
    const parts = key.split(',');
    const row = Number(parts[0]);
    const col = Number(parts[1]);
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  }

  // Build CSV content (empty string if no cells have data)
  if (maxRow < 0 || maxCol < 0) {
    return '';
  }

  const csvRows: string[] = [];
  for (let row = 0; row <= maxRow; row++) {
    const fields: string[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cellData = cells.get(`${String(row)},${String(col)}`);
      const value = cellData?.value ?? '';
      fields.push(escapeCsvField(value));
    }
    csvRows.push(fields.join(','));
  }
  return csvRows.join('\r\n');
}

/**
 * Build multi-sheet content with sheet separators.
 * Each sheet is prefixed with ===SHEET:sheetName=== followed by its CSV data.
 */
function buildMultiSheetContent(sheets: SheetData[]): string {
  return sheets
    .map((sheet) => {
      const csvContent = buildCsvContent(sheet.cells);
      return `===SHEET:${sheet.name}===\n${csvContent}`;
    })
    .join('\n');
}

/**
 * CellData type matching the store's CellData interface.
 */
interface CellData {
  value: string;
  formula?: string;
}

/**
 * Parse CSV content into a 2D array of strings.
 * Handles quoted fields, escaped quotes (""), and newlines within quoted fields.
 */
function parseCsvContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double-double-quote)
        if (i + 1 < content.length && content[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        // Regular character inside quotes (including newlines)
        currentField += char ?? '';
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === ',') {
        // Field delimiter
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r') {
        // Handle \r\n or standalone \r as row delimiter
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        if (i + 1 < content.length && content[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else if (char === '\n') {
        // Row delimiter
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char ?? '';
        i++;
      }
    }
  }

  // Push the last field and row (if there's any remaining content)
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Convert parsed CSV rows into a Map of cell data keyed by "row,col".
 */
function csvRowsToCells(rows: string[][]): Map<string, CellData> {
  const cells = new Map<string, CellData>();
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const value = rows[row][col];
      if (value !== '') {
        cells.set(`${String(row)},${String(col)}`, { value });
      }
    }
  }
  return cells;
}

/**
 * Parse content that may contain multi-sheet markers (===SHEET:name===).
 * Falls back to treating the entire content as a single "Sheet1" CSV for
 * backward compatibility with legacy single-sheet files.
 */
function parseMultiSheetContent(content: string): { name: string; cells: Map<string, CellData> }[] {
  // Check if the content has multi-sheet markers
  if (!content.startsWith('===SHEET:')) {
    // Legacy single-sheet CSV - return as "Sheet1"
    const rows = parseCsvContent(content);
    return [{ name: 'Sheet1', cells: csvRowsToCells(rows) }];
  }

  // Split by sheet markers
  const sheetPattern = /===SHEET:(.+?)===/g;
  const sheets: { name: string; cells: Map<string, CellData> }[] = [];
  let match;
  const markers: { name: string; index: number }[] = [];

  while ((match = sheetPattern.exec(content)) !== null) {
    markers.push({ name: match[1], index: match.index });
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + `===SHEET:${markers[i].name}===`.length + 1; // +1 for newline
    const end = i + 1 < markers.length ? markers[i + 1].index : content.length;
    const csvContent = content.slice(start, end).trim();
    const rows = csvContent ? parseCsvContent(csvContent) : [];
    sheets.push({ name: markers[i].name, cells: csvRowsToCells(rows) });
  }

  return sheets;
}

export function Toolbar() {
  const selectedCell = useSpreadsheetStore((state) => state.selectedCell);
  const getCellStyle = useSpreadsheetStore((state) => state.getCellStyle);
  const toggleBold = useSpreadsheetStore((state) => state.toggleBold);
  const toggleItalic = useSpreadsheetStore((state) => state.toggleItalic);
  const toggleUnderline = useSpreadsheetStore((state) => state.toggleUnderline);
  const resetWorkbook = useSpreadsheetStore((state) => state.resetWorkbook);
  const getAllSheetsData = useSpreadsheetStore((state) => state.getAllSheetsData);
  const loadAllSheets = useSpreadsheetStore((state) => state.loadAllSheets);
  const isDirty = useSpreadsheetStore((state) => state.isDirty);
  const markClean = useSpreadsheetStore((state) => state.markClean);

  const cellStyle = selectedCell ? getCellStyle(selectedCell.row, selectedCell.col) : undefined;
  const isBold = cellStyle?.bold ?? false;
  const isItalic = cellStyle?.italic ?? false;
  const isUnderline = cellStyle?.underline ?? false;

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSavedIndicator = useCallback(() => {
    setSaveStatus('saved');
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
    saveStatusTimerRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  const performSilentSave = useCallback(async (): Promise<boolean> => {
    if (!currentFileHandle) return false;

    try {
      if (currentFileHandle.requestPermission) {
        const perm = await currentFileHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') return false;
      }
      const allSheets = getAllSheetsData();
      const content = buildMultiSheetContent(allSheets);
      const writable = await currentFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      markClean();
      showSavedIndicator();
      return true;
    } catch {
      return false;
    }
  }, [getAllSheetsData, markClean, showSavedIndicator]);

  const handleNewFile = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('Create a new file? Any unsaved changes will be lost.');
      if (!confirmed) return;
    }
    resetWorkbook();
    currentFileHandle = null;
  }, [isDirty, resetWorkbook]);

  const handleOpenFile = useCallback(async () => {
    if (isDirty) {
      const confirmed = window.confirm('Open a file? Any unsaved changes will be lost.');
      if (!confirmed) return;
    }

    /**
     * Helper to process the file content: parse it (supporting both legacy
     * single-sheet CSV and multi-sheet format), and load all sheets into
     * the store. Optionally stores a file handle so subsequent saves go to
     * the same file.
     */
    const processFile = (file: File, handle?: FileSystemFileHandleLocal) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content !== 'string') return;
        const sheetsData = parseMultiSheetContent(content);
        loadAllSheets(sheetsData);
        currentFileHandle = handle ?? null;
      };
      reader.readAsText(file);
    };

    // Try the File System Access API (Chromium browsers)
    const showOpenFilePicker = (window as unknown as Record<string, unknown>)[
      'showOpenFilePicker'
    ] as ((options?: OpenFilePickerOptions) => Promise<FileSystemFileHandleRead[]>) | undefined;

    if (typeof showOpenFilePicker === 'function') {
      try {
        const [handle] = await showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv'] },
            },
          ],
        });
        const file = await handle.getFile();
        processFile(file, handle as unknown as FileSystemFileHandleLocal);
        return;
      } catch (err: unknown) {
        // User cancelled the dialog — silently ignore
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // For any other error, fall through to legacy file input
      }
    }

    // Fallback: hidden file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        processFile(file);
      }
      document.body.removeChild(input);
    });
    document.body.appendChild(input);
    input.click();
  }, [isDirty, loadAllSheets]);

  const handleSave = useCallback(async () => {
    // Try silent save first
    const silentSaved = await performSilentSave();
    if (silentSaved) return;

    // No saved handle — show file picker for first save
    const allSheets = getAllSheetsData();
    const content = buildMultiSheetContent(allSheets);

    const showSaveFilePicker = (window as unknown as Record<string, unknown>)[
      'showSaveFilePicker'
    ] as ((options?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLocal>) | undefined;

    if (typeof showSaveFilePicker === 'function') {
      try {
        const handle = await showSaveFilePicker({
          suggestedName: 'spreadsheet.csv',
          types: [
            {
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        currentFileHandle = handle;
        markClean();
        showSavedIndicator();
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: legacy auto-download approach
    triggerDownload(content, 'spreadsheet.csv');
    markClean();
    showSavedIndicator();
  }, [performSilentSave, getAllSheetsData, markClean, showSavedIndicator]);

  const handleSaveAs = useCallback(async () => {
    const allSheets = getAllSheetsData();
    const content = buildMultiSheetContent(allSheets);

    const showSaveFilePicker = (window as unknown as Record<string, unknown>)[
      'showSaveFilePicker'
    ] as ((options?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLocal>) | undefined;

    if (typeof showSaveFilePicker === 'function') {
      try {
        const handle = await showSaveFilePicker({
          suggestedName: 'spreadsheet.csv',
          types: [
            {
              description: 'CSV Files',
              accept: { 'text/csv': ['.csv'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        currentFileHandle = handle;
        markClean();
        showSavedIndicator();
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: legacy auto-download approach
    triggerDownload(content, 'spreadsheet.csv');
    markClean();
    showSavedIndicator();
  }, [getAllSheetsData, markClean, showSavedIndicator]);

  // Auto-save every 10 seconds when there are unsaved changes and a file handle exists
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty && currentFileHandle) {
        void performSilentSave();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isDirty, performSilentSave]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="toolbar-button" title="New File" onClick={handleNewFile}>
          📄
        </button>
        <button
          className="toolbar-button"
          title="Open File"
          onClick={() => {
            void handleOpenFile();
          }}
        >
          📂
        </button>
        <button
          className="toolbar-button"
          title="Save"
          onClick={() => {
            void handleSave();
          }}
        >
          💾
        </button>
        <button
          className="toolbar-button"
          title="Save As"
          onClick={() => {
            void handleSaveAs();
          }}
        >
          💾+
        </button>
      </div>
      <div className="toolbar-separator" />
      <div className="toolbar-group">
        <button
          className={`toolbar-button ${isBold ? 'active' : ''}`}
          title="Bold"
          onClick={toggleBold}
        >
          <strong>B</strong>
        </button>
        <button
          className={`toolbar-button ${isItalic ? 'active' : ''}`}
          title="Italic"
          onClick={toggleItalic}
        >
          <em>I</em>
        </button>
        <button
          className={`toolbar-button ${isUnderline ? 'active' : ''}`}
          title="Underline"
          onClick={toggleUnderline}
        >
          <u>U</u>
        </button>
      </div>
      <div className="toolbar-separator" />
      <div className="toolbar-group">
        <button className="toolbar-button" title="Align Left">
          ⬅
        </button>
        <button className="toolbar-button" title="Align Center">
          ⬌
        </button>
        <button className="toolbar-button" title="Align Right">
          ➡
        </button>
      </div>
      <div className="toolbar-spacer" />
      <div className="toolbar-status">
        {saveStatus === 'saved' && <span className="toolbar-status-saved">Saved</span>}
        {saveStatus === 'idle' && isDirty && (
          <span className="toolbar-status-unsaved">Unsaved Changes</span>
        )}
      </div>
    </div>
  );
}

/**
 * Trigger a file download in the browser using the Blob + Object URL approach.
 */
function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
