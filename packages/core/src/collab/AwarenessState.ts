/**
 * AwarenessState - User presence and cursor tracking for real-time collaboration
 *
 * Manages the local user's awareness state (cursor position, selection, user info)
 * and provides callbacks for remote awareness updates from other collaborators.
 */

import type { Awareness } from 'y-protocols/awareness';
import type { CellRange } from '../models/CellRange';

/**
 * User information for awareness display
 */
export interface UserInfo {
  /** Unique user identifier */
  id: string;
  /** Display name */
  name: string;
  /** Cursor/selection color (hex) */
  color: string;
  /** Optional avatar URL */
  avatarUrl?: string;
}

/**
 * Cursor position in the spreadsheet
 */
export interface CursorPosition {
  /** Sheet name or ID */
  sheet: string;
  /** Row index (0-based) */
  row: number;
  /** Column index (0-based) */
  col: number;
}

/**
 * Selection range in the spreadsheet
 */
export interface SelectionRange {
  /** Sheet name or ID */
  sheet: string;
  /** Selection range */
  range: CellRange;
}

/**
 * Complete user awareness state
 */
export interface UserState {
  /** User information */
  user: UserInfo;
  /** Current cursor position */
  cursor?: CursorPosition;
  /** Current selection range */
  selection?: SelectionRange;
  /** Whether user is actively editing a cell */
  isEditing: boolean;
  /** Cell being edited (if isEditing is true) */
  editingCell?: CursorPosition;
  /** Timestamp of last activity */
  lastActive: number;
}

/**
 * Awareness update event data
 */
export interface AwarenessUpdate {
  /** Client IDs that were added */
  added: number[];
  /** Client IDs that were updated */
  updated: number[];
  /** Client IDs that were removed */
  removed: number[];
}

/**
 * Callback type for remote awareness updates
 */
export type RemoteAwarenessCallback = (states: Map<number, UserState>) => void;

/**
 * Default colors for user cursors
 */
const DEFAULT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky Blue
];

/**
 * AwarenessState class for managing user presence in collaborative sessions
 */
export class AwarenessState {
  private awareness: Awareness;
  private localUser: UserInfo;
  private callbacks: Set<RemoteAwarenessCallback>;
  private updateHandler: ((update: AwarenessUpdate) => void) | null = null;
  private isDestroyed = false;

  /**
   * Creates a new AwarenessState instance
   * @param awareness - Yjs Awareness instance
   * @param user - Local user information
   */
  constructor(awareness: Awareness, user: UserInfo) {
    this.awareness = awareness;
    this.localUser = user;
    this.callbacks = new Set();

    // Initialize local awareness state
    this.initializeLocalState();

    // Set up awareness update listener
    this.setupUpdateListener();
  }

  /**
   * Initialize the local user's awareness state
   */
  private initializeLocalState(): void {
    const initialState: UserState = {
      user: this.localUser,
      isEditing: false,
      lastActive: Date.now(),
    };

    this.awareness.setLocalState(initialState);
  }

  /**
   * Set up the awareness update listener
   */
  private setupUpdateListener(): void {
    this.updateHandler = (update: AwarenessUpdate) => {
      if (this.isDestroyed) return;

      // Get all states and notify callbacks
      const states = this.getRemoteStates();
      for (const callback of this.callbacks) {
        try {
          callback(states);
        } catch (error) {
          console.error('Error in awareness callback:', error);
        }
      }
    };

    this.awareness.on('update', this.updateHandler);
  }

  /**
   * Set the local user's cursor position
   * @param sheet - Sheet name or ID
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   */
  setLocalCursor(sheet: string, row: number, col: number): void {
    if (this.isDestroyed) return;

    const currentState = this.awareness.getLocalState() as UserState | null;
    const cursor: CursorPosition = { sheet, row, col };

    const newState: UserState = {
      ...(currentState ?? this.createDefaultState()),
      cursor,
      lastActive: Date.now(),
    };

    this.awareness.setLocalState(newState);
  }

