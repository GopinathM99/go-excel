import type { Sheet } from './Sheet';
import type { CellStyle } from './CellStyle';
import { createSheet } from './Sheet';
import { generateId } from '@excel/shared';

/**
 * Named range definition
 */
export interface NamedRange {
  name: string;
  /** Reference string (e.g., "Sheet1!$A$1:$B$10") */
  reference: string;
  /** Scope: undefined for workbook-level, sheet ID for sheet-level */
  scope?: string;
  comment?: string;
}

/**
 * Workbook theme colors
 */
export interface ThemeColors {
  dark1: string;
  light1: string;
  dark2: string;
  light2: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  accent6: string;
  hyperlink: string;
  followedHyperlink: string;
}

/**
 * Default theme colors (based on Office theme)
 */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  dark1: '#000000',
  light1: '#FFFFFF',
  dark2: '#44546A',
  light2: '#E7E6E6',
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',
  hyperlink: '#0563C1',
  followedHyperlink: '#954F72',
};

/**
 * Workbook properties/metadata
 */
export interface WorkbookProperties {
  title?: string;
  subject?: string;
  author?: string;
  company?: string;
  description?: string;
  keywords?: string[];
  category?: string;
  createdAt?: number;
  modifiedAt?: number;
  lastAuthor?: string;
}

/**
 * Cell style registry entry
 */
export interface RegisteredStyle {
  id: string;
  name: string;
  style: CellStyle;
  builtIn?: boolean;
}

/**
 * Represents a complete workbook (Excel file)
 */
export interface Workbook {
  /** Unique identifier */
  id: string;

  /** File name (without extension) */
  name: string;

  /** All sheets in the workbook */
  sheets: Sheet[];

  /** Index of the currently active sheet */
  activeSheetIndex: number;

  /** Named ranges */
  namedRanges: NamedRange[];

  /** Workbook properties/metadata */
  properties: WorkbookProperties;

  /** Theme colors */
  themeColors: ThemeColors;

  /** Registered cell styles */
  styles: RegisteredStyle[];

  /** Calculation mode: auto, manual, or autoExceptTables */
  calcMode: 'auto' | 'manual' | 'autoExceptTables';

  /** Whether the workbook has unsaved changes */
  isDirty: boolean;

  /** File path (for desktop/saved files) */
  filePath?: string;
}

/**
 * Creates a new empty workbook with one sheet
 */
export function createWorkbook(name = 'Workbook1'): Workbook {
  const sheet = createSheet('Sheet1');
  return {
    id: generateId(),
    name,
    sheets: [sheet],
    activeSheetIndex: 0,
    namedRanges: [],
    properties: {
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    },
    themeColors: DEFAULT_THEME_COLORS,
    styles: createDefaultStyles(),
    calcMode: 'auto',
    isDirty: false,
  };
}

/**
 * Creates the default built-in styles
 */
function createDefaultStyles(): RegisteredStyle[] {
  return [
    {
      id: 'normal',
      name: 'Normal',
      style: {},
      builtIn: true,
    },
    {
      id: 'heading1',
      name: 'Heading 1',
      style: {
        font: { bold: true, size: 15 },
      },
      builtIn: true,
    },
    {
      id: 'heading2',
      name: 'Heading 2',
      style: {
        font: { bold: true, size: 13 },
      },
      builtIn: true,
    },
    {
      id: 'heading3',
      name: 'Heading 3',
      style: {
        font: { bold: true, size: 11 },
      },
      builtIn: true,
    },
    {
      id: 'heading4',
      name: 'Heading 4',
      style: {
        font: { bold: true, italic: true, size: 11 },
      },
      builtIn: true,
    },
    {
      id: 'good',
      name: 'Good',
      style: {
        font: { color: '#006100' },
        fill: '#C6EFCE',
      },
      builtIn: true,
    },
    {
      id: 'bad',
      name: 'Bad',
      style: {
        font: { color: '#9C0006' },
        fill: '#FFC7CE',
      },
      builtIn: true,
    },
    {
      id: 'neutral',
      name: 'Neutral',
      style: {
        font: { color: '#9C5700' },
        fill: '#FFEB9C',
      },
      builtIn: true,
    },
  ];
}

/**
 * Gets the active sheet
 */
export function getActiveSheet(workbook: Workbook): Sheet {
  const sheet = workbook.sheets[workbook.activeSheetIndex];
  if (!sheet) {
    throw new Error('No active sheet');
  }
  return sheet;
}

/**
 * Gets a sheet by ID
 */
export function getSheetById(workbook: Workbook, id: string): Sheet | undefined {
  return workbook.sheets.find((s) => s.id === id);
}

