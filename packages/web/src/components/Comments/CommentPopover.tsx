import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommentThread } from './CommentThread';
import { CommentInput } from './CommentInput';
import type { Comment, CommentCellAddress, MentionUser } from '../../hooks/useComments';
import { formatCellAddress } from '../../hooks/useComments';

interface CommentPopoverProps {
  /** Cell address this popover is for */
  cellAddress: CommentCellAddress;
  /** Comments for this cell */
  comments: Comment[];
  /** ID of the current user */
  currentUserId?: string;
  /** Users for @mention autocomplete */
  onSearchUsers: (query: string) => MentionUser[];
  /** Anchor element rect for positioning */
  anchorRect?: DOMRect;
  /** Callback to add a new comment */
  onAddComment: (text: string) => void;
  /** Callback to add a reply to a comment */
  onAddReply: (commentId: string, text: string) => void;
  /** Callback to edit a comment */
  onEditComment?: (commentId: string, text: string) => void;
  /** Callback to delete a comment */
  onDeleteComment: (commentId: string) => void;
  /** Callback to delete a reply */
  onDeleteReply: (commentId: string, replyId: string) => void;
  /** Callback to resolve/unresolve a comment */
  onToggleResolve: (commentId: string, resolved: boolean) => void;
  /** Callback when popover should close */
  onClose: () => void;
}

/**
 * Popover component that shows comments for a cell.
 * - Positioned near the cell
 * - Shows full comment thread(s)
 * - Add reply input at bottom
 * - Resolve/Unresolve button
 * - Edit/Delete options
 * - Click outside to close
 */
