import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { UserCursor, UserCursorTyping } from './UserCursor';
import { UserSelection } from './UserSelection';
import { UserList } from './UserList';
import { usePresence, usePresenceStore } from '../../hooks/usePresence';
import type { RemoteUser, PixelPosition } from '../../hooks/usePresence';
import type { UserInfo } from '@excel/core';

/**
 * Props for PresenceOverlay component
 */
export interface PresenceOverlayProps {
  /** Current sheet ID */
  currentSheet: string;
  /** Function to convert cell position to pixel position */
  cellToPixel: (row: number, col: number) => PixelPosition;
  /** Function to scroll to a cell */
  scrollToCell?: (row: number, col: number) => void;
  /** Container width for bounds checking */
  containerWidth?: number;
  /** Container height for bounds checking */
  containerHeight?: number;
  /** Scroll position for viewport clipping */
  scrollTop?: number;
  /** Scroll position for viewport clipping */
  scrollLeft?: number;
  /** Whether to show the user list */
  showUserList?: boolean;
  /** User list position */
  userListPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Whether to show inactive users */
  showInactiveUsers?: boolean;
  /** Z-index for the overlay */
  zIndex?: number;
  /** Additional class name */
  className?: string;
}

/**
 * PresenceOverlay component - Container that renders all remote cursors and selections
 *
 * Features:
 * - Renders all remote user cursors and selections
 * - Positioned over the grid
 * - Handles coordinate translation (cell -> pixel)
 * - Efficient updates (only re-render changed users)
 * - Z-index management (cursors above grid, below dialogs)
 * - Viewport clipping for performance
 */
export const PresenceOverlay = memo(function PresenceOverlay({
  currentSheet,
  cellToPixel,
  scrollToCell,
  containerWidth = 0,
  containerHeight = 0,
  scrollTop = 0,
  scrollLeft = 0,
  showUserList = true,
  userListPosition = 'top-right',
  showInactiveUsers = false,
  zIndex = 100,
  className = '',
}: PresenceOverlayProps) {
  const { remoteUsers, allRemoteUsers, jumpToUser, localUser } = usePresence({
    currentSheet,
    cellToPixel,
    includeInactive: showInactiveUsers,
  });

  // Handle jumping to a user's location
  const handleJumpToUser = useCallback(
    (clientId: number) => {
      const position = jumpToUser(clientId);
      if (position && scrollToCell) {
        scrollToCell(position.row, position.col);
      }
    },
    [jumpToUser, scrollToCell]
  );

  // Filter users that are visible in the viewport
  const visibleUsers = useMemo(() => {
    if (!containerWidth || !containerHeight) {
      return remoteUsers;
    }

    return remoteUsers.filter((user) => {
      // Check if cursor is in viewport
      if (user.cursor && user.cursor.sheet === currentSheet) {
        const pos = cellToPixel(user.cursor.row, user.cursor.col);
        if (
          pos.x + pos.width >= scrollLeft &&
          pos.x <= scrollLeft + containerWidth &&
          pos.y + pos.height >= scrollTop &&
          pos.y <= scrollTop + containerHeight
        ) {
          return true;
        }
      }

      // Check if selection is in viewport
      if (user.selection && user.selection.sheet === currentSheet) {
        const range = user.selection.range;
        const startPos = cellToPixel(range.start.row, range.start.col);
        const endPos = cellToPixel(range.end.row, range.end.col);

        const minX = Math.min(startPos.x, endPos.x);
        const maxX = Math.max(startPos.x + startPos.width, endPos.x + endPos.width);
        const minY = Math.min(startPos.y, endPos.y);
        const maxY = Math.max(startPos.y + startPos.height, endPos.y + endPos.height);

        if (
          maxX >= scrollLeft &&
          minX <= scrollLeft + containerWidth &&
          maxY >= scrollTop &&
          minY <= scrollTop + containerHeight
        ) {
          return true;
        }
      }

      return false;
    });
  }, [
    remoteUsers,
    currentSheet,
    cellToPixel,
    containerWidth,
    containerHeight,
    scrollLeft,
    scrollTop,
  ]);

  return (
    <div
      className={`presence-overlay ${className}`}
      style={{ zIndex }}
      data-sheet={currentSheet}
    >
      {/* Selections layer (below cursors) */}
      <div className="presence-overlay__selections">
        {visibleUsers.map((user) => {
          if (!user.selection || user.selection.sheet !== currentSheet) {
            return null;
          }

          const range = user.selection.range;
          const startPos = cellToPixel(range.start.row, range.start.col);
          const endPos = cellToPixel(range.end.row, range.end.col);

          const x = Math.min(startPos.x, endPos.x);
          const y = Math.min(startPos.y, endPos.y);
          const width =
            Math.max(startPos.x + startPos.width, endPos.x + endPos.width) - x;
          const height =
            Math.max(startPos.y + startPos.height, endPos.y + endPos.height) - y;

          return (
            <UserSelection
              key={`selection-${user.clientId}`}
              user={user.user}
              x={x}
              y={y}
              width={width}
              height={height}
              isInactive={user.isInactive}
              onClick={() => handleJumpToUser(user.clientId)}
            />
          );
        })}
      </div>

      {/* Cursors layer (above selections) */}
      <div className="presence-overlay__cursors">
        {visibleUsers.map((user) => {
          if (!user.cursor || user.cursor.sheet !== currentSheet) {
            return null;
          }

          const pos = cellToPixel(user.cursor.row, user.cursor.col);

          // Show typing indicator if editing
          if (user.isEditing && user.editingCell) {
            const editPos = cellToPixel(
              user.editingCell.row,
              user.editingCell.col
            );
            return (
              <UserCursorTyping
                key={`cursor-${user.clientId}`}
                user={user.user}
                x={editPos.x}
                y={editPos.y}
                width={editPos.width}
                height={editPos.height}
              />
            );
          }

          return (
            <UserCursor
              key={`cursor-${user.clientId}`}
              user={user.user}
              x={pos.x}
              y={pos.y}
              width={pos.width}
              height={pos.height}
              isEditing={user.isEditing}
              isInactive={user.isInactive}
              cursorStyle={user.isEditing ? 'text' : 'arrow'}
              onClick={() => handleJumpToUser(user.clientId)}
            />
          );
        })}
      </div>

      {/* User list (positioned absolutely) */}
      {showUserList && (
        <div className="presence-overlay__user-list">
          <UserList
            users={allRemoteUsers}
            localUser={localUser}
            collapsible
            defaultExpanded={false}
            onJumpToUser={handleJumpToUser}
            position={userListPosition}
          />
        </div>
      )}
    </div>
  );
});

