import { memo, useState, useCallback, useMemo } from 'react';
import type { UserInfo } from '@excel/core';
import { UserAvatar, UserAvatarStack } from './UserAvatar';
import { columnIndexToLabel } from '@excel/core';
import type { RemoteUser } from '../../hooks/usePresence';

/**
 * Props for UserList component
 */
export interface UserListProps {
  /** List of remote users */
  users: RemoteUser[];
  /** Local user info */
  localUser?: UserInfo | null;
  /** Whether the list is expandable/collapsible */
  collapsible?: boolean;
  /** Initial expanded state */
  defaultExpanded?: boolean;
  /** Callback when clicking on a user to jump to their location */
  onJumpToUser?: (clientId: number) => void;
  /** Position of the list */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Additional class name */
  className?: string;
}

/**
 * Format cell address for display (e.g., "A1")
 */
function formatCellAddress(row: number, col: number): string {
  return `${columnIndexToLabel(col)}${row + 1}`;
}

/**
 * UserList component - Displays a list of all connected users
 *
 * Features:
 * - Show all connected users
 * - User avatar with initials or image
 * - User name
 * - "Editing cell X" indicator
 * - Online status dot
 * - Expandable/collapsible
 * - Position: top-right corner of grid
 */
export const UserList = memo(function UserList({
  users,
  localUser,
  collapsible = true,
  defaultExpanded = false,
  onJumpToUser,
  position = 'top-right',
  className = '',
}: UserListProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  }, [collapsible]);

  // Handle user click
  const handleUserClick = useCallback(
    (clientId: number) => {
      if (onJumpToUser) {
        onJumpToUser(clientId);
      }
    },
    [onJumpToUser]
  );

  // Sort users: editing users first, then by name
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      // Editing users first
      if (a.isEditing !== b.isEditing) {
        return a.isEditing ? -1 : 1;
      }
      // Then by activity
      if (a.isInactive !== b.isInactive) {
        return a.isInactive ? 1 : -1;
      }
      // Then alphabetically
      return a.user.name.localeCompare(b.user.name);
    });
  }, [users]);

  // Prepare data for avatar stack
  const avatarStackData = useMemo(() => {
    return sortedUsers.map((u) => ({
      user: u.user,
      isEditing: u.isEditing,
      isInactive: u.isInactive,
    }));
  }, [sortedUsers]);

  // Total user count including local user
  const totalCount = users.length + (localUser ? 1 : 0);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div
      className={`user-list user-list--${position} ${isExpanded ? 'user-list--expanded' : 'user-list--collapsed'} ${className}`}
    >
      {/* Collapsed view - Avatar stack */}
      {!isExpanded && (
        <div className="user-list__collapsed" onClick={toggleExpanded}>
          <UserAvatarStack
            users={avatarStackData}
            maxVisible={3}
            size="small"
          />
          <span className="user-list__count">{totalCount}</span>
        </div>
      )}

      {/* Expanded view - Full list */}
      {isExpanded && (
        <div className="user-list__expanded">
          {/* Header */}
          <div className="user-list__header">
            <span className="user-list__title">
              Collaborators ({totalCount})
            </span>
            {collapsible && (
              <button
                className="user-list__collapse-btn"
                onClick={toggleExpanded}
                aria-label="Collapse user list"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M4.5 6L8 9.5L11.5 6H4.5Z" />
                </svg>
              </button>
            )}
          </div>

          {/* User list */}
          <div className="user-list__items">
            {/* Local user (you) */}
            {localUser && (
              <div className="user-list__item user-list__item--local">
                <UserAvatar
                  user={localUser}
                  size="medium"
                  showStatus={false}
                  showTooltip={false}
                />
                <div className="user-list__item-info">
                  <span className="user-list__item-name">
                    {localUser.name}
                    <span className="user-list__item-you">(You)</span>
                  </span>
                </div>
              </div>
            )}

            {/* Remote users */}
            {sortedUsers.map((remoteUser) => (
              <UserListItem
                key={remoteUser.clientId}
                remoteUser={remoteUser}
                onClick={() => handleUserClick(remoteUser.clientId)}
                canJump={!!onJumpToUser && !!remoteUser.cursor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Props for UserListItem component
 */
interface UserListItemProps {
  remoteUser: RemoteUser;
  onClick: () => void;
  canJump: boolean;
}

/**
 * UserListItem component - Individual user in the list
 */
const UserListItem = memo(function UserListItem({
  remoteUser,
  onClick,
  canJump,
}: UserListItemProps) {
  const { user, cursor, isEditing, isInactive, editingCell } = remoteUser;

  // Format location text
  const locationText = useMemo(() => {
    if (isEditing && editingCell) {
      return `Editing ${formatCellAddress(editingCell.row, editingCell.col)}`;
    }
    if (cursor) {
      return `At ${formatCellAddress(cursor.row, cursor.col)}`;
    }
    return null;
  }, [cursor, isEditing, editingCell]);

  return (
    <div
      className={`user-list__item ${isInactive ? 'user-list__item--inactive' : ''} ${canJump ? 'user-list__item--clickable' : ''}`}
      onClick={canJump ? onClick : undefined}
      role={canJump ? 'button' : undefined}
      tabIndex={canJump ? 0 : undefined}
    >
      <UserAvatar
        user={user}
        size="medium"
        isEditing={isEditing}
        isInactive={isInactive}
        showStatus
        showTooltip={false}
      />
      <div className="user-list__item-info">
        <span className="user-list__item-name">{user.name}</span>
        {locationText && (
          <span
            className={`user-list__item-location ${isEditing ? 'user-list__item-location--editing' : ''}`}
          >
            {locationText}
          </span>
        )}
      </div>
      {canJump && (
        <button
          className="user-list__item-jump"
          aria-label={`Jump to ${user.name}'s location`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 2v2H4v8h8v-2h2v4H2V2h4zm8 0v5h-2V4.5L7.5 9 6 7.5 10.5 3H8V1h6v1z" />
          </svg>
        </button>
      )}
    </div>
  );
});

/**
 * Props for UserListCompact component
 */
export interface UserListCompactProps {
  /** List of remote users */
  users: RemoteUser[];
  /** Maximum avatars to show */
  maxVisible?: number;
  /** Callback when clicking to expand */
  onExpand?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * UserListCompact component - Compact version showing just avatars
 */
export const UserListCompact = memo(function UserListCompact({
  users,
  maxVisible = 4,
  onExpand,
  className = '',
}: UserListCompactProps) {
  const avatarData = useMemo(() => {
    return users.map((u) => ({
      user: u.user,
      isEditing: u.isEditing,
      isInactive: u.isInactive,
    }));
  }, [users]);

  return (
    <div className={`user-list-compact ${className}`}>
      <UserAvatarStack
        users={avatarData}
        maxVisible={maxVisible}
        size="small"
        onOverflowClick={onExpand}
      />
    </div>
  );
});
