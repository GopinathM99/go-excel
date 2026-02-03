import { useRef, useEffect, useCallback } from 'react';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import './CellEditor.css';

interface CellEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CellEditor({ x, y, width, height }: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { editValue, updateEditValue, commitEdit, cancelEdit, selectedCell } =
    useSpreadsheetStore();

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          commitEdit();
          break;
        case 'Tab':
          e.preventDefault();
          commitEdit();
          break;
        case 'Escape':
          e.preventDefault();
          cancelEdit();
          break;
      }
    },
    [commitEdit, cancelEdit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateEditValue(e.target.value);
    },
    [updateEditValue]
  );

  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  return (
    <div
      className="cell-editor"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: Math.max(width, 100),
        minHeight: height,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        className="cell-editor-input"
        value={editValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}
