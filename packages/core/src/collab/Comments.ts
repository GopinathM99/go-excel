/**
 * Comments data model and manager for collaborative commenting on spreadsheet cells
 */

/**
 * Represents the author of a comment or reply
 */
export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Represents a cell address for a comment
 */
export interface CommentCellAddress {
  sheet: string;
  row: number;
  col: number;
}

/**
 * Represents a reply to a comment
 */
export interface CommentReply {
  id: string;
  author: CommentAuthor;
  text: string;
  createdAt: number;
  mentions: string[];
}

/**
 * Represents a comment on a cell
 */
export interface Comment {
  id: string;
  cellAddress: CommentCellAddress;
  author: CommentAuthor;
  text: string;
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  replies: CommentReply[];
  mentions: string[];
}

/**
 * Event types emitted by the CommentManager
 */
export type CommentManagerEvent =
  | { type: 'commentAdded'; comment: Comment }
  | { type: 'commentUpdated'; comment: Comment }
  | { type: 'commentDeleted'; commentId: string }
  | { type: 'replyAdded'; commentId: string; reply: CommentReply }
  | { type: 'replyDeleted'; commentId: string; replyId: string }
  | { type: 'commentResolved'; comment: Comment }
  | { type: 'commentUnresolved'; comment: Comment };

/**
 * Event listener callback type
 */
export type CommentManagerEventListener = (event: CommentManagerEvent) => void;

/**
 * Serialized format for comments
 */
export interface SerializedComments {
  version: number;
  comments: Comment[];
}

/**
 * Configuration options for CommentManager
 */
export interface CommentManagerConfig {
  /** Function to generate unique IDs. Defaults to crypto.randomUUID or fallback */
  generateId?: () => string;
  /** User registry for resolving @mentions to user IDs */
  userRegistry?: Map<string, string>;
}

/**
 * Generates a unique ID using crypto.randomUUID or a fallback
 */
function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a cell address key for use in Maps
 */
export function createCellAddressKey(address: CommentCellAddress): string {
  return `${address.sheet}!${address.row},${address.col}`;
}

/**
 * Parses a cell address key back into a CommentCellAddress
 */
export function parseCellAddressKey(key: string): CommentCellAddress | null {
  const match = key.match(/^(.+)!(\d+),(\d+)$/);
  if (!match) return null;
  return {
    sheet: match[1],
    row: parseInt(match[2], 10),
    col: parseInt(match[3], 10),
  };
}

/**
 * Compares two cell addresses for equality
 */
export function cellAddressesEqual(
  a: CommentCellAddress,
  b: CommentCellAddress
): boolean {
  return a.sheet === b.sheet && a.row === b.row && a.col === b.col;
}

/**
 * Manager class for handling comments on spreadsheet cells
 */
export class CommentManager {
  private comments: Map<string, Comment>;
  private commentsByCell: Map<string, Set<string>>;
  private commentsBySheet: Map<string, Set<string>>;
  private listeners: Set<CommentManagerEventListener>;
  private generateId: () => string;
  private userRegistry: Map<string, string>;

  constructor(config?: CommentManagerConfig) {
    this.comments = new Map();
    this.commentsByCell = new Map();
    this.commentsBySheet = new Map();
    this.listeners = new Set();
    this.generateId = config?.generateId ?? defaultGenerateId;
    this.userRegistry = config?.userRegistry ?? new Map();
  }

  /**
   * Adds a new comment to a cell
   * @param cellAddress - The cell address to add the comment to
   * @param author - The author of the comment
   * @param text - The comment text
   * @returns The created comment
   */
  addComment(
    cellAddress: CommentCellAddress,
    author: CommentAuthor,
    text: string
  ): Comment {
    const now = Date.now();
    const mentions = this.parseMentions(text);

    const comment: Comment = {
      id: this.generateId(),
      cellAddress: { ...cellAddress },
      author: { ...author },
      text,
      createdAt: now,
      updatedAt: now,
      resolved: false,
      replies: [],
      mentions,
    };

    this.comments.set(comment.id, comment);
    this.indexComment(comment);
    this.emit({ type: 'commentAdded', comment });

    return comment;
  }

