import type { CellAddress } from '../models/CellAddress';
import type { CellRange } from '../models/CellRange';
import type { Cell } from '../models/Cell';
import type { Sheet } from '../models/Sheet';
import type { CellStyle } from '../models/CellStyle';
import { SheetCommand, Command } from './Command';
import { getCell, setCell, deleteCell, setCells, clearRange } from '../models/Sheet';
import { createCell, updateCellContent, updateCellStyle, clearCellContent } from '../models/Cell';
import { cellAddressKey } from '../models/CellAddress';
import { iterateRange } from '../models/CellRange';

/**
 * Command to set a cell's value
 */
export class SetCellValueCommand extends SheetCommand {
  readonly id: string;
  readonly description: string;

  private readonly address: CellAddress;
  private readonly newValue: string;
  private previousValue: string | null = null;

  constructor(sheetId: string, address: CellAddress, newValue: string) {
    super(sheetId);
    this.id = `set-cell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.address = address;
    this.newValue = newValue;
    this.description = `Set cell ${cellAddressKey(address)} to "${newValue.slice(0, 20)}${newValue.length > 20 ? '...' : ''}"`;
  }

  executeOnSheet(sheet: Sheet): Sheet {
    const cell = getCell(sheet, this.address);
    this.previousValue = cell.content.raw;

    const updatedCell = updateCellContent(cell, this.newValue);
    return setCell(sheet, updatedCell);
  }

  undoOnSheet(sheet: Sheet): Sheet {
    if (this.previousValue === null) {
      throw new Error('Cannot undo: command was not executed');
    }

    const cell = getCell(sheet, this.address);
    const updatedCell = updateCellContent(cell, this.previousValue);
    return setCell(sheet, updatedCell);
  }

  canMergeWith(other: Command): boolean {
    if (!(other instanceof SetCellValueCommand)) return false;
    return (
      other.sheetId === this.sheetId &&
      other.address.row === this.address.row &&
      other.address.col === this.address.col
    );
  }

  mergeWith(other: Command): Command {
    if (!(other instanceof SetCellValueCommand)) {
      throw new Error('Cannot merge with different command type');
    }
    // Keep the original previous value, use the new value from the other command
    const merged = new SetCellValueCommand(this.sheetId, this.address, other.newValue);
    merged.previousValue = this.previousValue;
    return merged;
  }
}

/**
 * Command to clear a range of cells
 */
export class ClearRangeCommand extends SheetCommand {
  readonly id: string;
  readonly description: string;

  private readonly range: CellRange;
  private readonly clearContent: boolean;
  private readonly clearStyle: boolean;
  private previousCells: Map<string, Cell> = new Map();

  constructor(
    sheetId: string,
    range: CellRange,
    options: { content?: boolean; style?: boolean } = {}
  ) {
    super(sheetId);
    this.id = `clear-range-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.range = range;
    this.clearContent = options.content ?? true;
    this.clearStyle = options.style ?? false;
    this.description = `Clear range ${cellAddressKey(range.start)}:${cellAddressKey(range.end)}`;
  }

  executeOnSheet(sheet: Sheet): Sheet {
    // Save previous state
    for (const addr of iterateRange(this.range)) {
      const key = cellAddressKey(addr);
      const cell = sheet.cells.get(key);
      if (cell) {
        this.previousCells.set(key, cell);
      }
    }

    if (this.clearContent && this.clearStyle) {
      return clearRange(sheet, this.range);
    }

    let newSheet = sheet;
    for (const addr of iterateRange(this.range)) {
      const cell = getCell(newSheet, addr);

      if (this.clearContent) {
        newSheet = setCell(newSheet, clearCellContent(cell));
      }
      if (this.clearStyle) {
        newSheet = setCell(newSheet, { ...cell, style: undefined });
      }
    }

    return newSheet;
  }

  undoOnSheet(sheet: Sheet): Sheet {
    // First clear the range
    let newSheet = clearRange(sheet, this.range);

    // Then restore previous cells
    const cellsToRestore: Cell[] = [];
    for (const cell of this.previousCells.values()) {
      cellsToRestore.push(cell);
    }

    return setCells(newSheet, cellsToRestore);
  }
}

/**
 * Command to set cell style
 */
export class SetCellStyleCommand extends SheetCommand {
  readonly id: string;
  readonly description: string;