  /**
   * Set the local user's selection range
   * @param sheet - Sheet name or ID
   * @param range - Selection range
   */
  setLocalSelection(sheet: string, range: CellRange): void {
    if (this.isDestroyed) return;

    const currentState = this.awareness.getLocalState() as UserState | null;
    const selection: SelectionRange = { sheet, range };

    const newState: UserState = {
      ...(currentState ?? this.createDefaultState()),
      selection,
      lastActive: Date.now(),
    };

    this.awareness.setLocalState(newState);
  }

  /**
   * Set both cursor and selection at once (more efficient)
   * @param sheet - Sheet name or ID
   * @param row - Cursor row index
   * @param col - Cursor column index
   * @param range - Selection range
   */
  setLocalCursorAndSelection(
    sheet: string,
    row: number,
    col: number,
    range: CellRange
  ): void {
    if (this.isDestroyed) return;

    const currentState = this.awareness.getLocalState() as UserState | null;

    const newState: UserState = {
      ...(currentState ?? this.createDefaultState()),
      cursor: { sheet, row, col },
      selection: { sheet, range },
      lastActive: Date.now(),
    };

    this.awareness.setLocalState(newState);
  }

  /**
   * Set the local user's editing state
   * @param isEditing - Whether the user is editing a cell
   * @param cell - The cell being edited (optional, required if isEditing is true)
   */
  setLocalEditing(isEditing: boolean, cell?: CursorPosition): void {
    if (this.isDestroyed) return;

    const currentState = this.awareness.getLocalState() as UserState | null;

    const newState: UserState = {
      ...(currentState ?? this.createDefaultState()),
      isEditing,
      editingCell: isEditing ? cell : undefined,
      lastActive: Date.now(),
    };

    this.awareness.setLocalState(newState);
  }

  /**
   * Update the last active timestamp (call periodically to show user is active)
   */
  updateLastActive(): void {
    if (this.isDestroyed) return;

    const currentState = this.awareness.getLocalState() as UserState | null;
    if (currentState) {
      this.awareness.setLocalState({
        ...currentState,
        lastActive: Date.now(),
      });
    }
  }

  /**
   * Clear the local user's cursor and selection (e.g., when switching documents)
   */
  clearLocalState(): void {
    if (this.isDestroyed) return;

    const newState: UserState = {
      user: this.localUser,
      isEditing: false,
      lastActive: Date.now(),
    };

    this.awareness.setLocalState(newState);
  }

