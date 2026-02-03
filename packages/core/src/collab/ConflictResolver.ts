/**
 * ConflictResolver - Handle edge case conflicts in collaborative editing
 *
 * Yjs provides last-write-wins conflict resolution by default through CRDTs.
 * This module handles higher-level structural conflicts that need custom resolution:
 * - Simultaneous sheet operations (add/remove/rename)
 * - Concurrent structural changes (insert/delete rows/columns)
 * - Merge conflicts for complex cell data
 */

import type * as Y from 'yjs';
import type { CellStyle } from '../models/CellStyle';
import type { CellRange } from '../models/CellRange';

/**
 * Types of conflicts that can occur
 */
export type ConflictType =
  | 'sheet_delete_while_editing'
  | 'sheet_rename_collision'
  | 'cell_type_mismatch'
  | 'merged_region_overlap'
  | 'row_delete_with_data'
  | 'column_delete_with_data'
  | 'formula_reference_invalidation'
  | 'concurrent_style_change';

/**
 * Conflict resolution strategies
 */
export type ResolutionStrategy =
  | 'keep_local'
  | 'keep_remote'
  | 'merge'
  | 'auto'
  | 'prompt_user';

/**
 * Conflict description with context
 */
export interface Conflict {
  /** Type of conflict */
  type: ConflictType;
  /** Human-readable description */
  description: string;
  /** Local value involved */
  localValue?: unknown;
  /** Remote value involved */
  remoteValue?: unknown;
  /** Timestamp of conflict detection */
  timestamp: number;
  /** Affected location (sheet, cell, etc.) */
  location?: {
    sheet?: string;
    row?: number;
    col?: number;
    range?: CellRange;
  };
  /** Suggested resolution strategy */
  suggestedStrategy: ResolutionStrategy;
}

/**
 * Resolution result
 */
export interface ResolutionResult {
  /** Whether resolution was successful */
  success: boolean;
  /** Strategy that was applied */
  strategy: ResolutionStrategy;
  /** Resolved value (if applicable) */
  resolvedValue?: unknown;
  /** Any warnings or notes */
  warnings?: string[];
}

/**
 * Callback for conflict notification
 */
export type ConflictCallback = (conflict: Conflict) => void;

/**
 * Callback for resolution request (when user input is needed)
 */
export type ResolutionRequestCallback = (
  conflict: Conflict
) => Promise<ResolutionStrategy>;

/**
 * Sheet operation types
 */
type SheetOperation = 'add' | 'remove' | 'rename' | 'move';

/**
 * Pending sheet operation for conflict tracking
 */
interface PendingSheetOperation {
  type: SheetOperation;
  sheetId: string;
  timestamp: number;
  clientId: number;
  data?: {
    newName?: string;
    oldName?: string;
    newIndex?: number;
    oldIndex?: number;
  };
}

/**
 * ConflictResolver class for handling collaborative editing conflicts
 */
export class ConflictResolver {
  private ydoc: Y.Doc;
  private defaultStrategy: ResolutionStrategy;
  private conflictCallbacks: Set<ConflictCallback>;
  private resolutionRequestCallback: ResolutionRequestCallback | null = null;
  private pendingSheetOperations: Map<string, PendingSheetOperation[]>;
  private conflictHistory: Conflict[];
  private maxHistorySize: number;

  /**
   * Creates a new ConflictResolver
   * @param ydoc - Yjs document
   * @param options - Configuration options
   */
  constructor(
    ydoc: Y.Doc,
    options: {
      defaultStrategy?: ResolutionStrategy;
      maxHistorySize?: number;
    } = {}
  ) {
    this.ydoc = ydoc;
    this.defaultStrategy = options.defaultStrategy ?? 'auto';
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.conflictCallbacks = new Set();
    this.pendingSheetOperations = new Map();
    this.conflictHistory = [];
  }

  /**
   * Register a callback for conflict notifications
   * @param callback - Function to call when a conflict is detected
   * @returns Unsubscribe function
   */
  onConflict(callback: ConflictCallback): () => void {
    this.conflictCallbacks.add(callback);
    return () => {
      this.conflictCallbacks.delete(callback);
    };
  }

  /**
   * Set a callback for resolution requests (when user input is needed)
   * @param callback - Function to call to request user resolution
   */
  setResolutionRequestCallback(callback: ResolutionRequestCallback): void {
    this.resolutionRequestCallback = callback;
  }

