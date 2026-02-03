import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CommentManager,
  createCommentManager,
  createCellAddressKey,
  parseCellAddressKey,
  cellAddressesEqual,
  type Comment,
  type CommentReply,
  type CommentCellAddress,
  type CommentAuthor,
  type CommentManagerEvent,
  type SerializedComments,
} from './Comments';

describe('Comments', () => {
  let manager: CommentManager;
  let idCounter: number;

  const author1: CommentAuthor = {
    id: 'user-1',
    name: 'John Doe',
    avatar: 'https://example.com/avatar1.png',
  };

  const author2: CommentAuthor = {
    id: 'user-2',
    name: 'Jane Smith',
  };

  const cellAddress1: CommentCellAddress = {
    sheet: 'Sheet1',
    row: 0,
    col: 0,
  };

  const cellAddress2: CommentCellAddress = {
    sheet: 'Sheet1',
    row: 5,
    col: 3,
  };

  const cellAddress3: CommentCellAddress = {
    sheet: 'Sheet2',
    row: 0,
    col: 0,
  };

  beforeEach(() => {
    idCounter = 0;
    manager = new CommentManager({
      generateId: () => `id-${++idCounter}`,
    });
  });

  describe('createCellAddressKey', () => {
    it('should create a key from cell address', () => {
      expect(createCellAddressKey(cellAddress1)).toBe('Sheet1!0,0');
      expect(createCellAddressKey(cellAddress2)).toBe('Sheet1!5,3');
      expect(createCellAddressKey(cellAddress3)).toBe('Sheet2!0,0');
    });
  });

  describe('parseCellAddressKey', () => {
    it('should parse a valid cell address key', () => {
      expect(parseCellAddressKey('Sheet1!0,0')).toEqual(cellAddress1);
      expect(parseCellAddressKey('Sheet1!5,3')).toEqual(cellAddress2);
    });

    it('should return null for invalid keys', () => {
      expect(parseCellAddressKey('invalid')).toBeNull();
      expect(parseCellAddressKey('Sheet1!abc')).toBeNull();
      expect(parseCellAddressKey('')).toBeNull();
    });

    it('should handle sheet names with special characters', () => {
      const key = 'My Sheet!10,20';
      const result = parseCellAddressKey(key);
      expect(result).toEqual({ sheet: 'My Sheet', row: 10, col: 20 });
    });
  });

  describe('cellAddressesEqual', () => {
    it('should return true for equal addresses', () => {
      expect(cellAddressesEqual(cellAddress1, { ...cellAddress1 })).toBe(true);
    });

    it('should return false for different addresses', () => {
      expect(cellAddressesEqual(cellAddress1, cellAddress2)).toBe(false);
      expect(cellAddressesEqual(cellAddress1, cellAddress3)).toBe(false);
    });
  });

  describe('addComment', () => {
    it('should add a comment to a cell', () => {
      const comment = manager.addComment(cellAddress1, author1, 'Test comment');

      expect(comment.id).toBe('id-1');
      expect(comment.cellAddress).toEqual(cellAddress1);
      expect(comment.author).toEqual(author1);
      expect(comment.text).toBe('Test comment');
      expect(comment.resolved).toBe(false);
      expect(comment.replies).toEqual([]);
      expect(comment.mentions).toEqual([]);
      expect(comment.createdAt).toBeGreaterThan(0);
      expect(comment.updatedAt).toBe(comment.createdAt);
    });

    it('should emit commentAdded event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const comment = manager.addComment(cellAddress1, author1, 'Test');

      expect(listener).toHaveBeenCalledWith({
        type: 'commentAdded',
        comment,
      });
    });

    it('should parse mentions from text', () => {
      const comment = manager.addComment(
        cellAddress1,
        author1,
        'Hello @john and @jane!'
      );

      expect(comment.mentions).toEqual(['john', 'jane']);
    });

    it('should handle quoted mentions', () => {
      const comment = manager.addComment(
        cellAddress1,
        author1,
        'Hello @"John Doe"!'
      );

      expect(comment.mentions).toEqual(['John Doe']);
    });

    it('should not create duplicate copies of cell address', () => {
      const originalAddress = { ...cellAddress1 };
      const comment = manager.addComment(originalAddress, author1, 'Test');

      // Modify the original address
      originalAddress.row = 999;

      // Comment should have its own copy
      expect(comment.cellAddress.row).toBe(0);
    });
  });

  describe('updateComment', () => {
    let comment: Comment;

    beforeEach(() => {
      comment = manager.addComment(cellAddress1, author1, 'Original text');
    });

    it('should update comment text', () => {
      manager.updateComment(comment.id, 'Updated text');

      const updated = manager.getComment(comment.id);
      expect(updated?.text).toBe('Updated text');
    });

    it('should update the updatedAt timestamp', () => {
      const originalUpdatedAt = comment.updatedAt;

      manager.updateComment(comment.id, 'Updated text');

      const updated = manager.getComment(comment.id);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should update mentions when text changes', () => {
      manager.updateComment(comment.id, 'Hello @alice and @bob!');

      const updated = manager.getComment(comment.id);
      expect(updated?.mentions).toEqual(['alice', 'bob']);
    });

    it('should throw if comment does not exist', () => {
      expect(() => manager.updateComment('nonexistent', 'text')).toThrow(
        'Comment with ID nonexistent does not exist'
      );
    });

    it('should emit commentUpdated event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.updateComment(comment.id, 'Updated text');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commentUpdated',
        })
      );
    });
  });

  describe('deleteComment', () => {
    let comment: Comment;

    beforeEach(() => {
      comment = manager.addComment(cellAddress1, author1, 'Test');
    });

    it('should delete a comment', () => {
      const result = manager.deleteComment(comment.id);

      expect(result).toBe(true);
      expect(manager.getComment(comment.id)).toBeUndefined();
    });

    it('should return false if comment does not exist', () => {
      const result = manager.deleteComment('nonexistent');
      expect(result).toBe(false);
    });

    it('should emit commentDeleted event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.deleteComment(comment.id);

      expect(listener).toHaveBeenCalledWith({
        type: 'commentDeleted',
        commentId: comment.id,
      });
    });

    it('should remove comment from cell index', () => {
      manager.deleteComment(comment.id);

      const comments = manager.getCommentsForCell(cellAddress1);
      expect(comments).toHaveLength(0);
    });
  });

  describe('addReply', () => {
    let comment: Comment;

    beforeEach(() => {
      comment = manager.addComment(cellAddress1, author1, 'Original');
    });

    it('should add a reply to a comment', () => {
      const reply = manager.addReply(comment.id, author2, 'Reply text');

      expect(reply.id).toBe('id-2');
      expect(reply.author).toEqual(author2);
      expect(reply.text).toBe('Reply text');
      expect(reply.mentions).toEqual([]);
      expect(reply.createdAt).toBeGreaterThan(0);
    });

    it('should add reply to comment replies array', () => {
      const reply = manager.addReply(comment.id, author2, 'Reply text');

      const updated = manager.getComment(comment.id);
      expect(updated?.replies).toHaveLength(1);
      expect(updated?.replies[0]).toEqual(reply);
    });

    it('should update comment updatedAt timestamp', () => {
      const originalUpdatedAt = comment.updatedAt;

      manager.addReply(comment.id, author2, 'Reply text');

      const updated = manager.getComment(comment.id);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should parse mentions in reply', () => {
      const reply = manager.addReply(
        comment.id,
        author2,
        'Hey @john, check this out!'
      );

      expect(reply.mentions).toEqual(['john']);
    });

    it('should throw if comment does not exist', () => {
      expect(() => manager.addReply('nonexistent', author2, 'Reply')).toThrow(
        'Comment with ID nonexistent does not exist'
      );
    });

    it('should emit replyAdded event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      const reply = manager.addReply(comment.id, author2, 'Reply text');

      expect(listener).toHaveBeenCalledWith({
        type: 'replyAdded',
        commentId: comment.id,
        reply,
      });
    });

    it('should support multiple replies', () => {
      manager.addReply(comment.id, author2, 'Reply 1');
      manager.addReply(comment.id, author1, 'Reply 2');
      manager.addReply(comment.id, author2, 'Reply 3');

      const updated = manager.getComment(comment.id);
      expect(updated?.replies).toHaveLength(3);
    });
  });

  describe('deleteReply', () => {
    let comment: Comment;
    let reply: CommentReply;

    beforeEach(() => {
      comment = manager.addComment(cellAddress1, author1, 'Original');
      reply = manager.addReply(comment.id, author2, 'Reply text');
    });

    it('should delete a reply from a comment', () => {
      const result = manager.deleteReply(comment.id, reply.id);

      expect(result).toBe(true);

      const updated = manager.getComment(comment.id);
      expect(updated?.replies).toHaveLength(0);
    });

    it('should return false if reply does not exist', () => {
      const result = manager.deleteReply(comment.id, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should throw if comment does not exist', () => {
      expect(() => manager.deleteReply('nonexistent', reply.id)).toThrow(
        'Comment with ID nonexistent does not exist'
      );
    });

    it('should emit replyDeleted event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.deleteReply(comment.id, reply.id);

      expect(listener).toHaveBeenCalledWith({
        type: 'replyDeleted',
        commentId: comment.id,
        replyId: reply.id,
      });
    });

    it('should preserve other replies when deleting one', () => {
      const reply2 = manager.addReply(comment.id, author1, 'Reply 2');
      const reply3 = manager.addReply(comment.id, author2, 'Reply 3');

      manager.deleteReply(comment.id, reply.id);

      const updated = manager.getComment(comment.id);
      expect(updated?.replies).toHaveLength(2);
      expect(updated?.replies.map((r) => r.id)).toEqual([reply2.id, reply3.id]);
    });
  });

  describe('resolveComment', () => {
    let comment: Comment;

    beforeEach(() => {
      comment = manager.addComment(cellAddress1, author1, 'Test');
    });

    it('should mark a comment as resolved', () => {
      manager.resolveComment(comment.id);

      const updated = manager.getComment(comment.id);
      expect(updated?.resolved).toBe(true);
    });

    it('should update the updatedAt timestamp', () => {
      const originalUpdatedAt = comment.updatedAt;

      manager.resolveComment(comment.id);

      const updated = manager.getComment(comment.id);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('should throw if comment does not exist', () => {
      expect(() => manager.resolveComment('nonexistent')).toThrow(
        'Comment with ID nonexistent does not exist'
      );
    });

    it('should emit commentResolved event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.resolveComment(comment.id);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commentResolved',
        })
      );
    });

    it('should not emit event if already resolved', () => {
      manager.resolveComment(comment.id);

      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.resolveComment(comment.id);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('unresolveComment', () => {
    let comment: Comment;

    beforeEach(() => {
      comment = manager.addComment(cellAddress1, author1, 'Test');
      manager.resolveComment(comment.id);
    });

    it('should mark a comment as unresolved', () => {
      manager.unresolveComment(comment.id);

      const updated = manager.getComment(comment.id);
      expect(updated?.resolved).toBe(false);
    });

    it('should throw if comment does not exist', () => {
      expect(() => manager.unresolveComment('nonexistent')).toThrow(
        'Comment with ID nonexistent does not exist'
      );
    });

    it('should emit commentUnresolved event', () => {
      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.unresolveComment(comment.id);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'commentUnresolved',
        })
      );
    });

    it('should not emit event if already unresolved', () => {
      manager.unresolveComment(comment.id);

      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.unresolveComment(comment.id);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsForCell', () => {
    beforeEach(() => {
      manager.addComment(cellAddress1, author1, 'Comment 1');
      manager.addComment(cellAddress1, author2, 'Comment 2');
      manager.addComment(cellAddress2, author1, 'Comment 3');
    });

    it('should return comments for a specific cell', () => {
      const comments = manager.getCommentsForCell(cellAddress1);

      expect(comments).toHaveLength(2);
      expect(comments[0].text).toBe('Comment 1');
      expect(comments[1].text).toBe('Comment 2');
    });

    it('should return empty array for cell with no comments', () => {
      const comments = manager.getCommentsForCell(cellAddress3);
      expect(comments).toHaveLength(0);
    });

    it('should return comments sorted by creation time', () => {
      const comments = manager.getCommentsForCell(cellAddress1);

      for (let i = 1; i < comments.length; i++) {
        expect(comments[i].createdAt).toBeGreaterThanOrEqual(
          comments[i - 1].createdAt
        );
      }
    });
  });

  describe('getCommentsForSheet', () => {
    beforeEach(() => {
      manager.addComment(cellAddress1, author1, 'Comment 1');
      manager.addComment(cellAddress2, author2, 'Comment 2');
      manager.addComment(cellAddress3, author1, 'Comment 3');
    });

    it('should return comments for a specific sheet', () => {
      const comments = manager.getCommentsForSheet('Sheet1');

      expect(comments).toHaveLength(2);
    });

    it('should return empty array for sheet with no comments', () => {
      const comments = manager.getCommentsForSheet('Sheet99');
      expect(comments).toHaveLength(0);
    });
  });

  describe('getAllComments', () => {
    it('should return all comments', () => {
      manager.addComment(cellAddress1, author1, 'Comment 1');
      manager.addComment(cellAddress2, author2, 'Comment 2');
      manager.addComment(cellAddress3, author1, 'Comment 3');

      const comments = manager.getAllComments();
      expect(comments).toHaveLength(3);
    });

    it('should return empty array when no comments exist', () => {
      const comments = manager.getAllComments();
      expect(comments).toHaveLength(0);
    });
  });

  describe('getUnresolvedComments', () => {
    beforeEach(() => {
      const c1 = manager.addComment(cellAddress1, author1, 'Comment 1');
      manager.addComment(cellAddress2, author2, 'Comment 2');
      manager.resolveComment(c1.id);
    });

    it('should return only unresolved comments', () => {
      const comments = manager.getUnresolvedComments();

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe('Comment 2');
    });
  });

  describe('getResolvedComments', () => {
    beforeEach(() => {
      const c1 = manager.addComment(cellAddress1, author1, 'Comment 1');
      manager.addComment(cellAddress2, author2, 'Comment 2');
      manager.resolveComment(c1.id);
    });

    it('should return only resolved comments', () => {
      const comments = manager.getResolvedComments();

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe('Comment 1');
    });
  });

  describe('getCommentCount', () => {
    it('should return the correct count', () => {
      expect(manager.getCommentCount()).toBe(0);

      manager.addComment(cellAddress1, author1, 'Comment 1');
      expect(manager.getCommentCount()).toBe(1);

      manager.addComment(cellAddress2, author2, 'Comment 2');
      expect(manager.getCommentCount()).toBe(2);
    });
  });

  describe('hasComment', () => {
    it('should return true if comment exists', () => {
      const comment = manager.addComment(cellAddress1, author1, 'Test');
      expect(manager.hasComment(comment.id)).toBe(true);
    });

    it('should return false if comment does not exist', () => {
      expect(manager.hasComment('nonexistent')).toBe(false);
    });
  });

  describe('cellHasComments', () => {
    it('should return true if cell has comments', () => {
      manager.addComment(cellAddress1, author1, 'Test');
      expect(manager.cellHasComments(cellAddress1)).toBe(true);
    });

    it('should return false if cell has no comments', () => {
      expect(manager.cellHasComments(cellAddress1)).toBe(false);
    });

    it('should return false after all comments are deleted', () => {
      const comment = manager.addComment(cellAddress1, author1, 'Test');
      manager.deleteComment(comment.id);

      expect(manager.cellHasComments(cellAddress1)).toBe(false);
    });
  });

  describe('parseMentions', () => {
    it('should parse simple @mentions', () => {
      const mentions = manager.parseMentions('Hello @john and @jane!');
      expect(mentions).toEqual(['john', 'jane']);
    });

    it('should parse quoted @mentions', () => {
      const mentions = manager.parseMentions('Hello @"John Doe"!');
      expect(mentions).toEqual(['John Doe']);
    });

    it('should handle mixed mentions', () => {
      const mentions = manager.parseMentions('@alice and @"Bob Smith" and @charlie');
      expect(mentions).toEqual(['alice', 'Bob Smith', 'charlie']);
    });

    it('should not include duplicates', () => {
      const mentions = manager.parseMentions('@john said hi to @john');
      expect(mentions).toEqual(['john']);
    });

    it('should return empty array for text without mentions', () => {
      const mentions = manager.parseMentions('No mentions here');
      expect(mentions).toEqual([]);
    });

    it('should handle email-like text without false positives', () => {
      // The @ in email addresses won't match our pattern
      const mentions = manager.parseMentions('Email me at test@example.com');
      expect(mentions).toEqual([]);
    });

    it('should use user registry to resolve mentions', () => {
      manager.setUserRegistry(
        new Map([
          ['John', 'user-1'],
          ['Jane', 'user-2'],
        ])
      );

      const mentions = manager.parseMentions('Hello @John and @Jane!');
      expect(mentions).toEqual(['user-1', 'user-2']);
    });

    it('should handle mentions with hyphens and underscores', () => {
      const mentions = manager.parseMentions('@john-doe and @jane_smith');
      expect(mentions).toEqual(['john-doe', 'jane_smith']);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      manager.addEventListener(listener);
      manager.addComment(cellAddress1, author1, 'Test');
      expect(listener).toHaveBeenCalledTimes(1);

      manager.removeEventListener(listener);
      manager.addComment(cellAddress2, author2, 'Test 2');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle errors in listeners gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = vi.fn();

      manager.addEventListener(errorListener);
      manager.addEventListener(normalListener);

      expect(() => manager.addComment(cellAddress1, author1, 'Test')).not.toThrow();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const comment = manager.addComment(cellAddress1, author1, 'Test');
      manager.addReply(comment.id, author2, 'Reply');

      const json = manager.toJSON();

      expect(json.version).toBe(1);
      expect(json.comments).toHaveLength(1);
      expect(json.comments[0].text).toBe('Test');
      expect(json.comments[0].replies).toHaveLength(1);
    });

    it('should load from JSON', () => {
      const comment = manager.addComment(cellAddress1, author1, 'Test');
      manager.addReply(comment.id, author2, 'Reply');

      const json = manager.toJSON();

      const newManager = new CommentManager();
      newManager.fromJSON(json);

      expect(newManager.getCommentCount()).toBe(1);
      const loadedComment = newManager.getComment(comment.id);
      expect(loadedComment?.text).toBe('Test');
      expect(loadedComment?.replies).toHaveLength(1);
    });

    it('should clear existing comments when loading from JSON', () => {
      manager.addComment(cellAddress1, author1, 'Existing');

      const data: SerializedComments = {
        version: 1,
        comments: [
          {
            id: 'new-id',
            cellAddress: cellAddress2,
            author: author2,
            text: 'New comment',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            resolved: false,
            replies: [],
            mentions: [],
          },
        ],
      };

      manager.fromJSON(data);

      expect(manager.getCommentCount()).toBe(1);
      expect(manager.getComment('new-id')?.text).toBe('New comment');
    });

    it('should rebuild indexes when loading from JSON', () => {
      const data: SerializedComments = {
        version: 1,
        comments: [
          {
            id: 'c1',
            cellAddress: cellAddress1,
            author: author1,
            text: 'Comment 1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            resolved: false,
            replies: [],
            mentions: [],
          },
          {
            id: 'c2',
            cellAddress: cellAddress1,
            author: author2,
            text: 'Comment 2',
            createdAt: Date.now() + 1,
            updatedAt: Date.now() + 1,
            resolved: false,
            replies: [],
            mentions: [],
          },
        ],
      };

      manager.fromJSON(data);

      const cellComments = manager.getCommentsForCell(cellAddress1);
      expect(cellComments).toHaveLength(2);

      const sheetComments = manager.getCommentsForSheet('Sheet1');
      expect(sheetComments).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should remove all comments', () => {
      manager.addComment(cellAddress1, author1, 'Comment 1');
      manager.addComment(cellAddress2, author2, 'Comment 2');

      manager.clear();

      expect(manager.getCommentCount()).toBe(0);
      expect(manager.getAllComments()).toHaveLength(0);
    });

    it('should emit commentDeleted events', () => {
      const c1 = manager.addComment(cellAddress1, author1, 'Comment 1');
      const c2 = manager.addComment(cellAddress2, author2, 'Comment 2');

      const listener = vi.fn();
      manager.addEventListener(listener);

      manager.clear();

      expect(listener).toHaveBeenCalledTimes(2);
      const deletedIds = listener.mock.calls.map(
        (call) => (call[0] as CommentManagerEvent & { commentId: string }).commentId
      );
      expect(deletedIds).toContain(c1.id);
      expect(deletedIds).toContain(c2.id);
    });

    it('should clear indexes', () => {
      manager.addComment(cellAddress1, author1, 'Comment');
      manager.clear();

      expect(manager.cellHasComments(cellAddress1)).toBe(false);
    });
  });

  describe('clearSheet', () => {
    beforeEach(() => {
      manager.addComment(cellAddress1, author1, 'Sheet1 Comment 1');
      manager.addComment(cellAddress2, author2, 'Sheet1 Comment 2');
      manager.addComment(cellAddress3, author1, 'Sheet2 Comment');
    });

    it('should remove only comments from the specified sheet', () => {
      manager.clearSheet('Sheet1');

      expect(manager.getCommentCount()).toBe(1);
      expect(manager.getCommentsForSheet('Sheet1')).toHaveLength(0);
      expect(manager.getCommentsForSheet('Sheet2')).toHaveLength(1);
    });

    it('should do nothing for non-existent sheet', () => {
      manager.clearSheet('Sheet99');
      expect(manager.getCommentCount()).toBe(3);
    });
  });

  describe('createCommentManager factory', () => {
    it('should create a CommentManager instance', () => {
      const newManager = createCommentManager();
      expect(newManager).toBeInstanceOf(CommentManager);
    });

    it('should accept configuration options', () => {
      let counter = 0;
      const newManager = createCommentManager({
        generateId: () => `custom-${++counter}`,
      });

      const comment = newManager.addComment(cellAddress1, author1, 'Test');
      expect(comment.id).toBe('custom-1');
    });
  });

  describe('default ID generation', () => {
    it('should generate unique IDs without custom generator', () => {
      const newManager = createCommentManager();

      const c1 = newManager.addComment(cellAddress1, author1, 'Test 1');
      const c2 = newManager.addComment(cellAddress2, author2, 'Test 2');

      expect(c1.id).toBeTruthy();
      expect(c2.id).toBeTruthy();
      expect(c1.id).not.toBe(c2.id);
    });
  });
});
