import { useCallback, useState, useRef, useEffect } from 'react';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import { MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } from '@excel/shared';
import './ColumnResizer.css';

interface ColumnResizerProps {
  col: number;
  x: number;
}

export function ColumnResizer({ col, x }: ColumnResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { getColumnWidth, setColumnWidth } = useSpreadsheetStore();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      startX.current = e.clientX;
      startWidth.current = getColumnWidth(col);
    },
    [col, getColumnWidth]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      const newWidth = Math.max(
        MIN_COLUMN_WIDTH,
        Math.min(MAX_COLUMN_WIDTH, startWidth.current + delta)
      );
      setColumnWidth(col, newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, col, setColumnWidth]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Auto-fit column (for now just reset to default)
      // In a full implementation, this would measure cell contents
      setColumnWidth(col, 100);
    },
    [col, setColumnWidth]
  );

  return (
    <div
      className={`column-resizer ${isDragging ? 'dragging' : ''}`}
      style={{ left: x - 3 }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  );
}
