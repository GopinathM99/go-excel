import { memo, useCallback, useRef, useEffect } from 'react';
import { useFilterStore } from '../../hooks/useFilter';
import './FilterDropdown.css';

interface FilterDropdownProps {
  column: number;
  hasActiveFilter: boolean;
}

/**
 * Dropdown arrow button that appears in header cells when auto-filter is enabled
 */
export const FilterDropdown = memo(function FilterDropdown({
  column,
  hasActiveFilter,
}: FilterDropdownProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { openMenuColumn, setOpenMenuColumn } = useFilterStore();

  const isOpen = openMenuColumn === column;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (isOpen) {
        setOpenMenuColumn(null);
      } else {
        setOpenMenuColumn(column);
      }
    },
    [column, isOpen, setOpenMenuColumn]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          setOpenMenuColumn(null);
        } else {
          setOpenMenuColumn(column);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpenMenuColumn(null);
      }
    },
    [column, isOpen, setOpenMenuColumn]
  );

  // Focus management
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Keep focus on button when menu opens
    }
  }, [isOpen]);

  return (
    <button
      ref={buttonRef}
      className={`filter-dropdown-button ${hasActiveFilter ? 'active' : ''} ${isOpen ? 'open' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Filter column ${String(column + 1)}${hasActiveFilter ? ' (filtered)' : ''}`}
      aria-haspopup="true"
      aria-expanded={isOpen}
      tabIndex={0}
      title={hasActiveFilter ? 'Column has active filter' : 'Click to filter'}
    >
      <svg
        className="filter-dropdown-icon"
        viewBox="0 0 12 12"
        width="12"
        height="12"
        aria-hidden="true"
      >
        {hasActiveFilter ? (
          // Funnel icon for active filter
          <path
            d="M1 2h10L7 6v4l-2 1V6L1 2z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        ) : (
          // Down arrow for inactive filter
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
});