  /**
   * Register a callback for remote awareness updates
   * @param callback - Function to call when remote awareness changes
   * @returns Unsubscribe function
   */
  onRemoteAwareness(callback: RemoteAwarenessCallback): () => void {
    this.callbacks.add(callback);

    // Immediately call with current state
    const states = this.getRemoteStates();
    if (states.size > 0) {
      callback(states);
    }

    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get all remote user states (excluding local user)
   * @returns Map of client ID to UserState
   */
  getRemoteStates(): Map<number, UserState> {
    const allStates = this.awareness.getStates();
    const localClientId = this.awareness.clientID;
    const remoteStates = new Map<number, UserState>();

    for (const [clientId, state] of allStates) {
      if (clientId !== localClientId && state && this.isValidUserState(state)) {
        remoteStates.set(clientId, state as UserState);
      }
    }

    return remoteStates;
  }

  /**
   * Get all user states (including local user)
   * @returns Map of client ID to UserState
   */
  getAllStates(): Map<number, UserState> {
    const allStates = this.awareness.getStates();
    const validStates = new Map<number, UserState>();

    for (const [clientId, state] of allStates) {
      if (state && this.isValidUserState(state)) {
        validStates.set(clientId, state as UserState);
      }
    }

    return validStates;
  }

  /**
   * Get the local user's state
   * @returns Local user state or null
   */
  getLocalState(): UserState | null {
    const state = this.awareness.getLocalState();
    if (state && this.isValidUserState(state)) {
      return state as UserState;
    }
    return null;
  }

  /**
   * Get the local client ID
   * @returns Yjs client ID
   */
  getLocalClientId(): number {
    return this.awareness.clientID;
  }

  /**
   * Get users currently viewing a specific sheet
   * @param sheet - Sheet name or ID
   * @returns Array of user states on that sheet
   */
  getUsersOnSheet(sheet: string): UserState[] {
    const states = this.getRemoteStates();
    const usersOnSheet: UserState[] = [];

    for (const state of states.values()) {
      if (state.cursor?.sheet === sheet || state.selection?.sheet === sheet) {
        usersOnSheet.push(state);
      }
    }

    return usersOnSheet;
  }

  /**
   * Get users currently editing (useful for showing "X is editing..." indicators)
   * @returns Array of user states that are actively editing
   */
  getEditingUsers(): UserState[] {
    const states = this.getRemoteStates();
    const editingUsers: UserState[] = [];

    for (const state of states.values()) {
      if (state.isEditing) {
        editingUsers.push(state);
      }
    }

    return editingUsers;
  }

  /**
   * Check if a cell is being edited by another user
   * @param sheet - Sheet name or ID
   * @param row - Row index
   * @param col - Column index
   * @returns The user editing the cell, or null
   */
  getCellEditor(sheet: string, row: number, col: number): UserState | null {
    const states = this.getRemoteStates();

    for (const state of states.values()) {
      if (
        state.isEditing &&
        state.editingCell?.sheet === sheet &&
        state.editingCell?.row === row &&
        state.editingCell?.col === col
      ) {
        return state;
      }
    }

    return null;
  }

  /**
   * Update local user info (e.g., after user changes their name)
   * @param user - Updated user info
   */
  updateLocalUser(user: Partial<UserInfo>): void {
    if (this.isDestroyed) return;

    this.localUser = { ...this.localUser, ...user };

    const currentState = this.awareness.getLocalState() as UserState | null;
    if (currentState) {
      this.awareness.setLocalState({
        ...currentState,
        user: this.localUser,
        lastActive: Date.now(),
      });
    }
  }

  /**
   * Create default state for a new user
   */
  private createDefaultState(): UserState {
    return {
      user: this.localUser,
      isEditing: false,
      lastActive: Date.now(),
    };
  }

  /**
   * Validate that an object is a valid UserState
   */
  private isValidUserState(state: unknown): state is UserState {
    if (typeof state !== 'object' || state === null) return false;

    const s = state as Record<string, unknown>;

    // Must have user object with id and name
    if (typeof s.user !== 'object' || s.user === null) return false;
    const user = s.user as Record<string, unknown>;
    if (typeof user.id !== 'string' || typeof user.name !== 'string') {
      return false;
    }

    // isEditing must be boolean
    if (typeof s.isEditing !== 'boolean') return false;

    // lastActive must be number
    if (typeof s.lastActive !== 'number') return false;

    return true;
  }

  /**
   * Clean up and destroy the awareness state
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Remove awareness listener
    if (this.updateHandler) {
      this.awareness.off('update', this.updateHandler);
      this.updateHandler = null;
    }

    // Clear local state
    this.awareness.setLocalState(null);

    // Clear callbacks
    this.callbacks.clear();
  }

  /**
   * Generate a random color for a user
   * @param userId - User ID to seed the color selection
   * @returns Hex color string
   */
  static generateUserColor(userId: string): string {
    // Use simple hash of userId to pick a consistent color
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % DEFAULT_COLORS.length;
    return DEFAULT_COLORS[index]!;
  }

  /**
   * Create user info from basic data
   * @param id - User ID
   * @param name - User name
   * @param color - Optional color (will be generated if not provided)
   * @returns UserInfo object
   */
  static createUserInfo(id: string, name: string, color?: string): UserInfo {
    return {
      id,
      name,
      color: color ?? AwarenessState.generateUserColor(id),
    };
  }
}