  private readonly address: CellAddress;
  private readonly newStyle: CellStyle;
  private previousStyle: CellStyle | undefined;

  constructor(sheetId: string, address: CellAddress, style: CellStyle) {
    super(sheetId);
    this.id = `set-style-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.address = address;
    this.newStyle = style;
    this.description = `Set style for cell ${cellAddressKey(address)}`;
  }

  executeOnSheet(sheet: Sheet): Sheet {
    const cell = getCell(sheet, this.address);
    this.previousStyle = cell.style;

    const updatedCell = updateCellStyle(cell, this.newStyle);
    return setCell(sheet, updatedCell);
  }

  undoOnSheet(sheet: Sheet): Sheet {
    const cell = getCell(sheet, this.address);
    const updatedCell = { ...cell, style: this.previousStyle };
    return setCell(sheet, updatedCell);
  }
}

/**
 * Command to set style for a range of cells
 */
export class SetRangeStyleCommand extends SheetCommand {
  readonly id: string;
  readonly description: string;

  private readonly range: CellRange;
  private readonly newStyle: CellStyle;
  private previousStyles: Map<string, CellStyle | undefined> = new Map();

  constructor(sheetId: string, range: CellRange, style: CellStyle) {
    super(sheetId);
    this.id = `set-range-style-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.range = range;
    this.newStyle = style;
    this.description = `Set style for range ${cellAddressKey(range.start)}:${cellAddressKey(range.end)}`;
  }

  executeOnSheet(sheet: Sheet): Sheet {
    let newSheet = sheet;

    for (const addr of iterateRange(this.range)) {
      const key = cellAddressKey(addr);
      const cell = getCell(newSheet, addr);
      this.previousStyles.set(key, cell.style);

      const updatedCell = updateCellStyle(cell, this.newStyle);
      newSheet = setCell(newSheet, updatedCell);
    }

    return newSheet;
  }

  undoOnSheet(sheet: Sheet): Sheet {
    let newSheet = sheet;

    for (const addr of iterateRange(this.range)) {
      const key = cellAddressKey(addr);
      const cell = getCell(newSheet, addr);
      const previousStyle = this.previousStyles.get(key);

      const updatedCell = { ...cell, style: previousStyle };
      newSheet = setCell(newSheet, updatedCell);
    }

    return newSheet;
  }
}

/**
 * Command to paste cells
 */
export class PasteCellsCommand extends SheetCommand {
  readonly id: string;
  readonly description: string;

  private readonly targetStart: CellAddress;
  private readonly cells: Cell[];
  private previousCells: Map<string, Cell | undefined> = new Map();

  constructor(sheetId: string, targetStart: CellAddress, cells: Cell[]) {
    super(sheetId);
    this.id = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.targetStart = targetStart;
    this.cells = cells;
    this.description = `Paste ${cells.length} cells at ${cellAddressKey(targetStart)}`;
  }

  executeOnSheet(sheet: Sheet): Sheet {
    let newSheet = sheet;

    // Calculate offset from source to target
    if (this.cells.length === 0) return sheet;

    const sourceStart = this.cells[0]!.address;
    const rowOffset = this.targetStart.row - sourceStart.row;
    const colOffset = this.targetStart.col - sourceStart.col;

    for (const cell of this.cells) {
      const targetAddr: CellAddress = {
        row: cell.address.row + rowOffset,
        col: cell.address.col + colOffset,
        sheetName: sheet.name,
      };
      const key = cellAddressKey(targetAddr);

      // Save previous state
      this.previousCells.set(key, sheet.cells.get(key));

      // Create new cell at target location
      const newCell = createCell(
        targetAddr,
        cell.content.raw,
        cell.value,
        cell.style
      );
      newSheet = setCell(newSheet, newCell);
    }

    return newSheet;
  }

  undoOnSheet(sheet: Sheet): Sheet {
    let newSheet = sheet;

    for (const [key, previousCell] of this.previousCells) {
      if (previousCell) {
        newSheet = setCell(newSheet, previousCell);
      } else {
        // Parse key to get address
        const [rowStr, colStr] = key.split(',');
        newSheet = deleteCell(newSheet, {
          row: parseInt(rowStr!, 10),
          col: parseInt(colStr!, 10),
        });
      }
    }

    return newSheet;
  }
}
