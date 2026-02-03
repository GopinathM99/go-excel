import { memo, useCallback, useMemo } from 'react';
import type { Comment, CommentCellAddress, CommentFilter, CommentSort } from '../../hooks/useComments';
import { formatRelativeTime, formatCellAddress } from '../../hooks/useComments';

interface CommentsSidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** All comments to display (pre-filtered and sorted) */
  comments: Comment[];
  /** Total comment count (before filtering) */
  totalCount: number;
  /** Current filter */
  filter: CommentFilter;
  /** Current sort */
  sort: CommentSort;
  /** Current search query */
  searchQuery: string;
  /** ID of current user (for "Mine" filter) */
  currentUserId?: string;
  /** Set of comment IDs with unread mentions */
  mentionNotifications?: Set<string>;
  /** Callback when filter changes */
  onFilterChange: (filter: CommentFilter) => void;
  /** Callback when sort changes */
  onSortChange: (sort: CommentSort) => void;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Callback when a comment is clicked */
  onCommentClick: (comment: Comment) => void;
  /** Callback to close the sidebar */
  onClose: () => void;
}

/**
 * Sidebar component showing all comments in the workbook.
 * - Filter by: All, Unresolved, Resolved, Mine
 * - Sort by: Date, Sheet, Cell
 * - Search comments
 * - Click to navigate to cell
 */
export const CommentsSidebar = memo(function CommentsSidebar({
  isOpen,
  comments,
  totalCount,
  filter,
  sort,
  searchQuery,
  currentUserId,
  mentionNotifications,
  onFilterChange,
  onSortChange,
  onSearchChange,
  onCommentClick,
  onClose,
}: CommentsSidebarProps) {
  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFilterChange(e.target.value as CommentFilter);
    },
    [onFilterChange]
  );

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSortChange(e.target.value as CommentSort);
    },
    [onSortChange]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <aside
      className={`comments-sidebar ${isOpen ? 'open' : ''}`}
      role="complementary"
      aria-label="Comments sidebar"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="comments-sidebar-header">
        <div className="comments-sidebar-title">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25v-7.5zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.75.75 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25H2.75z" />
          </svg>
          Comments
          {totalCount > 0 && (
            <span className="comments-sidebar-count">{totalCount}</span>
          )}
        </div>

        <button
          className="comments-sidebar-close"
          onClick={onClose}
          aria-label="Close comments sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="comments-sidebar-filters">
        {/* Search */}
        <div className="comments-sidebar-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215l-3.04-3.04zM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search comments"
          />
        </div>

        {/* Filter and Sort dropdowns */}
        <div className="comments-sidebar-filter-row">
          <div className="comments-sidebar-filter-group">
            <label className="comments-sidebar-filter-label">Show:</label>
            <select
              className="comments-sidebar-select"
              value={filter}
              onChange={handleFilterChange}
              aria-label="Filter comments"
            >
              <option value="all">All</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              {currentUserId && <option value="mine">Mine</option>}
            </select>
          </div>

          <div className="comments-sidebar-filter-group">
            <label className="comments-sidebar-filter-label">Sort:</label>
            <select
              className="comments-sidebar-select"
              value={sort}
              onChange={handleSortChange}
              aria-label="Sort comments"
            >
              <option value="date">Date</option>
              <option value="sheet">Sheet</option>
              <option value="cell">Cell</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="comments-sidebar-content">
        {comments.length === 0 ? (
          <EmptyState filter={filter} searchQuery={searchQuery} />
        ) : (
          comments.map((comment) => (
            <SidebarCommentItem
              key={comment.id}
              comment={comment}
              hasMention={mentionNotifications?.has(comment.id) ?? false}
              onClick={onCommentClick}
            />
          ))
        )}
      </div>
    </aside>
  );
});

/**
 * Empty state component
 */
interface EmptyStateProps {
  filter: CommentFilter;
  searchQuery: string;
}

const EmptyState = memo(function EmptyState({
  filter,
  searchQuery,
}: EmptyStateProps) {
  let title = 'No comments';
  let text = 'Comments you add will appear here.';

  if (searchQuery) {
    title = 'No matching comments';
    text = 'Try a different search term.';
  } else if (filter === 'unresolved') {
    title = 'No unresolved comments';
    text = 'All comments have been resolved.';
  } else if (filter === 'resolved') {
    title = 'No resolved comments';
    text = 'Resolved comments will appear here.';
  } else if (filter === 'mine') {
    title = 'No comments by you';
    text = 'Comments you create or reply to will appear here.';
  }

  return (
    <div className="comments-sidebar-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21a2 2 0 0 1-2-2H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-4a2 2 0 0 1-2 2zm-6-5h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1z" />
      </svg>
      <div className="comments-sidebar-empty-title">{title}</div>
      <div className="comments-sidebar-empty-text">{text}</div>
    </div>
  );
});

/**
 * Single comment item in sidebar
 */
interface SidebarCommentItemProps {
  comment: Comment;
  hasMention: boolean;
  onClick: (comment: Comment) => void;
}

const SidebarCommentItem = memo(function SidebarCommentItem({
  comment,
  hasMention,
  onClick,
}: SidebarCommentItemProps) {
  const handleClick = useCallback(() => {
    onClick(comment);
  }, [comment, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(comment);
      }
    },
    [comment, onClick]
  );

  const replyCount = comment.replies.length;

  return (
    <div
      className="comments-sidebar-item"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Comment by ${comment.author.name} on cell ${formatCellAddress(comment.cellAddress, true)}`}
    >
      <div className="comments-sidebar-item-header">
        {/* Avatar */}
        <div
          className="comment-avatar"
          style={{
            backgroundColor: comment.author.avatar ? 'transparent' : undefined,
          }}
        >
          {comment.author.avatar ? (
            <img src={comment.author.avatar} alt={comment.author.name} />
          ) : (
            getInitials(comment.author.name)
          )}
        </div>

        {/* Meta */}
        <div className="comments-sidebar-item-meta">
          <div className="comments-sidebar-item-author">
            {comment.author.name}
          </div>
          <div className="comments-sidebar-item-location">
            <span className="comments-sidebar-item-sheet">
              {comment.cellAddress.sheet}
            </span>
            <span>{formatCellAddress(comment.cellAddress)}</span>
          </div>
        </div>

        {/* Time */}
        <div className="comments-sidebar-item-time">
          {formatRelativeTime(comment.updatedAt)}
        </div>
      </div>

      {/* Comment text preview */}
      <div className="comments-sidebar-item-text">{comment.text}</div>

      {/* Footer with badges and reply count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        {/* Badges */}
        {comment.resolved && (
          <span className="comments-sidebar-item-badge resolved">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
            </svg>
            Resolved
          </span>
        )}

        {hasMention && (
          <span className="comments-sidebar-item-badge mention">
            @Mentioned
          </span>
        )}

        {/* Reply count */}
        {replyCount > 0 && (
          <span className="comments-sidebar-item-replies">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.78 1.97a.75.75 0 0 1 0 1.06L3.81 6h6.44A4.75 4.75 0 0 1 15 10.75v2.5a.75.75 0 0 1-1.5 0v-2.5a3.25 3.25 0 0 0-3.25-3.25H3.81l2.97 2.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L1.47 7.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0z" />
            </svg>
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
        )}
      </div>
    </div>
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

export default CommentsSidebar;
