import { useCallback, useEffect, useRef, useState } from 'react';
import { useValidationDropdownStore } from '../../hooks/useValidation';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import './ValidationDropdown.css';

/**
 * Props for the ValidationDropdown component
 */
interface ValidationDropdownProps {
  onSelect?: (value: string) => void;
}

/**
 * In-cell dropdown for list validation
 * Appears when a cell with list validation is selected/edited
 */
export function ValidationDropdown({ onSelect }: ValidationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const {
    isOpen,
    cellPosition,
    values,
    selectedIndex,
    anchorRect,
    closeDropdown,
    setSelectedIndex,
    selectNext,
    selectPrevious,
  } = useValidationDropdownStore();

  const { setCellValue } = useSpreadsheetStore();

  // Handle selection
  const handleSelect = useCallback((value: string) => {
    if (cellPosition) {
      setCellValue(cellPosition.row, cellPosition.col, value);
      onSelect?.(value);
    }
    closeDropdown();
  }, [cellPosition, setCellValue, closeDropdown, onSelect]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < values.length) {
            handleSelect(values[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeDropdown();
          break;
        case 'Tab':
          closeDropdown();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, values, selectNext, selectPrevious, handleSelect, closeDropdown]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current || selectedIndex < 0) return;

    const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, selectedIndex]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };

    // Use setTimeout to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  if (!isOpen || !anchorRect) {
    return null;
  }

  // Position the dropdown below the cell
  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom,
    left: anchorRect.left,
    minWidth: anchorRect.width,
    maxWidth: Math.max(anchorRect.width, 200),
  };

  return (
    <div
      ref={dropdownRef}
      className="validation-dropdown"
      style={dropdownStyle}
      role="listbox"
      aria-label="Select a value"
    >
      <ul ref={listRef} className="validation-dropdown-list">
        {values.map((value, index) => (
          <li
            key={`${value}-${index}`}
            className={`validation-dropdown-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => handleSelect(value)}
            onMouseEnter={() => setSelectedIndex(index)}
            role="option"
            aria-selected={index === selectedIndex}
          >
            {value}
          </li>
        ))}
        {values.length === 0 && (
          <li className="validation-dropdown-empty">No items</li>
        )}
      </ul>
    </div>
  );
}

/**
 * Dropdown trigger button that appears in cells with list validation
 */
interface DropdownTriggerProps {
  row: number;
  col: number;
  values: string[];
  cellRect: DOMRect;
}

export function ValidationDropdownTrigger({ row, col, values, cellRect }: DropdownTriggerProps) {
  const { openDropdown, isOpen, cellPosition } = useValidationDropdownStore();

  const isCurrentDropdownOpen = isOpen && cellPosition?.row === row && cellPosition?.col === col;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isCurrentDropdownOpen) {
      useValidationDropdownStore.getState().closeDropdown();
    } else {
      openDropdown({ row, col }, values, cellRect);
    }
  }, [row, col, values, cellRect, isCurrentDropdownOpen, openDropdown]);

  return (
    <button
      className={`validation-dropdown-trigger ${isCurrentDropdownOpen ? 'active' : ''}`}
      onClick={handleClick}
      aria-haspopup="listbox"
      aria-expanded={isCurrentDropdownOpen}
      aria-label="Show dropdown"
      type="button"
    >
      <span className="validation-dropdown-arrow">&#9660;</span>
    </button>
  );
}

export default ValidationDropdown;
