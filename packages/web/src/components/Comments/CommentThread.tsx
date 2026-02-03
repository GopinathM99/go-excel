import { memo, useCallback, useMemo, useState } from 'react';
import type { Comment, CommentReply } from '../../hooks/useComments';
import { formatRelativeTime } from '../../hooks/useComments';

interface CommentThreadProps {
  /** The comment to display */
  comment: Comment;
  /** ID of the current user (to determine edit/delete permissions) */
  currentUserId?: string;
  /** Callback when edit is clicked */
  onEdit?: (commentId: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (commentId: string) => void;
  /** Callback when reply delete is clicked */
  onDeleteReply?: (commentId: string, replyId: string) => void;
  /** Maximum replies to show before collapsing */
  maxVisibleReplies?: number;
  /** Whether to show action buttons */
  showActions?: boolean;
}

/**
 * Displays a comment thread with author, timestamp, text, and replies.
 * - Shows author avatar, name, and relative timestamp
 * - Displays comment text with @mentions highlighted
 * - Shows "Resolved" badge if applicable
 * - Replies are indented below the main comment
 * - Collapsible if too many replies
 */
export const CommentThread = memo(function CommentThread({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onDeleteReply,
  maxVisibleReplies = 3,
  showActions = true,
}: CommentThreadProps) {
  const [showAllReplies, setShowAllReplies] = useState(false);

  const canEdit = currentUserId && comment.author.id === currentUserId;
  const hasReplies = comment.replies.length > 0;
  const hasHiddenReplies = comment.replies.length > maxVisibleReplies;

  // Visible replies
  const visibleReplies = useMemo(() => {
    if (showAllReplies || !hasHiddenReplies) {
      return comment.replies;
    }
    return comment.replies.slice(0, maxVisibleReplies);
  }, [comment.replies, showAllReplies, hasHiddenReplies, maxVisibleReplies]);

  const hiddenCount = comment.replies.length - maxVisibleReplies;

  /**
   * Toggle showing all replies
   */
  const handleToggleReplies = useCallback(() => {
    setShowAllReplies((prev) => !prev);
  }, []);

  /**
   * Handle edit click
   */
  const handleEdit = useCallback(() => {
    onEdit?.(comment.id);
  }, [comment.id, onEdit]);

  /**
   * Handle delete click
   */
  const handleDelete = useCallback(() => {
    onDelete?.(comment.id);
  }, [comment.id, onDelete]);

  return (
    <div className="comment-thread">
      {/* Resolved badge */}
      {comment.resolved && (
        <div className="comment-thread-resolved-badge">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
          </svg>
          Resolved
        </div>
      )}

      {/* Main comment */}
      <CommentItem
        author={comment.author}
        text={comment.text}
        timestamp={comment.createdAt}
        isEdited={comment.updatedAt > comment.createdAt}
        mentions={comment.mentions}
        canEdit={canEdit}
        canDelete={canEdit}
        showActions={showActions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Replies toggle */}
      {hasHiddenReplies && (
        <button
          className={`comment-replies-toggle ${showAllReplies ? 'expanded' : ''}`}
          onClick={handleToggleReplies}
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor">
            <path d="M3 5l3 3 3-3" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {showAllReplies
            ? 'Hide replies'
            : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
        </button>
      )}

      {/* Replies */}
      {visibleReplies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          commentId={comment.id}
          currentUserId={currentUserId}
          showActions={showActions}
          onDelete={onDeleteReply}
        />
      ))}
    </div>
  );
});

/**
 * Individual comment item (author, text, actions)
 */
