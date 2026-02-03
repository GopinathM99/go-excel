import { memo, useCallback, useState } from 'react';
import type { CommentCellAddress } from '../../hooks/useComments';

interface CommentIndicatorProps {
  /** Cell address this indicator is for */
  cellAddress: CommentCellAddress;
  /** Whether the comment(s) on this cell are resolved */
  resolved?: boolean;
  /** First line of the comment text for preview */
  previewText?: string;
  /** Callback when indicator is clicked */
  onClick?: (cellAddress: CommentCellAddress) => void;
}

/**
 * Small triangle indicator shown in the top-right corner of cells with comments.
 * - Red/orange color for unresolved comments
 * - Green/gray color for resolved comments
 * - Shows preview tooltip on hover
 * - Clicking opens the comment popover
 */
export const CommentIndicator = memo(function CommentIndicator({
  cellAddress,
  resolved = false,
  previewText,
  onClick,
}: CommentIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClick?.(cellAddress);
    },
    [cellAddress, onClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(cellAddress);
      }
    },
    [cellAddress, onClick]
  );

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Truncate preview text to first line and limit length
  const truncatedPreview = previewText
    ? previewText.split('\n')[0].substring(0, 50) +
      (previewText.length > 50 ? '...' : '')
    : '';

  return (
    <div
      className={`comment-indicator ${resolved ? 'resolved' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`${resolved ? 'Resolved comment' : 'Comment'}${previewText ? `: ${truncatedPreview}` : ''}`}
      title={resolved ? 'Resolved comment - click to view' : 'Comment - click to view'}
    >
      {showTooltip && truncatedPreview && (
        <div className="comment-indicator-tooltip" role="tooltip">
          {truncatedPreview}
        </div>
      )}
    </div>
  );
});

export default CommentIndicator;