/**
 * Gets a sheet by name
 */
export function getSheetByName(workbook: Workbook, name: string): Sheet | undefined {
  return workbook.sheets.find((s) => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Gets a sheet by index
 */
export function getSheetByIndex(workbook: Workbook, index: number): Sheet | undefined {
  return workbook.sheets[index];
}

/**
 * Sets the active sheet by index
 */
export function setActiveSheet(workbook: Workbook, index: number): Workbook {
  if (index < 0 || index >= workbook.sheets.length) {
    throw new Error(`Invalid sheet index: ${index}`);
  }
  return { ...workbook, activeSheetIndex: index, isDirty: true };
}

/**
 * Adds a new sheet to the workbook
 */
export function addSheet(workbook: Workbook, name?: string): Workbook {
  const sheetName = name ?? generateUniqueSheetName(workbook);
  const newSheet = createSheet(sheetName);
  return {
    ...workbook,
    sheets: [...workbook.sheets, newSheet],
    isDirty: true,
  };
}

/**
 * Inserts a sheet at a specific position
 */
export function insertSheet(
  workbook: Workbook,
  index: number,
  name?: string
): Workbook {
  const sheetName = name ?? generateUniqueSheetName(workbook);
  const newSheet = createSheet(sheetName);
  const newSheets = [...workbook.sheets];
  newSheets.splice(index, 0, newSheet);

  // Adjust active sheet index if needed
  let newActiveIndex = workbook.activeSheetIndex;
  if (index <= workbook.activeSheetIndex) {
    newActiveIndex++;
  }

  return {
    ...workbook,
    sheets: newSheets,
    activeSheetIndex: newActiveIndex,
    isDirty: true,
  };
}

/**
 * Removes a sheet from the workbook
 */
export function removeSheet(workbook: Workbook, index: number): Workbook {
  if (workbook.sheets.length <= 1) {
    throw new Error('Cannot remove the last sheet');
  }
  if (index < 0 || index >= workbook.sheets.length) {
    throw new Error(`Invalid sheet index: ${index}`);
  }

  const newSheets = workbook.sheets.filter((_, i) => i !== index);

  // Adjust active sheet index
  let newActiveIndex = workbook.activeSheetIndex;
  if (index < workbook.activeSheetIndex) {
    newActiveIndex--;
  } else if (index === workbook.activeSheetIndex) {
    newActiveIndex = Math.min(index, newSheets.length - 1);
  }

  return {
    ...workbook,
    sheets: newSheets,
    activeSheetIndex: newActiveIndex,
    isDirty: true,
  };
}

/**
 * Renames a sheet
 */
export function renameSheet(
  workbook: Workbook,
  index: number,
  newName: string
): Workbook {
  if (index < 0 || index >= workbook.sheets.length) {
    throw new Error(`Invalid sheet index: ${index}`);
  }

  // Check for duplicate name
  if (workbook.sheets.some((s, i) => i !== index && s.name.toLowerCase() === newName.toLowerCase())) {
    throw new Error(`Sheet name "${newName}" already exists`);
  }

  const newSheets = workbook.sheets.map((sheet, i) =>
    i === index ? { ...sheet, name: newName } : sheet
  );

  return { ...workbook, sheets: newSheets, isDirty: true };
}

/**
 * Moves a sheet to a new position
 */
export function moveSheet(
  workbook: Workbook,
  fromIndex: number,
  toIndex: number
): Workbook {
  if (fromIndex === toIndex) return workbook;
  if (fromIndex < 0 || fromIndex >= workbook.sheets.length) {
    throw new Error(`Invalid source index: ${fromIndex}`);
  }
  if (toIndex < 0 || toIndex >= workbook.sheets.length) {
    throw new Error(`Invalid destination index: ${toIndex}`);
  }

  const newSheets = [...workbook.sheets];
  const [sheet] = newSheets.splice(fromIndex, 1);
  newSheets.splice(toIndex, 0, sheet!);

  // Adjust active sheet index
  let newActiveIndex = workbook.activeSheetIndex;
  if (workbook.activeSheetIndex === fromIndex) {
    newActiveIndex = toIndex;
  } else if (fromIndex < workbook.activeSheetIndex && toIndex >= workbook.activeSheetIndex) {
    newActiveIndex--;
  } else if (fromIndex > workbook.activeSheetIndex && toIndex <= workbook.activeSheetIndex) {
    newActiveIndex++;
  }

  return {
    ...workbook,
    sheets: newSheets,
    activeSheetIndex: newActiveIndex,
    isDirty: true,
  };
}

/**
 * Duplicates a sheet
 */
export function duplicateSheet(workbook: Workbook, index: number): Workbook {
  if (index < 0 || index >= workbook.sheets.length) {
    throw new Error(`Invalid sheet index: ${index}`);
  }

  const sourceSheet = workbook.sheets[index]!;
  const baseName = sourceSheet.name;
  let copyNumber = 1;
  let newName = `${baseName} (${copyNumber})`;

  while (workbook.sheets.some((s) => s.name.toLowerCase() === newName.toLowerCase())) {
    copyNumber++;
    newName = `${baseName} (${copyNumber})`;
  }

  const newSheet: Sheet = {
    ...sourceSheet,
    id: generateId(),
    name: newName,
    cells: new Map(sourceSheet.cells),
    columnWidths: new Map(sourceSheet.columnWidths),
    rowHeights: new Map(sourceSheet.rowHeights),
    hiddenColumns: new Set(sourceSheet.hiddenColumns),
    hiddenRows: new Set(sourceSheet.hiddenRows),
    mergedRegions: [...sourceSheet.mergedRegions],
    conditionalFormats: [...sourceSheet.conditionalFormats],
    charts: [...sourceSheet.charts],
    columnStyles: new Map(sourceSheet.columnStyles),
    rowStyles: new Map(sourceSheet.rowStyles),
  };

  const newSheets = [...workbook.sheets];
  newSheets.splice(index + 1, 0, newSheet);

  return {
    ...workbook,
    sheets: newSheets,
    isDirty: true,
  };
}

/**
 * Updates a sheet in the workbook
 */
export function updateSheet(workbook: Workbook, sheet: Sheet): Workbook {
  const index = workbook.sheets.findIndex((s) => s.id === sheet.id);
  if (index === -1) {
    throw new Error(`Sheet not found: ${sheet.id}`);
  }

  const newSheets = [...workbook.sheets];
  newSheets[index] = sheet;

  return {
    ...workbook,
    sheets: newSheets,
    isDirty: true,
    properties: {
      ...workbook.properties,
      modifiedAt: Date.now(),
    },
  };
}

/**
 * Adds a named range
 */
export function addNamedRange(
  workbook: Workbook,
  name: string,
  reference: string,
  scope?: string,
  comment?: string
): Workbook {
  // Validate name (must start with letter or underscore, no spaces)
  if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name)) {
    throw new Error(`Invalid named range name: ${name}`);
  }

  // Check for duplicates in same scope
  if (workbook.namedRanges.some((nr) => nr.name.toLowerCase() === name.toLowerCase() && nr.scope === scope)) {
    throw new Error(`Named range "${name}" already exists`);
  }

  return {
    ...workbook,
    namedRanges: [...workbook.namedRanges, { name, reference, scope, comment }],
    isDirty: true,
  };
}

