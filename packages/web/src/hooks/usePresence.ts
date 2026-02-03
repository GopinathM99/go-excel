import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { create } from 'zustand';
import type {
  AwarenessState,
  UserState,
  UserInfo,
  CursorPosition,
  SelectionRange,
} from '@excel/core';
import type { CellRange } from '@excel/core';

/**
 * Remote user with client ID
 */
export interface RemoteUser {
  /** Yjs client ID */
  clientId: number;
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
  /** Whether user is considered inactive (no activity for a while) */
  isInactive: boolean;
}

/**
 * Position in pixels for rendering
 */
export interface PixelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Presence store state
 */
interface PresenceStoreState {
  /** AwarenessState instance */
  awareness: AwarenessState | null;
  /** Current sheet ID */
  currentSheet: string;
  /** Remote users */
  remoteUsers: Map<number, RemoteUser>;
  /** Local user info */
  localUser: UserInfo | null;

  /** Actions */
  setAwareness: (awareness: AwarenessState | null) => void;
  setCurrentSheet: (sheet: string) => void;
  updateRemoteUsers: (states: Map<number, UserState>) => void;
  setLocalUser: (user: UserInfo) => void;
}

/**
 * Inactivity threshold in milliseconds (30 seconds)
 */
const INACTIVITY_THRESHOLD = 30000;

/**
 * Presence store for managing collaboration state
 */
export const usePresenceStore = create<PresenceStoreState>((set) => ({
  awareness: null,
  currentSheet: 'Sheet1',
  remoteUsers: new Map(),
  localUser: null,

  setAwareness: (awareness) => set({ awareness }),

  setCurrentSheet: (currentSheet) => set({ currentSheet }),

  updateRemoteUsers: (states) => {
    const now = Date.now();
    const remoteUsers = new Map<number, RemoteUser>();

    states.forEach((state, clientId) => {
      remoteUsers.set(clientId, {
        clientId,
        user: state.user,
        cursor: state.cursor,
        selection: state.selection,
        isEditing: state.isEditing,
        editingCell: state.editingCell,
        lastActive: state.lastActive,
        isInactive: now - state.lastActive > INACTIVITY_THRESHOLD,
      });
    });

    set({ remoteUsers });
  },

  setLocalUser: (localUser) => set({ localUser }),
}));

/**
 * Hook options
 */
export interface UsePresenceOptions {
  /** Current sheet ID to filter users */
  currentSheet?: string;
  /** Cell position to pixel position converter */
  cellToPixel?: (row: number, col: number) => PixelPosition;
  /** Whether to include inactive users */
  includeInactive?: boolean;
}

/**
 * Hook return type
 */
export interface UsePresenceReturn {
  /** List of remote users on the current sheet */
  remoteUsers: RemoteUser[];
  /** All remote users regardless of sheet */
  allRemoteUsers: RemoteUser[];
  /** Get remote users with cursor positions in pixels */
  getRemoteCursors: () => Array<RemoteUser & { pixelPosition: PixelPosition }>;
  /** Get remote users with selection positions in pixels */
  getRemoteSelections: () => Array<RemoteUser & { pixelPosition: PixelPosition }>;
  /** Update local cursor position */
  setLocalCursor: (row: number, col: number) => void;
  /** Update local selection */
  setLocalSelection: (range: CellRange) => void;
  /** Update local cursor and selection at once */
  setLocalCursorAndSelection: (row: number, col: number, range: CellRange) => void;
  /** Set local editing state */
  setLocalEditing: (isEditing: boolean, cell?: CursorPosition) => void;
  /** Jump to a user's current location */
  jumpToUser: (clientId: number) => { row: number; col: number } | null;
  /** Get users currently editing */
  getEditingUsers: () => RemoteUser[];
  /** Get user editing a specific cell */
  getCellEditor: (row: number, col: number) => RemoteUser | null;
  /** Whether connected to collaboration */
  isConnected: boolean;
  /** Local user info */
  localUser: UserInfo | null;
}