  /**
   * Updates the text of an existing comment
   * @param commentId - The ID of the comment to update
   * @param text - The new comment text
   * @throws Error if the comment does not exist
   */
  updateComment(commentId: string, text: string): void {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} does not exist`);
    }

    const mentions = this.parseMentions(text);
    const updatedComment: Comment = {
      ...comment,
      text,
      updatedAt: Date.now(),
      mentions,
    };

    this.comments.set(commentId, updatedComment);
    this.emit({ type: 'commentUpdated', comment: updatedComment });
  }

  /**
   * Deletes a comment by ID
   * @param commentId - The ID of the comment to delete
   * @returns true if the comment was deleted, false if it didn't exist
   */
  deleteComment(commentId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) {
      return false;
    }

    this.unindexComment(comment);
    this.comments.delete(commentId);
    this.emit({ type: 'commentDeleted', commentId });

    return true;
  }

  /**
   * Adds a reply to an existing comment
   * @param commentId - The ID of the comment to reply to
   * @param author - The author of the reply
   * @param text - The reply text
   * @returns The created reply
   * @throws Error if the comment does not exist
   */
  addReply(
    commentId: string,
    author: CommentAuthor,
    text: string
  ): CommentReply {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} does not exist`);
    }

    const mentions = this.parseMentions(text);

    const reply: CommentReply = {
      id: this.generateId(),
      author: { ...author },
      text,
      createdAt: Date.now(),
      mentions,
    };

    const updatedComment: Comment = {
      ...comment,
      replies: [...comment.replies, reply],
      updatedAt: Date.now(),
    };

    this.comments.set(commentId, updatedComment);
    this.emit({ type: 'replyAdded', commentId, reply });

    return reply;
  }

  /**
   * Deletes a reply from a comment
   * @param commentId - The ID of the comment containing the reply
   * @param replyId - The ID of the reply to delete
   * @returns true if the reply was deleted, false if it didn't exist
   * @throws Error if the comment does not exist
   */
  deleteReply(commentId: string, replyId: string): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} does not exist`);
    }

    const replyIndex = comment.replies.findIndex((r) => r.id === replyId);
    if (replyIndex === -1) {
      return false;
    }

    const updatedComment: Comment = {
      ...comment,
      replies: comment.replies.filter((r) => r.id !== replyId),
      updatedAt: Date.now(),
    };

    this.comments.set(commentId, updatedComment);
    this.emit({ type: 'replyDeleted', commentId, replyId });

    return true;
  }

  /**
   * Marks a comment as resolved
   * @param commentId - The ID of the comment to resolve
   * @throws Error if the comment does not exist
   */
  resolveComment(commentId: string): void {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} does not exist`);
    }

    if (comment.resolved) {
      return; // Already resolved
    }

    const updatedComment: Comment = {
      ...comment,
      resolved: true,
      updatedAt: Date.now(),
    };

    this.comments.set(commentId, updatedComment);
    this.emit({ type: 'commentResolved', comment: updatedComment });
  }

  /**
   * Marks a comment as unresolved
   * @param commentId - The ID of the comment to unresolve
   * @throws Error if the comment does not exist
   */
  unresolveComment(commentId: string): void {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} does not exist`);
    }

    if (!comment.resolved) {
      return; // Already unresolved
    }

    const updatedComment: Comment = {
      ...comment,
      resolved: false,
      updatedAt: Date.now(),
    };

    this.comments.set(commentId, updatedComment);
    this.emit({ type: 'commentUnresolved', comment: updatedComment });
  }

  /**
   * Gets a comment by ID
   * @param commentId - The ID of the comment
   * @returns The comment or undefined if not found
   */
  getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId);
  }

  /**
   * Gets all comments for a specific cell
   * @param cellAddress - The cell address to get comments for
   * @returns Array of comments for the cell
   */
  getCommentsForCell(cellAddress: CommentCellAddress): Comment[] {
    const key = createCellAddressKey(cellAddress);
    const commentIds = this.commentsByCell.get(key);
    if (!commentIds) {
      return [];
    }

    const comments: Comment[] = [];
    for (const id of commentIds) {
      const comment = this.comments.get(id);
      if (comment) {
        comments.push(comment);
      }
    }

    // Sort by creation time (oldest first)
    return comments.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Gets all comments for a specific sheet
   * @param sheetId - The sheet ID to get comments for
   * @returns Array of comments for the sheet
   */
  getCommentsForSheet(sheetId: string): Comment[] {
    const commentIds = this.commentsBySheet.get(sheetId);
    if (!commentIds) {
      return [];
    }

    const comments: Comment[] = [];
    for (const id of commentIds) {
      const comment = this.comments.get(id);
      if (comment) {
        comments.push(comment);
      }
    }

    // Sort by creation time (oldest first)
    return comments.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Gets all comments
   * @returns Array of all comments
   */
  getAllComments(): Comment[] {
    return Array.from(this.comments.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
  }

  /**
   * Gets all unresolved comments
   * @returns Array of unresolved comments
   */
  getUnresolvedComments(): Comment[] {
    return Array.from(this.comments.values())
      .filter((comment) => !comment.resolved)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Gets all resolved comments
   * @returns Array of resolved comments
   */
  getResolvedComments(): Comment[] {
    return Array.from(this.comments.values())
      .filter((comment) => comment.resolved)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Gets the total count of comments
   * @returns The number of comments
   */
  getCommentCount(): number {
    return this.comments.size;
  }

  /**
   * Checks if a comment exists
   * @param commentId - The ID of the comment to check
   * @returns true if the comment exists
   */
  hasComment(commentId: string): boolean {
    return this.comments.has(commentId);
  }

  /**
   * Checks if a cell has any comments
   * @param cellAddress - The cell address to check
   * @returns true if the cell has comments
   */
  cellHasComments(cellAddress: CommentCellAddress): boolean {
    const key = createCellAddressKey(cellAddress);
    const commentIds = this.commentsByCell.get(key);
    return commentIds !== undefined && commentIds.size > 0;
  }

  /**
   * Parses @mentions from text and returns an array of user IDs
   * Looks for patterns like @username or @"User Name"
   * Must be preceded by start of string or whitespace to avoid matching emails
   * @param text - The text to parse
   * @returns Array of user IDs mentioned in the text
   */
  parseMentions(text: string): string[] {
    const mentions: string[] = [];
    const seen = new Set<string>();

    // Match @username (alphanumeric, underscore, hyphen) or @"quoted name"
    // Must be preceded by start of string or whitespace (to avoid matching email addresses)
    const mentionRegex = /(?:^|[\s])@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1] || match[2]; // Quoted or unquoted

      // Try to resolve the mention to a user ID
      let userId: string;

      if (this.userRegistry.has(mentionName)) {
        // Use the registered user ID
        userId = this.userRegistry.get(mentionName)!;
      } else {
        // Use the mention name as the user ID
        userId = mentionName;
      }

      // Avoid duplicates
      if (!seen.has(userId)) {
        seen.add(userId);
        mentions.push(userId);
      }
    }

    return mentions;
  }

  /**
   * Sets the user registry for resolving @mentions to user IDs
   * @param registry - Map of display names to user IDs
   */
  setUserRegistry(registry: Map<string, string>): void {
    this.userRegistry = registry;
  }

  /**
   * Adds an event listener
   * @param listener - The listener function to add
   */
  addEventListener(listener: CommentManagerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Removes an event listener
   * @param listener - The listener function to remove
   */
  removeEventListener(listener: CommentManagerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Serializes the comment manager state to JSON
   * @returns The serialized comments
   */
  toJSON(): SerializedComments {
    return {
      version: 1,
      comments: this.getAllComments(),
    };
  }

  /**
   * Loads comments from serialized state
   * @param data - The serialized comments
   */
  fromJSON(data: SerializedComments): void {
    this.clear();

    for (const comment of data.comments) {
      this.comments.set(comment.id, comment);
      this.indexComment(comment);
    }
  }

  /**
   * Clears all comments
   */
  clear(): void {
    const commentIds = Array.from(this.comments.keys());
    this.comments.clear();
    this.commentsByCell.clear();
    this.commentsBySheet.clear();

    for (const commentId of commentIds) {
      this.emit({ type: 'commentDeleted', commentId });
    }
  }

  /**
   * Clears all comments for a specific sheet
   * @param sheetId - The sheet ID to clear comments for
   */
  clearSheet(sheetId: string): void {
    const commentIds = this.commentsBySheet.get(sheetId);
    if (!commentIds) {
      return;
    }

    for (const commentId of Array.from(commentIds)) {
      this.deleteComment(commentId);
    }
  }

  /**
   * Emits an event to all listeners
   */
  private emit(event: CommentManagerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in comment manager event listener:', error);
      }
    }
  }

  /**
   * Indexes a comment by cell address and sheet
   */
  private indexComment(comment: Comment): void {
    // Index by cell address
    const cellKey = createCellAddressKey(comment.cellAddress);
    if (!this.commentsByCell.has(cellKey)) {
      this.commentsByCell.set(cellKey, new Set());
    }
    this.commentsByCell.get(cellKey)!.add(comment.id);

    // Index by sheet
    const sheetId = comment.cellAddress.sheet;
    if (!this.commentsBySheet.has(sheetId)) {
      this.commentsBySheet.set(sheetId, new Set());
    }
    this.commentsBySheet.get(sheetId)!.add(comment.id);
  }

  /**
   * Removes a comment from the indexes
   */
  private unindexComment(comment: Comment): void {
    // Remove from cell index
    const cellKey = createCellAddressKey(comment.cellAddress);
    const cellComments = this.commentsByCell.get(cellKey);
    if (cellComments) {
      cellComments.delete(comment.id);
      if (cellComments.size === 0) {
        this.commentsByCell.delete(cellKey);
      }
    }

    // Remove from sheet index
    const sheetId = comment.cellAddress.sheet;
    const sheetComments = this.commentsBySheet.get(sheetId);
    if (sheetComments) {
      sheetComments.delete(comment.id);
      if (sheetComments.size === 0) {
        this.commentsBySheet.delete(sheetId);
      }
    }
  }
}

/**
 * Creates a new CommentManager instance
 * @param config - Optional configuration
 * @returns A new CommentManager instance
 */
export function createCommentManager(
  config?: CommentManagerConfig
): CommentManager {
  return new CommentManager(config);
}
