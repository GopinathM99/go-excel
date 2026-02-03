import type { Command } from '../commands/Command';
import type { Workbook } from '../models/Workbook';
import { DEFAULT_UNDO_STACK_SIZE } from '@excel/shared';

/**
 * Event types emitted by UndoManager
 */
export type UndoManagerEvent =
  | { type: 'push'; command: Command }
  | { type: 'undo'; command: Command }
  | { type: 'redo'; command: Command }
  | { type: 'clear' };

export type UndoManagerListener = (event: UndoManagerEvent) => void;

/**
 * Manages undo/redo operations for the workbook
 */
export class UndoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize: number;
  private listeners: Set<UndoManagerListener> = new Set();
  private isExecuting = false;
  private mergeTimeout: number | null = null;
  private lastCommandTime = 0;
  private readonly mergeWindow = 500; // ms

  constructor(maxStackSize: number = DEFAULT_UNDO_STACK_SIZE) {
    this.maxStackSize = maxStackSize;
  }

  /**
   * Execute a command and add it to the undo stack
   */
  execute(command: Command, workbook: Workbook): Workbook {
    if (this.isExecuting) {
      throw new Error('Cannot execute command while another command is executing');
    }

    this.isExecuting = true;

    try {
      const result = command.execute(workbook);

      // Try to merge with previous command if within merge window
      const now = Date.now();
      const lastCommand = this.undoStack[this.undoStack.length - 1];

      if (
        lastCommand &&
        now - this.lastCommandTime < this.mergeWindow &&
        lastCommand.canMergeWith?.(command)
      ) {
        // Merge with previous command
        const merged = lastCommand.mergeWith!(command);
        this.undoStack[this.undoStack.length - 1] = merged;
      } else {
        // Add as new command
        this.undoStack.push(command);

        // Trim stack if needed
        if (this.undoStack.length > this.maxStackSize) {
          this.undoStack.shift();
        }
      }

      this.lastCommandTime = now;

      // Clear redo stack on new command
      this.redoStack = [];

      this.emit({ type: 'push', command });

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo the last command
   */
  undo(workbook: Workbook): Workbook | null {
    const command = this.undoStack.pop();
    if (!command) return null;

    if (this.isExecuting) {
      throw new Error('Cannot undo while a command is executing');
    }

    this.isExecuting = true;

    try {
      const result = command.undo(workbook);
      this.redoStack.push(command);
      this.emit({ type: 'undo', command });
      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo the last undone command
   */
  redo(workbook: Workbook): Workbook | null {
    const command = this.redoStack.pop();
    if (!command) return null;

    if (this.isExecuting) {
      throw new Error('Cannot redo while a command is executing');
    }

    this.isExecuting = true;

    try {
      const result = command.execute(workbook);
      this.undoStack.push(command);
      this.emit({ type: 'redo', command });
      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the description of the next undo action
   */
  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command?.description ?? null;
  }

  /**
   * Get the description of the next redo action
   */
  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command?.description ?? null;
  }

  /**
   * Clear all undo/redo history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emit({ type: 'clear' });
  }

  /**
   * Get the number of commands in the undo stack
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of commands in the redo stack
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * Subscribe to undo manager events
   */
  subscribe(listener: UndoManagerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: UndoManagerEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Set the maximum stack size
   */
  setMaxStackSize(size: number): void {
    this.maxStackSize = size;

    // Trim stacks if necessary
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    while (this.redoStack.length > this.maxStackSize) {
      this.redoStack.shift();
    }
  }

  /**
   * Begin a batch of commands that will be grouped together
   */
  beginBatch(): BatchBuilder {
    return new BatchBuilder(this);
  }
}

/**
 * Builder for creating batched/grouped commands
 */
export class BatchBuilder {
  private manager: UndoManager;
  private commands: Command[] = [];
  private description: string = 'Batch operation';

  constructor(manager: UndoManager) {
    this.manager = manager;
  }

  /**
   * Set the description for the batch
   */
  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Add a command to the batch
   */
  add(command: Command): this {
    this.commands.push(command);
    return this;
  }

  /**
   * Execute all commands in the batch as a single undoable action
   */
  commit(workbook: Workbook): Workbook {
    if (this.commands.length === 0) {
      return workbook;
    }

    if (this.commands.length === 1) {
      return this.manager.execute(this.commands[0]!, workbook);
    }

    // Import dynamically to avoid circular dependency
    const { CommandGroup } = require('../commands/Command');
    const group = new CommandGroup(this.description, this.commands);
    return this.manager.execute(group, workbook);
  }
}