  /**
   * Check for sheet name collision before renaming
   * @param newName - Proposed new name
   * @param sheetId - ID of sheet being renamed
   * @param existingNames - Set of existing sheet names
   * @returns Resolution result
   */
  resolveSheetRenameCollision(
    newName: string,
    sheetId: string,
    existingNames: Set<string>
  ): ResolutionResult {
    const normalizedNew = newName.toLowerCase();
    const hasCollision = existingNames.has(normalizedNew);

    if (!hasCollision) {
      return {
        success: true,
        strategy: 'auto',
        resolvedValue: newName,
      };
    }

    // Generate unique name by appending number
    let counter = 1;
    let uniqueName = `${newName} (${counter})`;
    while (existingNames.has(uniqueName.toLowerCase())) {
      counter++;
      uniqueName = `${newName} (${counter})`;
    }

    const conflict: Conflict = {
      type: 'sheet_rename_collision',
      description: `Sheet name "${newName}" already exists. Renamed to "${uniqueName}".`,
      localValue: newName,
      remoteValue: uniqueName,
      timestamp: Date.now(),
      location: { sheet: sheetId },
      suggestedStrategy: 'auto',
    };

    this.notifyConflict(conflict);

    return {
      success: true,
      strategy: 'auto',
      resolvedValue: uniqueName,
      warnings: [`Sheet renamed to "${uniqueName}" to avoid collision`],
    };
  }

  /**
   * Handle sheet deletion while users are editing it
   * @param sheetId - ID of deleted sheet
   * @param sheetName - Name of deleted sheet
   * @param activeUsers - Users currently viewing/editing the sheet
   * @returns Resolution result
   */
  async resolveSheetDeleteWhileEditing(
    sheetId: string,
    sheetName: string,
    activeUsers: string[]
  ): Promise<ResolutionResult> {
    if (activeUsers.length === 0) {
      return {
        success: true,
        strategy: 'auto',
      };
    }

    const conflict: Conflict = {
      type: 'sheet_delete_while_editing',
      description: `Sheet "${sheetName}" was deleted while ${activeUsers.length} user(s) were editing it.`,
      localValue: sheetId,
      remoteValue: activeUsers,
      timestamp: Date.now(),
      location: { sheet: sheetId },
      suggestedStrategy: 'keep_remote',
    };

    this.notifyConflict(conflict);

    // If we have a resolution callback and strategy is prompt_user
    if (this.defaultStrategy === 'prompt_user' && this.resolutionRequestCallback) {
      const strategy = await this.resolutionRequestCallback(conflict);
      return {
        success: true,
        strategy,
        warnings: [`Sheet deletion resolved with strategy: ${strategy}`],
      };
    }

    // Default: accept the deletion (remote wins)
    return {
      success: true,
      strategy: 'keep_remote',
      warnings: [
        `Sheet "${sheetName}" was deleted. Active users have been notified.`,
      ],
    };
  }

  /**
   * Resolve concurrent cell style changes
   * @param localStyle - Local style changes
   * @param remoteStyle - Remote style changes
   * @returns Merged style
   */
  resolveCellStyleConflict(
    localStyle: Partial<CellStyle>,
    remoteStyle: Partial<CellStyle>
  ): ResolutionResult {
    // For styles, we merge by giving remote more recent changes priority
    // but preserving local changes for properties not touched by remote
    const mergedStyle: Partial<CellStyle> = {
      ...localStyle,
      ...remoteStyle,
    };

    // Special handling for nested objects
    if (localStyle.font && remoteStyle.font) {
      mergedStyle.font = {
        ...localStyle.font,
        ...remoteStyle.font,
      };
    }

    if (localStyle.borders && remoteStyle.borders) {
      mergedStyle.borders = {
        ...localStyle.borders,
        ...remoteStyle.borders,
      };
    }

    const conflict: Conflict = {
      type: 'concurrent_style_change',
      description: 'Concurrent style changes detected, styles have been merged.',
      localValue: localStyle,
      remoteValue: remoteStyle,
      timestamp: Date.now(),
      suggestedStrategy: 'merge',
    };

    this.notifyConflict(conflict);

    return {
      success: true,
      strategy: 'merge',
      resolvedValue: mergedStyle,
    };
  }

  /**
   * Check for merged region overlap conflicts
   * @param newRegion - Proposed new merged region
   * @param existingRegions - Existing merged regions
   * @returns Resolution result
   */
  resolveMergedRegionOverlap(
    newRegion: CellRange,
    existingRegions: CellRange[]
  ): ResolutionResult {
    const overlappingRegions: CellRange[] = [];

    for (const existing of existingRegions) {
      if (this.rangesOverlap(newRegion, existing)) {
        overlappingRegions.push(existing);
      }
    }

    if (overlappingRegions.length === 0) {
      return {
        success: true,
        strategy: 'auto',
        resolvedValue: newRegion,
      };
    }

    // Cannot merge overlapping regions - reject the operation
    const conflict: Conflict = {
      type: 'merged_region_overlap',
      description: `Cannot create merged region: overlaps with ${overlappingRegions.length} existing region(s).`,
      localValue: newRegion,
      remoteValue: overlappingRegions,
      timestamp: Date.now(),
      location: { range: newRegion },
      suggestedStrategy: 'keep_remote',
    };

    this.notifyConflict(conflict);

    return {
      success: false,
      strategy: 'keep_remote',
      warnings: ['Merged region creation rejected due to overlap'],
    };
  }