export const CommentPopover = memo(function CommentPopover({
  cellAddress,
  comments,
  currentUserId,
  onSearchUsers,
  anchorRect,
  onAddComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onDeleteReply,
  onToggleResolve,
  onClose,
}: CommentPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasComments = comments.length > 0;
  const firstComment = comments[0];
  const isResolved = firstComment?.resolved ?? false;

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  /**
   * Calculate popover position
   */
  const popoverStyle = useMemo(() => {
    if (!anchorRect) {
      return { position: 'fixed' as const, top: '100px', left: '100px' };
    }

    const popoverWidth = 320;
    const popoverMaxHeight = 480;
    const offset = 8;

    // Default: position to the right of the cell
    let left = anchorRect.right + offset;
    let top = anchorRect.top;

    // If would go off right edge, position to the left
    if (left + popoverWidth > window.innerWidth - 20) {
      left = anchorRect.left - popoverWidth - offset;
    }

    // If would still go off left, just align with left edge
    if (left < 20) {
      left = 20;
    }

    // Adjust vertical position if needed
    if (top + popoverMaxHeight > window.innerHeight - 20) {
      top = Math.max(20, window.innerHeight - popoverMaxHeight - 20);
    }

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
    };
  }, [anchorRect]);

  /**
   * Handle resolve/unresolve toggle
   */
  const handleToggleResolve = useCallback(() => {
    if (firstComment) {
      onToggleResolve(firstComment.id, !isResolved);
    }
  }, [firstComment, isResolved, onToggleResolve]);

  /**
   * Handle starting a reply
   */
  const handleStartReply = useCallback((commentId: string) => {
    setReplyingToId(commentId);
    setEditingId(null);
  }, []);

  /**
   * Handle submitting a reply
   */
  const handleSubmitReply = useCallback(
    (text: string) => {
      if (replyingToId) {
        onAddReply(replyingToId, text);
        setReplyingToId(null);
      }
    },
    [replyingToId, onAddReply]
  );

  /**
   * Handle canceling a reply
   */
  const handleCancelReply = useCallback(() => {
    setReplyingToId(null);
  }, []);

  /**
   * Handle starting an edit
   */
  const handleStartEdit = useCallback((commentId: string) => {
    setEditingId(commentId);
    setReplyingToId(null);
  }, []);

  /**
   * Handle submitting new comment (when no comments exist)
   */
  const handleAddComment = useCallback(
    (text: string) => {
      onAddComment(text);
    },
    [onAddComment]
  );

  /**
   * Handle delete comment
   */
  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (window.confirm('Are you sure you want to delete this comment?')) {
        onDeleteComment(commentId);
      }
    },
    [onDeleteComment]
  );

  /**
   * Handle delete reply
   */
  const handleDeleteReply = useCallback(
    (commentId: string, replyId: string) => {
      if (window.confirm('Are you sure you want to delete this reply?')) {
        onDeleteReply(commentId, replyId);
      }
    },
    [onDeleteReply]
  );

  return (
    <div
      ref={popoverRef}
      className="comment-popover"
      style={popoverStyle}
      role="dialog"
      aria-label={`Comments for cell ${formatCellAddress(cellAddress)}`}
      aria-modal="true"
    >
      {/* Header */}
      <div className="comment-popover-header">
        <div className="comment-popover-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25v-7.5zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.75.75 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25H2.75z" />
          </svg>
          <span>Comments</span>
          <span className="comment-popover-cell">
            {formatCellAddress(cellAddress)}
          </span>
        </div>

        <div className="comment-popover-actions">
          {/* Resolve/Unresolve button */}
          {hasComments && (
            <button
              className={`comment-popover-action-btn ${isResolved ? '' : 'resolve'}`}
              onClick={handleToggleResolve}
              title={isResolved ? 'Re-open comment' : 'Resolve comment'}
              aria-label={isResolved ? 'Re-open comment' : 'Resolve comment'}
            >
              {isResolved ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.22 14.78a.75.75 0 0 0 1.06-1.06L4.56 12h8.69a.75.75 0 0 0 0-1.5H4.56l1.72-1.72a.75.75 0 0 0-1.06-1.06l-3 3a.75.75 0 0 0 0 1.06l3 3zM10.78 1.22a.75.75 0 0 0-1.06 1.06L11.44 4H2.75a.75.75 0 0 0 0 1.5h8.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3a.75.75 0 0 0 0-1.06l-3-3z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                </svg>
              )}
            </button>
          )}

          {/* Close button */}
          <button
            className="comment-popover-action-btn close"
            onClick={onClose}
            title="Close"
            aria-label="Close comments"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - Comment threads */}
      <div className="comment-popover-content">
        {hasComments ? (
          comments.map((comment) => (
            <div key={comment.id}>
              <CommentThread
                comment={comment}
                currentUserId={currentUserId}
                onEdit={handleStartEdit}
                onDelete={handleDeleteComment}
                onDeleteReply={handleDeleteReply}
              />

              {/* Reply button */}
              {!replyingToId && (
                <button
                  className="comment-replies-toggle"
                  onClick={() => handleStartReply(comment.id)}
                  style={{ marginLeft: '16px', marginBottom: '8px' }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M6.78 1.97a.75.75 0 0 1 0 1.06L3.81 6h6.44A4.75 4.75 0 0 1 15 10.75v2.5a.75.75 0 0 1-1.5 0v-2.5a3.25 3.25 0 0 0-3.25-3.25H3.81l2.97 2.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L1.47 7.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0z" />
                  </svg>
                  Reply
                </button>
              )}

              {/* Reply input */}
              {replyingToId === comment.id && (
                <div style={{ margin: '0 16px 16px 48px' }}>
                  <CommentInput
                    placeholder="Write a reply..."
                    onSearchUsers={onSearchUsers}
                    onSubmit={handleSubmitReply}
                    onCancel={handleCancelReply}
                    submitLabel="Reply"
                    isReply={true}
                    autoFocus={true}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No comments yet
          </div>
        )}
      </div>

      {/* Footer - Add comment input (when no comments or adding new) */}
      {!hasComments && (
        <div className="comment-popover-footer">
          <CommentInput
            placeholder="Add a comment..."
            onSearchUsers={onSearchUsers}
            onSubmit={handleAddComment}
            onCancel={onClose}
            autoFocus={true}
          />
        </div>
      )}
    </div>
  );
});

export default CommentPopover;
