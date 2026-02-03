import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { MentionUser } from '../../hooks/useComments';

interface MentionInputProps {
  /** Current value of the input */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback to filter/search users for mentions */
  onSearchUsers: (query: string) => MentionUser[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Callback when Enter is pressed (without Shift) */
  onSubmit?: () => void;
  /** Callback when Escape is pressed */
  onCancel?: () => void;
  /** Minimum height of textarea */
  minHeight?: number;
  /** Maximum height of textarea */
  maxHeight?: number;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  getValue: () => string;
}

/**
 * Textarea input with @mention autocomplete support.
 * - Detects @ character to trigger mention dropdown
 * - Filters users as user types
 * - Keyboard navigation (up/down/enter/escape)
 * - Inserts mention with @ prefix
 */
export const MentionInput = memo(
  forwardRef<MentionInputRef, MentionInputProps>(function MentionInput(
    {
      value,
      onChange,
      onSearchUsers,
      placeholder = 'Add a comment...',
      disabled = false,
      onSubmit,
      onCancel,
      minHeight = 60,
      maxHeight = 150,
      autoFocus = false,
    },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Mention state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
    const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const isShowingMentions = mentionQuery !== null && mentionUsers.length > 0;

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      getValue: () => value,
    }));

    // Auto focus
    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [autoFocus]);

    // Update mention users when query changes
    useEffect(() => {
      if (mentionQuery !== null) {
        const users = onSearchUsers(mentionQuery);
        setMentionUsers(users);
        setSelectedIndex(0);
      } else {
        setMentionUsers([]);
      }
    }, [mentionQuery, onSearchUsers]);

    /**
     * Detect @ mentions while typing
     */
    const detectMention = useCallback((text: string, cursorPos: number) => {
      // Look backwards from cursor to find @
      let start = cursorPos - 1;
      while (start >= 0) {
        const char = text[start];
        // Stop at whitespace or start of string
        if (char === ' ' || char === '\n' || char === '\t') {
          break;
        }
        // Found @ - check if it's at start or after whitespace
        if (char === '@') {
          if (start === 0 || /\s/.test(text[start - 1])) {
            const query = text.substring(start + 1, cursorPos);
            return { start, query };
          }
          break;
        }
        start--;
      }
      return null;
    }, []);

    /**
     * Handle input change
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;

        onChange(newValue);

        // Check for mention trigger
        const mention = detectMention(newValue, cursorPos);
        if (mention) {
          setMentionQuery(mention.query);
          setMentionStartIndex(mention.start);
        } else {
          setMentionQuery(null);
          setMentionStartIndex(-1);
        }
      },
      [onChange, detectMention]
    );

    /**
     * Insert a mention into the text
     */
    const insertMention = useCallback(
      (user: MentionUser) => {
        if (mentionStartIndex < 0) return;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const beforeMention = value.substring(0, mentionStartIndex);
        const afterMention = value.substring(cursorPos);

        // Insert mention with space after
        const mentionText = user.name.includes(' ')
          ? `@"${user.name}" `
          : `@${user.name} `;
        const newValue = beforeMention + mentionText + afterMention;

        onChange(newValue);

        // Clear mention state
        setMentionQuery(null);
        setMentionStartIndex(-1);

        // Move cursor after mention
        const newCursorPos = mentionStartIndex + mentionText.length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        });
      },
      [value, onChange, mentionStartIndex]
    );

    /**
     * Handle keyboard events
     */
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // When mention dropdown is open
        if (isShowingMentions) {
          switch (e.key) {
            case 'ArrowUp':
              e.preventDefault();
              setSelectedIndex((prev) =>
                prev > 0 ? prev - 1 : mentionUsers.length - 1
              );
              return;

            case 'ArrowDown':
              e.preventDefault();
              setSelectedIndex((prev) =>
                prev < mentionUsers.length - 1 ? prev + 1 : 0
              );
              return;

            case 'Enter':
            case 'Tab':
              e.preventDefault();
              if (mentionUsers[selectedIndex]) {
                insertMention(mentionUsers[selectedIndex]);
              }
              return;

            case 'Escape':
              e.preventDefault();
              setMentionQuery(null);
              setMentionStartIndex(-1);
              return;
          }
        }

        // Normal keyboard handling
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSubmit?.();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel?.();
        }
      },
      [
        isShowingMentions,
        mentionUsers,
        selectedIndex,
        insertMention,
        onSubmit,
        onCancel,
      ]
    );

    /**
     * Handle clicking on a mention user
     */
    const handleMentionClick = useCallback(
      (user: MentionUser) => {
        insertMention(user);
      },
      [insertMention]
    );

    /**
     * Handle blur - close mentions with delay for click handling
     */
    const handleBlur = useCallback((e: React.FocusEvent) => {
      // Check if focus is moving to the dropdown
      if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      // Delay closing to allow click events to fire
      setTimeout(() => {
        setMentionQuery(null);
        setMentionStartIndex(-1);
      }, 150);
    }, []);

    return (
      <div className="mention-input-container">
        {/* Mention dropdown */}
        {isShowingMentions && (
          <div
            ref={dropdownRef}
            className="mention-dropdown"
            role="listbox"
            aria-label="Mention suggestions"
          >
            {mentionUsers.map((user, index) => (
              <div
                key={user.id}
                className={`mention-dropdown-item ${index === selectedIndex ? 'selected' : ''}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleMentionClick(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div
                  className="comment-avatar small"
                  style={{
                    backgroundColor: user.avatar ? 'transparent' : undefined,
                  }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <div className="mention-user-info">
                  <div className="mention-user-name">{user.name}</div>
                  {user.email && (
                    <div className="mention-user-email">{user.email}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="comment-input-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
          }}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={isShowingMentions ? 'mention-suggestions' : undefined}
          aria-activedescendant={
            isShowingMentions && mentionUsers[selectedIndex]
              ? `mention-${mentionUsers[selectedIndex].id}`
              : undefined
          }
        />
      </div>
    );
  })
);

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

export default MentionInput;
