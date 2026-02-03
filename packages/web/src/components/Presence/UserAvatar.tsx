import { memo, useMemo, useState, useCallback } from 'react';
import type { UserInfo } from '@excel/core';
import { getInitials, getContrastColor } from '../../hooks/usePresence';

/**
 * Avatar size options
 */
export type AvatarSize = 'small' | 'medium' | 'large';

/**
 * Props for UserAvatar component
 */
export interface UserAvatarProps {
  /** User information */
  user: UserInfo;
  /** Avatar size */
  size?: AvatarSize;
  /** Whether user is currently editing */
  isEditing?: boolean;
  /** Whether user is inactive */
  isInactive?: boolean;
  /** Whether to show online status dot */
  showStatus?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * Size values in pixels
 */
const SIZE_MAP: Record<AvatarSize, number> = {
  small: 24,
  medium: 32,
  large: 40,
};

/**
 * UserAvatar component - Displays a user's avatar with color and initials
 *
 * Features:
 * - Circular avatar with user color
 * - Initials if no image
 * - Tooltip with full name
 * - Small indicator for "currently editing"
 * - Online/offline status dot
 */
export const UserAvatar = memo(function UserAvatar({
  user,
  size = 'medium',
  isEditing = false,
  isInactive = false,
  showStatus = true,
  showTooltip = true,
  onClick,
  className = '',
}: UserAvatarProps) {
  const [showTooltipState, setShowTooltipState] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Compute avatar styles
  const avatarStyle = useMemo(() => {
    const sizeValue = SIZE_MAP[size];
    return {
      width: sizeValue,
      height: sizeValue,
      backgroundColor: user.avatarUrl && !imageError ? 'transparent' : user.color,
      color: getContrastColor(user.color),
      fontSize: sizeValue * 0.4,
    };
  }, [user.color, user.avatarUrl, size, imageError]);

  // Get initials
  const initials = useMemo(() => getInitials(user.name), [user.name]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Handle tooltip visibility
  const handleMouseEnter = useCallback(() => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltipState(false);
  }, []);

  return (
    <div
      className={`user-avatar user-avatar--${size} ${isInactive ? 'user-avatar--inactive' : ''} ${isEditing ? 'user-avatar--editing' : ''} ${className}`}
      style={avatarStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-user-id={user.id}
    >
      {/* Avatar image or initials */}
      {user.avatarUrl && !imageError ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="user-avatar__image"
          onError={handleImageError}
        />
      ) : (
        <span className="user-avatar__initials">{initials}</span>
      )}

      {/* Status indicator */}
      {showStatus && (
        <div
          className={`user-avatar__status ${isInactive ? 'user-avatar__status--offline' : 'user-avatar__status--online'}`}
        />
      )}

      {/* Editing indicator (animated ring) */}
      {isEditing && (
        <div
          className="user-avatar__editing-indicator"
          style={{ borderColor: user.color }}
        />
      )}

      {/* Tooltip */}
      {showTooltipState && (
        <div className="user-avatar__tooltip">
          <span className="user-avatar__tooltip-name">{user.name}</span>
          {isEditing && (
            <span className="user-avatar__tooltip-status">Editing</span>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Props for UserAvatarStack component
 */
export interface UserAvatarStackProps {
  /** List of users */
  users: Array<{
    user: UserInfo;
    isEditing?: boolean;
    isInactive?: boolean;
  }>;
  /** Maximum number of avatars to show before "+N" */
  maxVisible?: number;
  /** Avatar size */
  size?: AvatarSize;
  /** Optional click handler for individual avatars */
  onUserClick?: (userId: string) => void;
  /** Optional click handler for overflow indicator */
  onOverflowClick?: () => void;
}

/**
 * UserAvatarStack component - Displays multiple user avatars stacked horizontally
 */
export const UserAvatarStack = memo(function UserAvatarStack({
  users,
  maxVisible = 4,
  size = 'medium',
  onUserClick,
  onOverflowClick,
}: UserAvatarStackProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = Math.max(0, users.length - maxVisible);

  const sizeValue = SIZE_MAP[size];
  const overflowStyle = useMemo(
    () => ({
      width: sizeValue,
      height: sizeValue,
      fontSize: sizeValue * 0.35,
    }),
    [sizeValue]
  );

  return (
    <div className="user-avatar-stack">
      {visibleUsers.map((item, index) => (
        <div
          key={item.user.id}
          className="user-avatar-stack__item"
          style={{ zIndex: visibleUsers.length - index }}
        >
          <UserAvatar
            user={item.user}
            size={size}
            isEditing={item.isEditing}
            isInactive={item.isInactive}
            showStatus={false}
            showTooltip
            onClick={onUserClick ? () => onUserClick(item.user.id) : undefined}
          />
        </div>
      ))}

      {overflowCount > 0 && (
        <div
          className="user-avatar-stack__overflow"
          style={overflowStyle}
          onClick={onOverflowClick}
          role={onOverflowClick ? 'button' : undefined}
          tabIndex={onOverflowClick ? 0 : undefined}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
});