/**
 * Props for PresenceOverlaySimple component
 */
export interface PresenceOverlaySimpleProps {
  /** Remote users to display */
  users: RemoteUser[];
  /** Current sheet ID */
  currentSheet: string;
  /** Function to convert cell position to pixel position */
  cellToPixel: (row: number, col: number) => PixelPosition;
  /** Z-index for the overlay */
  zIndex?: number;
  /** Additional class name */
  className?: string;
}

/**
 * PresenceOverlaySimple component - Simpler version without user list
 * For embedding in existing grid components
 */
export const PresenceOverlaySimple = memo(function PresenceOverlaySimple({
  users,
  currentSheet,
  cellToPixel,
  zIndex = 100,
  className = '',
}: PresenceOverlaySimpleProps) {
  return (
    <div
      className={`presence-overlay presence-overlay--simple ${className}`}
      style={{ zIndex }}
    >
      {/* Selections */}
      {users.map((user) => {
        if (!user.selection || user.selection.sheet !== currentSheet) {
          return null;
        }

        const range = user.selection.range;
        const startPos = cellToPixel(range.start.row, range.start.col);
        const endPos = cellToPixel(range.end.row, range.end.col);

        const x = Math.min(startPos.x, endPos.x);
        const y = Math.min(startPos.y, endPos.y);
        const width =
          Math.max(startPos.x + startPos.width, endPos.x + endPos.width) - x;
        const height =
          Math.max(startPos.y + startPos.height, endPos.y + endPos.height) - y;

        return (
          <UserSelection
            key={`selection-${user.clientId}`}
            user={user.user}
            x={x}
            y={y}
            width={width}
            height={height}
            isInactive={user.isInactive}
            showLabel={false}
          />
        );
      })}

      {/* Cursors */}
      {users.map((user) => {
        if (!user.cursor || user.cursor.sheet !== currentSheet) {
          return null;
        }

        const pos = cellToPixel(user.cursor.row, user.cursor.col);

        return (
          <UserCursor
            key={`cursor-${user.clientId}`}
            user={user.user}
            x={pos.x}
            y={pos.y}
            width={pos.width}
            height={pos.height}
            isEditing={user.isEditing}
            isInactive={user.isInactive}
            cursorStyle={user.isEditing ? 'text' : 'arrow'}
          />
        );
      })}
    </div>
  );
});

/**
 * Props for withPresence HOC
 */
export interface WithPresenceProps {
  /** Current sheet ID */
  currentSheet: string;
  /** Whether collaboration is enabled */
  collaborationEnabled?: boolean;
}

/**
 * Higher-order component to add presence overlay to a grid component
 */
export function withPresence<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function PresenceWrapper(props: P & WithPresenceProps) {
    const { currentSheet, collaborationEnabled = true, ...rest } = props;

    if (!collaborationEnabled) {
      return <WrappedComponent {...(rest as P)} />;
    }

    // The wrapped component should provide cellToPixel through context or props
    // This is a simplified example - in practice, you'd use React context
    return (
      <div className="presence-wrapper">
        <WrappedComponent {...(rest as P)} />
        {/* Presence overlay would be added here with proper cellToPixel */}
      </div>
    );
  };
}
