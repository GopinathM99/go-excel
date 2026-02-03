import type { Sheet } from '../models/Sheet';
import type { Workbook } from '../models/Workbook';

/**
 * Base interface for all commands that can be executed, undone, and redone
 */
export interface Command {
  /** Unique identifier for this command */
  readonly id: string;

  /** Human-readable description of the command */
  readonly description: string;

  /** Execute the command and return the modified workbook */
  execute(workbook: Workbook): Workbook;

  /** Undo the command and return the workbook to its previous state */
  undo(workbook: Workbook): Workbook;

  /** Whether this command can be merged with another command of the same type */
  canMergeWith?(other: Command): boolean;

  /** Merge this command with another command (for grouping rapid edits) */
  mergeWith?(other: Command): Command;
}

/**
 * Command that operates on a single sheet
 */
export abstract class SheetCommand implements Command {
  abstract readonly id: string;
  abstract readonly description: string;
  readonly sheetId: string;

  constructor(sheetId: string) {
    this.sheetId = sheetId;
  }

  abstract executeOnSheet(sheet: Sheet): Sheet;
  abstract undoOnSheet(sheet: Sheet): Sheet;

  execute(workbook: Workbook): Workbook {
    const sheetIndex = workbook.sheets.findIndex((s) => s.id === this.sheetId);
    if (sheetIndex === -1) {
      throw new Error(`Sheet not found: ${this.sheetId}`);
    }

    const newSheets = [...workbook.sheets];
    newSheets[sheetIndex] = this.executeOnSheet(newSheets[sheetIndex]!);

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

  undo(workbook: Workbook): Workbook {
    const sheetIndex = workbook.sheets.findIndex((s) => s.id === this.sheetId);
    if (sheetIndex === -1) {
      throw new Error(`Sheet not found: ${this.sheetId}`);
    }

    const newSheets = [...workbook.sheets];
    newSheets[sheetIndex] = this.undoOnSheet(newSheets[sheetIndex]!);

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
}

/**
 * Command group that treats multiple commands as a single undoable action
 */
export class CommandGroup implements Command {
  readonly id: string;
  readonly description: string;
  readonly commands: Command[];

  constructor(description: string, commands: Command[]) {
    this.id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.description = description;
    this.commands = commands;
  }

  execute(workbook: Workbook): Workbook {
    let result = workbook;
    for (const command of this.commands) {
      result = command.execute(result);
    }
    return result;
  }

  undo(workbook: Workbook): Workbook {
    let result = workbook;
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      result = this.commands[i]!.undo(result);
    }
    return result;
  }
}