interface CommentItemProps {
  author: { id: string; name: string; avatar?: string };
  text: string;
  timestamp: number;
  isEdited?: boolean;
  mentions?: string[];
  canEdit?: boolean;
  canDelete?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CommentItem = memo(function CommentItem({
  author,
  text,
  timestamp,
  isEdited = false,
  mentions = [],
  canEdit = false,
  canDelete = false,
  showActions = true,
  onEdit,
  onDelete,
}: CommentItemProps) {
  return (
    <div className="comment-item">
      <div className="comment-item-header">
        {/* Avatar */}
        <div
          className="comment-avatar"
          style={{
            backgroundColor: author.avatar ? 'transparent' : undefined,
          }}
        >
          {author.avatar ? (
            <img src={author.avatar} alt={author.name} />
          ) : (
            getInitials(author.name)
          )}
        </div>

        {/* Meta */}
        <div className="comment-meta">
          <div className="comment-author">{author.name}</div>
          <div className="comment-time">
            {formatRelativeTime(timestamp)}
            {isEdited && ' (edited)'}
          </div>
        </div>

        {/* Actions */}
        {showActions && (canEdit || canDelete) && (
          <div className="comment-item-actions">
            {canEdit && (
              <button
                className="comment-action-btn"
                onClick={onEdit}
                title="Edit comment"
                aria-label="Edit comment"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm.176 4.823L9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                className="comment-action-btn delete"
                onClick={onDelete}
                title="Delete comment"
                aria-label="Delete comment"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.75 1.75 0 0 1 10.595 15H5.405a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15zM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="comment-text">
        <HighlightedText text={text} mentions={mentions} />
      </div>
    </div>
  );
});

/**
 * Reply item (smaller avatar, indented)
 */
interface ReplyItemProps {
  reply: CommentReply;
  commentId: string;
  currentUserId?: string;
  showActions?: boolean;
  onDelete?: (commentId: string, replyId: string) => void;
}

const ReplyItem = memo(function ReplyItem({
  reply,
  commentId,
  currentUserId,
  showActions = true,
  onDelete,
}: ReplyItemProps) {
  const canDelete = currentUserId && reply.author.id === currentUserId;

  const handleDelete = useCallback(() => {
    onDelete?.(commentId, reply.id);
  }, [commentId, reply.id, onDelete]);

  return (
    <div className="comment-item reply">
      <div className="comment-item-header">
        {/* Avatar */}
        <div
          className="comment-avatar small"
          style={{
            backgroundColor: reply.author.avatar ? 'transparent' : undefined,
          }}
        >
          {reply.author.avatar ? (
            <img src={reply.author.avatar} alt={reply.author.name} />
          ) : (
            getInitials(reply.author.name)
          )}
        </div>

        {/* Meta */}
        <div className="comment-meta">
          <div className="comment-author">{reply.author.name}</div>
          <div className="comment-time">
            {formatRelativeTime(reply.createdAt)}
          </div>
        </div>

        {/* Actions */}
        {showActions && canDelete && (
          <div className="comment-item-actions">
            <button
              className="comment-action-btn delete"
              onClick={handleDelete}
              title="Delete reply"
              aria-label="Delete reply"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.75 1.75 0 0 1 10.595 15H5.405a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15zM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="comment-text">
        <HighlightedText text={reply.text} mentions={reply.mentions} />
      </div>
    </div>
  );
});

/**
 * Highlight @mentions in text
 */
interface HighlightedTextProps {
  text: string;
  mentions: string[];
}

const HighlightedText = memo(function HighlightedText({
  text,
}: HighlightedTextProps) {
  // Parse and highlight @mentions
  const parts = useMemo(() => {
    const mentionRegex = /(@(?:"[^"]+"|[a-zA-Z0-9_-]+))/g;
    const segments: { type: 'text' | 'mention'; content: string }[] = [];

    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
        });
      }
      // Add mention
      segments.push({
        type: 'mention',
        content: match[1],
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    return segments;
  }, [text]);

  return (
    <>
      {parts.map((part, index) =>
        part.type === 'mention' ? (
          <span key={index} className="comment-mention">
            {part.content}
          </span>
        ) : (
          <span key={index}>{part.content}</span>
        )
      )}
    </>
  );
});

/**
 * Get initials from a name (max 2 characters)
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default CommentThread;
