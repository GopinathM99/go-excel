import { memo, useMemo } from 'react';
import type { UserInfo } from '@excel/core';
import { getContrastColor } from '../../hooks/usePresence';

/**
 * Props for UserCursor component
 */
export interface UserCursorProps {
  /** User information */
  user: UserInfo;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Cell width in pixels */
  width: number;
  /** Cell height in pixels */
  height: number;
  /** Whether the user is editing */
  isEditing?: boolean;
  /** Whether the user is inactive */
  isInactive?: boolean;
  /** Cursor style: 'arrow' or 'text' */
  cursorStyle?: 'arrow' | 'text';
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * UserCursor component - Displays a remote user's cursor position
 *
 * Features:
 * - Colored cursor indicator at cell position
 * - User name label near cursor
 * - Smooth animation when cursor moves
 * - Different colors per user
 * - Fade out when inactive
 * - Different cursor styles (arrow/text when editing)
 */
export const UserCursor = memo(function UserCursor({
  user,
  x,
  y,
  width,
  height,
  isEditing = false,
  isInactive = false,
  cursorStyle = 'arrow',
  onClick,
}: UserCursorProps) {
  // Compute label position (top-left of cursor)
  const labelStyle = useMemo(() => {
    return {
      backgroundColor: user.color,
      color: getContrastColor(user.color),
    };
  }, [user.color]);

  // Cursor indicator style
  const cursorIndicatorStyle = useMemo(() => {
    return {
      borderColor: user.color,
      backgroundColor: isEditing ? `${user.color}15` : 'transparent',
    };
  }, [user.color, isEditing]);

  return (
    <div
      className={`user-cursor ${isInactive ? 'user-cursor--inactive' : ''} ${isEditing ? 'user-cursor--editing' : ''}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width,
        height,
      }}
      onClick={onClick}
      data-user-id={user.id}
    >
      {/* Cursor indicator (border around cell) */}
      <div
        className="user-cursor__indicator"
        style={cursorIndicatorStyle}
      />

      {/* Cursor pointer icon */}
      <div
        className={`user-cursor__pointer user-cursor__pointer--${cursorStyle}`}
        style={{ color: user.color }}
      >
        {cursorStyle === 'arrow' ? (
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0L12 9L7 9L9 15L6 16L4 10L0 13V0Z" />
          </svg>
        ) : (
          <svg
            width="8"
            height="16"
            viewBox="0 0 8 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="0" width="2" height="16" />
            <rect x="0" y="0" width="8" height="2" />
            <rect x="0" y="14" width="8" height="2" />
          </svg>
        )}
      </div>

      {/* User name label */}
      <div className="user-cursor__label" style={labelStyle}>
        <span className="user-cursor__name">{user.name}</span>
        {isEditing && <span className="user-cursor__status">typing...</span>}
      </div>
    </div>
  );
});

/**
 * Props for UserCursorTyping component
 */
export interface UserCursorTypingProps {
  /** User information */
  user: UserInfo;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Cell width in pixels */
  width: number;
  /** Cell height in pixels */
  height: number;
}

/**
 * UserCursorTyping component - Shows a "typing" indicator in a cell
 */
export const UserCursorTyping = memo(function UserCursorTyping({
  user,
  x,
  y,
  width,
  height,
}: UserCursorTypingProps) {
  return (
    <div
      className="user-cursor-typing"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width,
        height,
        borderColor: user.color,
        backgroundColor: `${user.color}20`,
      }}
    >
      <div className="user-cursor-typing__indicator">
        <span style={{ backgroundColor: user.color }} />
        <span style={{ backgroundColor: user.color }} />
        <span style={{ backgroundColor: user.color }} />
      </div>
    </div>
  );
});
