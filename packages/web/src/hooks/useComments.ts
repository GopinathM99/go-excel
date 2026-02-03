import { useCallback, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import type {
  Comment,
  CommentAuthor,
  CommentCellAddress,
  CommentReply,
  CommentManagerEvent,
} from '@excel/core';
import { CommentManager, createCellAddressKey } from '@excel/core';

/**
 * User for @mention suggestions
 */
export interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

/**
 * Comment filter options
 */
export type CommentFilter = 'all' | 'unresolved' | 'resolved' | 'mine';

/**
 * Comment sort options
 */
export type CommentSort = 'date' | 'sheet' | 'cell';

/**
 * Comments store state
 */
interface CommentsState {
  // The comment manager instance
  manager: CommentManager;

  // Current user info
  currentUser: CommentAuthor | null;

  // List of users for @mentions
  users: MentionUser[];

  // Active popover state
  activePopoverCell: CommentCellAddress | null;

  // Sidebar visibility
  sidebarOpen: boolean;

  // Sidebar filters
  sidebarFilter: CommentFilter;
  sidebarSort: CommentSort;
  sidebarSearch: string;

  // Comments version for triggering re-renders
  commentsVersion: number;

  // New mention notifications
  mentionNotifications: Set<string>;

  // Actions
  setCurrentUser: (user: CommentAuthor | null) => void;
  setUsers: (users: MentionUser[]) => void;
  setActivePopoverCell: (cell: CommentCellAddress | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarFilter: (filter: CommentFilter) => void;
  setSidebarSort: (sort: CommentSort) => void;
  setSidebarSearch: (search: string) => void;
  incrementVersion: () => void;
  addMentionNotification: (commentId: string) => void;
  clearMentionNotification: (commentId: string) => void;
  clearAllMentionNotifications: () => void;
}

/**
 * Zustand store for comments state
 */
export const useCommentsStore = create<CommentsState>((set, get) => ({
  manager: new CommentManager(),
  currentUser: null,
  users: [],
  activePopoverCell: null,
  sidebarOpen: false,
  sidebarFilter: 'all',
  sidebarSort: 'date',
  sidebarSearch: '',
  commentsVersion: 0,
  mentionNotifications: new Set(),

  setCurrentUser: (user: CommentAuthor | null) => {
    set({ currentUser: user });
  },

  setUsers: (users: MentionUser[]) => {
    set({ users });
    // Update user registry in manager
    const registry = new Map<string, string>();
    users.forEach((user) => {
      registry.set(user.name, user.id);
    });
    get().manager.setUserRegistry(registry);
  },

  setActivePopoverCell: (cell: CommentCellAddress | null) => {
    set({ activePopoverCell: cell });
  },

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  setSidebarFilter: (filter: CommentFilter) => {
    set({ sidebarFilter: filter });
  },

  setSidebarSort: (sort: CommentSort) => {
    set({ sidebarSort: sort });
  },

  setSidebarSearch: (search: string) => {
    set({ sidebarSearch: search });
  },

  incrementVersion: () => {
    set((state) => ({ commentsVersion: state.commentsVersion + 1 }));
  },

  addMentionNotification: (commentId: string) => {
    set((state) => {
      const newNotifications = new Set(state.mentionNotifications);
      newNotifications.add(commentId);
      return { mentionNotifications: newNotifications };
    });
  },

  clearMentionNotification: (commentId: string) => {
    set((state) => {
      const newNotifications = new Set(state.mentionNotifications);
      newNotifications.delete(commentId);
      return { mentionNotifications: newNotifications };
    });
  },

  clearAllMentionNotifications: () => {
    set({ mentionNotifications: new Set() });
  },
}));

/**
 * Format a timestamp as relative time ("2 hours ago", "just now", etc.)
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}

/**
 * Convert column number to Excel-style letter (0 -> A, 1 -> B, etc.)
 */
function columnToLetter(col: number): string {
  let result = '';
  let n = col;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/**
 * Format cell address for display (e.g., "A1", "Sheet1!B2")
 */
export function formatCellAddress(
  address: CommentCellAddress,
  includeSheet = false
): string {
  const cellRef = `${columnToLetter(address.col)}${address.row + 1}`;
  if (includeSheet) {
    return `${address.sheet}!${cellRef}`;
  }
  return cellRef;
}

/**
 * Hook to manage comments for the spreadsheet
 */
export function useComments(currentSheetId?: string) {
  const {
    manager,
    currentUser,
    users,
    activePopoverCell,
    sidebarOpen,
    sidebarFilter,
    sidebarSort,
    sidebarSearch,
    commentsVersion,
    mentionNotifications,
    setCurrentUser,
    setUsers,
    setActivePopoverCell,
    setSidebarOpen,
    setSidebarFilter,
    setSidebarSort,
    setSidebarSearch,
    incrementVersion,
    addMentionNotification,
    clearMentionNotification,
    clearAllMentionNotifications,
  } = useCommentsStore();

  // Subscribe to manager events
  useEffect(() => {
    const handleEvent = (event: CommentManagerEvent) => {
      incrementVersion();

      // Check for mentions of current user
      if (currentUser) {
        if (event.type === 'commentAdded') {
          if (event.comment.mentions.includes(currentUser.id)) {
            addMentionNotification(event.comment.id);
          }
        } else if (event.type === 'replyAdded') {
          if (event.reply.mentions.includes(currentUser.id)) {
            addMentionNotification(event.commentId);
          }
        }
      }
    };

    manager.addEventListener(handleEvent);
    return () => manager.removeEventListener(handleEvent);
  }, [manager, currentUser, incrementVersion, addMentionNotification]);

  /**
   * Add a new comment to a cell
   */
  const addComment = useCallback(
    (cellAddress: CommentCellAddress, text: string): Comment | null => {
      if (!currentUser) {
        console.warn('Cannot add comment: no current user set');
        return null;
      }
      return manager.addComment(cellAddress, currentUser, text);
    },
    [manager, currentUser]
  );

  /**
   * Update comment text
   */
  const updateComment = useCallback(
    (commentId: string, text: string): void => {
      manager.updateComment(commentId, text);
    },
    [manager]
  );

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(
    (commentId: string): boolean => {
      return manager.deleteComment(commentId);
    },
    [manager]
  );

  /**
   * Add a reply to a comment
   */
  const addReply = useCallback(
    (commentId: string, text: string): CommentReply | null => {
      if (!currentUser) {
        console.warn('Cannot add reply: no current user set');
        return null;
      }
      return manager.addReply(commentId, currentUser, text);
    },
    [manager, currentUser]
  );

  /**
   * Delete a reply
   */
  const deleteReply = useCallback(
    (commentId: string, replyId: string): boolean => {
      return manager.deleteReply(commentId, replyId);
    },
    [manager]
  );

  /**
   * Resolve a comment
   */
  const resolveComment = useCallback(
    (commentId: string): void => {
      manager.resolveComment(commentId);
    },
    [manager]
  );

  /**
   * Unresolve a comment
   */
  const unresolveComment = useCallback(
    (commentId: string): void => {
      manager.unresolveComment(commentId);
    },
    [manager]
  );

  /**
   * Get comment by ID
   */
  const getComment = useCallback(
    (commentId: string): Comment | undefined => {
      return manager.getComment(commentId);
    },
    [manager]
  );

  /**
   * Get comments for a specific cell
   */
  const getCommentsForCell = useCallback(
    (cellAddress: CommentCellAddress): Comment[] => {
      return manager.getCommentsForCell(cellAddress);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manager, commentsVersion]
  );

  /**
   * Check if a cell has comments
   */
  const cellHasComments = useCallback(
    (cellAddress: CommentCellAddress): boolean => {
      return manager.cellHasComments(cellAddress);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manager, commentsVersion]
  );

  /**
   * Get comments for current sheet
   */
  const sheetComments = useMemo(() => {
    if (!currentSheetId) return [];
    return manager.getCommentsForSheet(currentSheetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, currentSheetId, commentsVersion]);

  /**
   * Get all comments
   */
  const allComments = useMemo(() => {
    return manager.getAllComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager, commentsVersion]);

  /**
   * Get filtered and sorted comments for sidebar
   */
  const sidebarComments = useMemo(() => {
    let comments = allComments;

    // Apply filter
    switch (sidebarFilter) {
      case 'unresolved':
        comments = comments.filter((c) => !c.resolved);
        break;
      case 'resolved':
        comments = comments.filter((c) => c.resolved);
        break;
      case 'mine':
        if (currentUser) {
          comments = comments.filter(
            (c) =>
              c.author.id === currentUser.id ||
              c.replies.some((r) => r.author.id === currentUser.id)
          );
        }
        break;
    }

    // Apply search
    if (sidebarSearch.trim()) {
      const searchLower = sidebarSearch.toLowerCase();
      comments = comments.filter(
        (c) =>
          c.text.toLowerCase().includes(searchLower) ||
          c.author.name.toLowerCase().includes(searchLower) ||
          c.replies.some(
            (r) =>
              r.text.toLowerCase().includes(searchLower) ||
              r.author.name.toLowerCase().includes(searchLower)
          )
      );
    }

    // Apply sort
    switch (sidebarSort) {
      case 'date':
        comments = [...comments].sort((a, b) => b.updatedAt - a.updatedAt);
        break;
      case 'sheet':
        comments = [...comments].sort((a, b) =>
          a.cellAddress.sheet.localeCompare(b.cellAddress.sheet)
        );
        break;
      case 'cell':
        comments = [...comments].sort((a, b) => {
          const sheetCompare = a.cellAddress.sheet.localeCompare(
            b.cellAddress.sheet
          );
          if (sheetCompare !== 0) return sheetCompare;
          const rowCompare = a.cellAddress.row - b.cellAddress.row;
          if (rowCompare !== 0) return rowCompare;
          return a.cellAddress.col - b.cellAddress.col;
        });
        break;
    }

    return comments;
  }, [allComments, sidebarFilter, sidebarSort, sidebarSearch, currentUser]);

  /**
   * Check if a comment has unresolved status
   */
  const hasUnresolvedComments = useMemo(() => {
    return allComments.some((c) => !c.resolved);
  }, [allComments]);

  /**
   * Get count of unread mention notifications
   */
  const unreadMentionCount = useMemo(() => {
    return mentionNotifications.size;
  }, [mentionNotifications]);

  /**
   * Open popover for a cell
   */
  const openPopover = useCallback(
    (cellAddress: CommentCellAddress) => {
      setActivePopoverCell(cellAddress);
    },
    [setActivePopoverCell]
  );

  /**
   * Close popover
   */
  const closePopover = useCallback(() => {
    setActivePopoverCell(null);
  }, [setActivePopoverCell]);

  /**
   * Toggle sidebar
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen, setSidebarOpen]);

  /**
   * Filter users for mention autocomplete
   */
  const filterUsersForMention = useCallback(
    (query: string): MentionUser[] => {
      if (!query.trim()) return users.slice(0, 10);
      const queryLower = query.toLowerCase();
      return users
        .filter(
          (user) =>
            user.name.toLowerCase().includes(queryLower) ||
            (user.email && user.email.toLowerCase().includes(queryLower))
        )
        .slice(0, 10);
    },
    [users]
  );

  /**
   * Check if current user can edit a comment
   */
  const canEditComment = useCallback(
    (comment: Comment): boolean => {
      if (!currentUser) return false;
      return comment.author.id === currentUser.id;
    },
    [currentUser]
  );

  /**
   * Check if current user can delete a reply
   */
  const canDeleteReply = useCallback(
    (reply: CommentReply): boolean => {
      if (!currentUser) return false;
      return reply.author.id === currentUser.id;
    },
    [currentUser]
  );

  /**
   * Navigate to a comment's cell (for use with sidebar)
   */
  const navigateToComment = useCallback(
    (comment: Comment, onNavigate?: (address: CommentCellAddress) => void) => {
      if (onNavigate) {
        onNavigate(comment.cellAddress);
      }
      setActivePopoverCell(comment.cellAddress);
    },
    [setActivePopoverCell]
  );

  /**
   * Serialize comments for saving
   */
  const serializeComments = useCallback(() => {
    return manager.toJSON();
  }, [manager]);

  /**
   * Load comments from serialized data
   */
  const loadComments = useCallback(
    (data: { version: number; comments: Comment[] }) => {
      manager.fromJSON(data);
      incrementVersion();
    },
    [manager, incrementVersion]
  );

  return {
    // State
    currentUser,
    users,
    activePopoverCell,
    sidebarOpen,
    sidebarFilter,
    sidebarSort,
    sidebarSearch,
    sheetComments,
    allComments,
    sidebarComments,
    hasUnresolvedComments,
    unreadMentionCount,
    mentionNotifications,

    // User management
    setCurrentUser,
    setUsers,

    // Comment CRUD
    addComment,
    updateComment,
    deleteComment,
    getComment,
    getCommentsForCell,
    cellHasComments,

    // Reply CRUD
    addReply,
    deleteReply,

    // Resolve/Unresolve
    resolveComment,
    unresolveComment,

    // Popover
    openPopover,
    closePopover,

    // Sidebar
    toggleSidebar,
    setSidebarOpen,
    setSidebarFilter,
    setSidebarSort,
    setSidebarSearch,

    // Mentions
    filterUsersForMention,
    clearMentionNotification,
    clearAllMentionNotifications,

    // Permissions
    canEditComment,
    canDeleteReply,

    // Navigation
    navigateToComment,

    // Serialization
    serializeComments,
    loadComments,
  };
}

export type { Comment, CommentAuthor, CommentCellAddress, CommentReply };
