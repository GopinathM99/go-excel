import { memo, useCallback, useRef, useState } from 'react';
import { MentionInput, MentionInputRef } from './MentionInput';
import type { MentionUser } from '../../hooks/useComments';

interface CommentInputProps {
  /** Initial value (for editing) */
  initialValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Callback to search users for @mentions */
  onSearchUsers: (query: string) => MentionUser[];
  /** Callback when comment is submitted */
  onSubmit: (text: string) => void;
  /** Callback when input is cancelled */
  onCancel?: () => void;
  /** Whether to show cancel button */
  showCancel?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Whether this is for a reply */
  isReply?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Maximum character count (optional) */
  maxLength?: number;
}

/**
 * Comment input component with @mention support.
 * - Textarea for entering comment text
 * - @ triggers mention autocomplete
 * - Submit button (or Enter key)
 * - Cancel button (optional)
 * - Character count (optional)
 */
export const CommentInput = memo(function CommentInput({
  initialValue = '',
  placeholder = 'Add a comment...',
  onSearchUsers,
  onSubmit,
  onCancel,
  showCancel = true,
  submitLabel = 'Comment',
  isReply = false,
  autoFocus = false,
  isSubmitting = false,
  maxLength,
}: CommentInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<MentionInputRef>(null);

  const trimmedValue = value.trim();
  const isEmpty = trimmedValue.length === 0;
  const isOverLimit = maxLength ? trimmedValue.length > maxLength : false;
  const canSubmit = !isEmpty && !isOverLimit && !isSubmitting;

  /**
   * Handle value change
   */
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  /**
   * Handle submit
   */
  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(trimmedValue);
    setValue('');
  }, [canSubmit, trimmedValue, onSubmit]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    setValue('');
    onCancel?.();
  }, [onCancel]);

  /**
   * Handle button click for submit
   */
  const handleSubmitClick = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="comment-input">
      <div className="comment-input-wrapper">
        <MentionInput
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onSearchUsers={onSearchUsers}
          placeholder={placeholder}
          disabled={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          minHeight={isReply ? 48 : 60}
          maxHeight={150}
          autoFocus={autoFocus}
        />
      </div>

      <div className="comment-input-footer">
        <div className="comment-input-hint">
          <span className="comment-kbd">@</span> to mention
          {!isReply && (
            <>
              {' '}
              | <span className="comment-kbd">Shift+F2</span> add comment
            </>
          )}
        </div>

        <div className="comment-input-actions">
          {/* Character count */}
          {maxLength && (
            <span
              className={`comment-input-char-count ${isOverLimit ? 'over-limit' : ''}`}
              style={{
                color: isOverLimit
                  ? 'var(--color-error)'
                  : 'var(--color-text-muted)',
                fontSize: '11px',
                marginRight: '8px',
              }}
            >
              {trimmedValue.length}/{maxLength}
            </span>
          )}

          {/* Cancel button */}
          {showCancel && (
            <button
              type="button"
              className="comment-input-btn"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}

          {/* Submit button */}
          <button
            type="button"
            className="comment-input-btn primary"
            onClick={handleSubmitClick}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Sending...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CommentInput;