  /**
   * Handle formula reference invalidation (e.g., when referenced cells are deleted)
   * @param formula - Original formula
   * @param invalidRefs - References that are now invalid
   * @returns Resolution result with updated formula
   */
  resolveFormulaReferenceInvalidation(
    formula: string,
    invalidRefs: string[]
  ): ResolutionResult {
    if (invalidRefs.length === 0) {
      return {
        success: true,
        strategy: 'auto',
        resolvedValue: formula,
      };
    }

    // Replace invalid references with #REF! error
    let updatedFormula = formula;
    for (const ref of invalidRefs) {
      // Use word boundary matching to avoid partial replacements
      const regex = new RegExp(`\\b${this.escapeRegex(ref)}\\b`, 'gi');
      updatedFormula = updatedFormula.replace(regex, '#REF!');
    }

    const conflict: Conflict = {
      type: 'formula_reference_invalidation',
      description: `Formula references invalidated: ${invalidRefs.join(', ')}`,
      localValue: formula,
      remoteValue: updatedFormula,
      timestamp: Date.now(),
      suggestedStrategy: 'auto',
    };

    this.notifyConflict(conflict);

    return {
      success: true,
      strategy: 'auto',
      resolvedValue: updatedFormula,
      warnings: [`Formula updated: ${invalidRefs.length} reference(s) replaced with #REF!`],
    };
  }

  /**
   * Track a pending sheet operation for conflict detection
   * @param operation - The operation being performed
   */
  trackSheetOperation(operation: PendingSheetOperation): void {
    const key = operation.sheetId;
    if (!this.pendingSheetOperations.has(key)) {
      this.pendingSheetOperations.set(key, []);
    }
    this.pendingSheetOperations.get(key)!.push(operation);

    // Clean up old operations (older than 30 seconds)
    const cutoff = Date.now() - 30000;
    const operations = this.pendingSheetOperations.get(key)!;
    const filtered = operations.filter((op) => op.timestamp > cutoff);
    if (filtered.length === 0) {
      this.pendingSheetOperations.delete(key);
    } else {
      this.pendingSheetOperations.set(key, filtered);
    }
  }

  /**
   * Check for conflicting sheet operations
   * @param sheetId - Sheet ID to check
   * @param operation - New operation type
   * @param clientId - Client performing the operation
   * @returns Array of conflicting operations
   */
  checkSheetOperationConflicts(
    sheetId: string,
    operation: SheetOperation,
    clientId: number
  ): PendingSheetOperation[] {
    const pending = this.pendingSheetOperations.get(sheetId) ?? [];
    return pending.filter(
      (op) => op.clientId !== clientId && this.operationsConflict(op.type, operation)
    );
  }

  /**
   * Get conflict history
   * @param limit - Maximum number of conflicts to return
   * @returns Recent conflicts
   */
  getConflictHistory(limit?: number): Conflict[] {
    const count = limit ?? this.conflictHistory.length;
    return this.conflictHistory.slice(-count);
  }

  /**
   * Clear conflict history
   */
  clearConflictHistory(): void {
    this.conflictHistory = [];
  }

  /**
   * Set the default resolution strategy
   * @param strategy - New default strategy
   */
  setDefaultStrategy(strategy: ResolutionStrategy): void {
    this.defaultStrategy = strategy;
  }

  /**
   * Notify all callbacks of a conflict
   */
  private notifyConflict(conflict: Conflict): void {
    // Add to history
    this.conflictHistory.push(conflict);
    if (this.conflictHistory.length > this.maxHistorySize) {
      this.conflictHistory.shift();
    }

    // Notify callbacks
    for (const callback of this.conflictCallbacks) {
      try {
        callback(conflict);
      } catch (error) {
        console.error('Error in conflict callback:', error);
      }
    }
  }

  /**
   * Check if two cell ranges overlap
   */
  private rangesOverlap(a: CellRange, b: CellRange): boolean {
    return !(
      a.end.col < b.start.col ||
      a.start.col > b.end.col ||
      a.end.row < b.start.row ||
      a.start.row > b.end.row
    );
  }

  /**
   * Check if two sheet operations conflict
   */
  private operationsConflict(op1: SheetOperation, op2: SheetOperation): boolean {
    // Most operations on the same sheet can conflict
    const conflictMatrix: Record<SheetOperation, SheetOperation[]> = {
      add: [], // Adding doesn't conflict with other operations
      remove: ['remove', 'rename', 'move'], // Can't remove while others are modifying
      rename: ['remove', 'rename'], // Can't rename while removing or renaming
      move: ['remove', 'move'], // Can't move while removing or moving
    };

    return conflictMatrix[op1]?.includes(op2) ?? false;
  }

  /**
   * Escape special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.conflictCallbacks.clear();
    this.pendingSheetOperations.clear();
    this.conflictHistory = [];
    this.resolutionRequestCallback = null;
  }
}