/**
 * Removes a named range
 */
export function removeNamedRange(workbook: Workbook, name: string, scope?: string): Workbook {
  return {
    ...workbook,
    namedRanges: workbook.namedRanges.filter(
      (nr) => !(nr.name.toLowerCase() === name.toLowerCase() && nr.scope === scope)
    ),
    isDirty: true,
  };
}

/**
 * Gets a named range by name
 */
export function getNamedRange(
  workbook: Workbook,
  name: string,
  currentSheetId?: string
): NamedRange | undefined {
  // First check sheet-level scope if provided
  if (currentSheetId) {
    const sheetScoped = workbook.namedRanges.find(
      (nr) => nr.name.toLowerCase() === name.toLowerCase() && nr.scope === currentSheetId
    );
    if (sheetScoped) return sheetScoped;
  }

  // Then check workbook-level scope
  return workbook.namedRanges.find(
    (nr) => nr.name.toLowerCase() === name.toLowerCase() && nr.scope === undefined
  );
}

/**
 * Generates a unique sheet name
 */
function generateUniqueSheetName(workbook: Workbook): string {
  let index = workbook.sheets.length + 1;
  let name = `Sheet${index}`;

  while (workbook.sheets.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    index++;
    name = `Sheet${index}`;
  }

  return name;
}

/**
 * Marks the workbook as saved
 */
export function markAsSaved(workbook: Workbook, filePath?: string): Workbook {
  return {
    ...workbook,
    isDirty: false,
    filePath: filePath ?? workbook.filePath,
  };
}

/**
 * Sets the calculation mode
 */
export function setCalcMode(
  workbook: Workbook,
  mode: 'auto' | 'manual' | 'autoExceptTables'
): Workbook {
  return { ...workbook, calcMode: mode };
}