/**
 * Hook for managing presence state in collaborative editing
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const {
    currentSheet: optionSheet,
    cellToPixel,
    includeInactive = false,
  } = options;

  const {
    awareness,
    currentSheet: storeSheet,
    remoteUsers: storeRemoteUsers,
    localUser,
    setCurrentSheet,
    updateRemoteUsers,
  } = usePresenceStore();

  const currentSheet = optionSheet ?? storeSheet;

  // Update current sheet when option changes
  useEffect(() => {
    if (optionSheet && optionSheet !== storeSheet) {
      setCurrentSheet(optionSheet);
    }
  }, [optionSheet, storeSheet, setCurrentSheet]);

  // Subscribe to awareness updates
  useEffect(() => {
    if (!awareness) return;

    const unsubscribe = awareness.onRemoteAwareness((states) => {
      updateRemoteUsers(states);
    });

    // Initial update
    updateRemoteUsers(awareness.getRemoteStates());

    return unsubscribe;
  }, [awareness, updateRemoteUsers]);

  // Update last active periodically
  useEffect(() => {
    if (!awareness) return;

    const interval = setInterval(() => {
      awareness.updateLastActive();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [awareness]);

  // Convert store map to array
  const allRemoteUsers = useMemo(() => {
    return Array.from(storeRemoteUsers.values());
  }, [storeRemoteUsers]);

  // Filter to current sheet and optionally exclude inactive
  const remoteUsers = useMemo(() => {
    return allRemoteUsers.filter((user) => {
      // Filter by sheet
      const onSheet =
        user.cursor?.sheet === currentSheet ||
        user.selection?.sheet === currentSheet;

      if (!onSheet) return false;

      // Filter by activity
      if (!includeInactive && user.isInactive) return false;

      return true;
    });
  }, [allRemoteUsers, currentSheet, includeInactive]);

  // Get remote cursors with pixel positions
  const getRemoteCursors = useCallback(() => {
    if (!cellToPixel) return [];

    return remoteUsers
      .filter((user) => user.cursor && user.cursor.sheet === currentSheet)
      .map((user) => ({
        ...user,
        pixelPosition: cellToPixel(user.cursor!.row, user.cursor!.col),
      }));
  }, [remoteUsers, currentSheet, cellToPixel]);

  // Get remote selections with pixel positions
  const getRemoteSelections = useCallback(() => {
    if (!cellToPixel) return [];

    return remoteUsers
      .filter((user) => user.selection && user.selection.sheet === currentSheet)
      .map((user) => {
        const range = user.selection!.range;
        const startPos = cellToPixel(range.start.row, range.start.col);
        const endPos = cellToPixel(range.end.row, range.end.col);

        const minX = Math.min(startPos.x, endPos.x);
        const minY = Math.min(startPos.y, endPos.y);
        const maxX = Math.max(startPos.x + startPos.width, endPos.x + endPos.width);
        const maxY = Math.max(startPos.y + startPos.height, endPos.y + endPos.height);

        return {
          ...user,
          pixelPosition: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          },
        };
      });
  }, [remoteUsers, currentSheet, cellToPixel]);

  // Update local cursor
  const setLocalCursor = useCallback(
    (row: number, col: number) => {
      awareness?.setLocalCursor(currentSheet, row, col);
    },
    [awareness, currentSheet]
  );

  // Update local selection
  const setLocalSelection = useCallback(
    (range: CellRange) => {
      awareness?.setLocalSelection(currentSheet, range);
    },
    [awareness, currentSheet]
  );

  // Update local cursor and selection
  const setLocalCursorAndSelection = useCallback(
    (row: number, col: number, range: CellRange) => {
      awareness?.setLocalCursorAndSelection(currentSheet, row, col, range);
    },
    [awareness, currentSheet]
  );

  // Set local editing state
  const setLocalEditing = useCallback(
    (isEditing: boolean, cell?: CursorPosition) => {
      awareness?.setLocalEditing(isEditing, cell);
    },
    [awareness]
  );

  // Jump to a user's location
  const jumpToUser = useCallback(
    (clientId: number): { row: number; col: number } | null => {
      const user = storeRemoteUsers.get(clientId);
      if (!user?.cursor) return null;

      return { row: user.cursor.row, col: user.cursor.col };
    },
    [storeRemoteUsers]
  );

  // Get editing users
  const getEditingUsers = useCallback(() => {
    return remoteUsers.filter((user) => user.isEditing);
  }, [remoteUsers]);

  // Get cell editor
  const getCellEditor = useCallback(
    (row: number, col: number): RemoteUser | null => {
      return (
        remoteUsers.find(
          (user) =>
            user.isEditing &&
            user.editingCell?.sheet === currentSheet &&
            user.editingCell?.row === row &&
            user.editingCell?.col === col
        ) ?? null
      );
    },
    [remoteUsers, currentSheet]
  );

  // Check if connected
  const isConnected = awareness !== null;

  return {
    remoteUsers,
    allRemoteUsers,
    getRemoteCursors,
    getRemoteSelections,
    setLocalCursor,
    setLocalSelection,
    setLocalCursorAndSelection,
    setLocalEditing,
    jumpToUser,
    getEditingUsers,
    getCellEditor,
    isConnected,
    localUser,
  };
}

/**
 * Hook to initialize presence with an AwarenessState instance
 */
export function usePresenceInit(
  awareness: AwarenessState | null,
  localUser: UserInfo | null
) {
  const { setAwareness, setLocalUser } = usePresenceStore();

  useEffect(() => {
    setAwareness(awareness);
    return () => setAwareness(null);
  }, [awareness, setAwareness]);

  useEffect(() => {
    if (localUser) {
      setLocalUser(localUser);
    }
  }, [localUser, setLocalUser]);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0]!.substring(0, 2).toUpperCase();
  }
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

/**
 * Get a contrasting text color for a background color
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
