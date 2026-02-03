/**
 * Comments UI Components
 *
 * Provides Excel/Google Sheets-like commenting functionality:
 * - CommentIndicator: Small triangle in cell corner showing comment exists
 * - CommentPopover: Popover showing full comment thread
 * - CommentThread: Displays a comment with replies
 * - CommentInput: Input for adding/editing comments with @mention support
 * - MentionInput: Textarea with @mention autocomplete
 * - CommentsSidebar: Sidebar showing all comments in workbook
 *
 * Usage:
 * ```tsx
 * import {
 *   CommentIndicator,
 *   CommentPopover,
 *   CommentsSidebar,
 *   useComments,
 * } from './Comments';
 *
 * function Cell({ row, col, sheetId }) {
 *   const {
 *     cellHasComments,
 *     getCommentsForCell,
 *     openPopover,
 *     activePopoverCell,
 *   } = useComments(sheetId);
 *
 *   const cellAddress = { sheet: sheetId, row, col };
 *   const hasComment = cellHasComments(cellAddress);
 *
 *   return (
 *     <div className="cell">
 *       {hasComment && (
 *         <CommentIndicator
 *           cellAddress={cellAddress}
 *           onClick={() => openPopover(cellAddress)}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * Keyboard shortcuts:
 * - Shift+F2: Add comment to selected cell
 * - Escape: Close popover/sidebar
 *
 * Features:
 * - Real-time updates via collaboration sync
 * - @mention notifications
 * - Relative timestamps
 * - Resolve/unresolve comments
 * - Reply threading
 * - Search and filter comments
 */

// Components
export { CommentIndicator } from './CommentIndicator';
export { CommentPopover } from './CommentPopover';
export { CommentThread } from './CommentThread';
export { CommentInput } from './CommentInput';
export { MentionInput } from './MentionInput';
export { CommentsSidebar } from './CommentsSidebar';

// Hook
export {
  useComments,
  useCommentsStore,
  formatRelativeTime,
  formatCellAddress,
} from '../../hooks/useComments';

// Types
export type {
  Comment,
  CommentAuthor,
  CommentCellAddress,
  CommentReply,
  MentionUser,
  CommentFilter,
  CommentSort,
} from '../../hooks/useComments';

// CSS imports
import './Comments.css';
