/**
 * Presence UI Components for Real-Time Collaboration
 *
 * This module provides components for displaying user presence information
 * in a collaborative spreadsheet environment.
 *
 * Components:
 * - UserCursor: Remote user cursor indicator with smooth animations
 * - UserSelection: Remote user selection highlight
 * - UserList: List of active users with status
 * - UserAvatar: User avatar with color and initials
 * - PresenceOverlay: Container for cursors/selections over the grid
 *
 * Usage:
 * ```tsx
 * import { PresenceOverlay, usePresence, usePresenceInit } from './components/Presence';
 *
 * function SpreadsheetGrid() {
 *   // Initialize presence with awareness state
 *   usePresenceInit(awarenessState, localUser);
 *
 *   // Use presence hook for local cursor/selection updates
 *   const { setLocalCursor, setLocalSelection } = usePresence({
 *     currentSheet: 'Sheet1',
 *   });
 *
 *   // Cell to pixel converter
 *   const cellToPixel = useCallback((row, col) => ({
 *     x: columnPositions[col],
 *     y: rowPositions[row],
 *     width: getColumnWidth(col),
 *     height: getRowHeight(row),
 *   }), [columnPositions, rowPositions, getColumnWidth, getRowHeight]);
 *
 *   return (
 *     <div className="grid-container">
 *       <Grid />
 *       <PresenceOverlay
 *         currentSheet="Sheet1"
 *         cellToPixel={cellToPixel}
 *         scrollToCell={scrollToCell}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

// Import CSS
import './Presence.css';

// Export components
export { UserCursor, UserCursorTyping } from './UserCursor';
export type { UserCursorProps, UserCursorTypingProps } from './UserCursor';

export { UserSelection, UserSelectionMultiple } from './UserSelection';
export type { UserSelectionProps, UserSelectionMultipleProps } from './UserSelection';

export { UserAvatar, UserAvatarStack } from './UserAvatar';
export type { UserAvatarProps, UserAvatarStackProps, AvatarSize } from './UserAvatar';

export { UserList, UserListCompact } from './UserList';
export type { UserListProps, UserListCompactProps } from './UserList';

export {
  PresenceOverlay,
  PresenceOverlaySimple,
  withPresence,
} from './PresenceOverlay';
export type {
  PresenceOverlayProps,
  PresenceOverlaySimpleProps,
  WithPresenceProps,
} from './PresenceOverlay';

// Re-export hook and utilities from usePresence
export {
  usePresence,
  usePresenceInit,
  usePresenceStore,
  getInitials,
  getContrastColor,
} from '../../hooks/usePresence';
export type {
  RemoteUser,
  PixelPosition,
  UsePresenceOptions,
  UsePresenceReturn,
} from '../../hooks/usePresence';
