import { memo, useMemo } from 'react';
import type { UserInfo } from '@excel/core';

/**
 * Props for UserSelection component
 */
export interface UserSelectionProps {
  /** User information */
  user: UserInfo;
  /** X position in pixels (top-left of selection) */
  x: number;
  /** Y position in pixels (top-left of selection) */
  y: number;
  /** Width of selection in pixels */
  width: number;
  /** Height of selection in pixels */
  height: number;
  /** Whether the user is inactive */
  isInactive?: boolean;
  /** Whether to show user label */
  showLabel?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * UserSelection component - Displays a remote user's selection range
 *
 * Features:
 * - Colored border around selected range
 * - Semi-transparent fill
 * - User's color from AwarenessState
 * - Handle multi-cell selections
 * - Layer below local selection
 * - Fade when inactive
 */
export const UserSelection = memo(function UserSelection({
  user,
  x,
  y,
  width,
  height,
  isInactive = false,
  showLabel = true,
  onClick,
}: UserSelectionProps) {
  // Compute styles based on user color
  const selectionStyle = useMemo(() => {
    return {
      transform: `translate(${x}px, ${y}px)`,
      width,
      height,
      borderColor: user.color,
      backgroundColor: `${user.color}15`, // 15% opacity fill
    };
  }, [x, y, width, height, user.color]);

  const labelStyle = useMemo(() => {
    // Calculate contrasting text color
    const hex = user.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF';

    return {
      backgroundColor: user.color,
      color: textColor,
    };
  }, [user.color]);

  return (
    <div
      className={`user-selection ${isInactive ? 'user-selection--inactive' : ''}`}
      style={selectionStyle}
      onClick={onClick}
      data-user-id={user.id}
    >
      {/* Selection border indicator */}
      <div className="user-selection__border" />

      {/* Corner resize handles (visual only) */}
      <div
        className="user-selection__corner user-selection__corner--tl"
        style={{ backgroundColor: user.color }}
      />
      <div
        className="user-selection__corner user-selection__corner--tr"
        style={{ backgroundColor: user.color }}
      />
      <div
        className="user-selection__corner user-selection__corner--bl"
        style={{ backgroundColor: user.color }}
      />
      <div
        className="user-selection__corner user-selection__corner--br"
        style={{ backgroundColor: user.color }}
      />

      {/* User name label (shown at bottom-left of selection) */}
      {showLabel && (
        <div className="user-selection__label" style={labelStyle}>
          {user.name}
        </div>
      )}
    </div>
  );
});

/**
 * Props for UserSelectionMultiple component
 */
export interface UserSelectionMultipleProps {
  /** User information */
  user: UserInfo;
  /** Array of selection rectangles */
  selections: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  /** Whether the user is inactive */
  isInactive?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

/**
 * UserSelectionMultiple component - Displays multiple disjoint selections from a user
 * (For future support of Ctrl+click multi-selection)
 */
export const UserSelectionMultiple = memo(function UserSelectionMultiple({
  user,
  selections,
  isInactive = false,
  onClick,
}: UserSelectionMultipleProps) {
  if (selections.length === 0) return null;

  return (
    <>
      {selections.map((selection, index) => (
        <UserSelection
          key={`${user.id}-selection-${index}`}
          user={user}
          x={selection.x}
          y={selection.y}
          width={selection.width}
          height={selection.height}
          isInactive={isInactive}
          showLabel={index === 0} // Only show label on first selection
          onClick={onClick}
        />
      ))}
    </>
  );
});
