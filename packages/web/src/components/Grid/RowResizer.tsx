import { useCallback, useState, useRef, useEffect } from 'react';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import { MIN_ROW_HEIGHT, MAX_ROW_HEIGHT } from '@excel/shared';
import './RowResizer.css';

interface RowResizerProps {
  row: number;
  y: number;
}

export function RowResizer({ row, y }: RowResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const { getRowHeight, setRowHeight } = useSpreadsheetStore();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      startY.current = e.clientY;
      startHeight.current = getRowHeight(row);
    },
    [row, getRowHeight]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY.current;
      const newHeight = Math.max(
        MIN_ROW_HEIGHT,
        Math.min(MAX_ROW_HEIGHT, startHeight.current + delta)
      );
      setRowHeight(row, newHeight);
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
  }, [isDragging, row, setRowHeight]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Auto-fit row (for now just reset to default)
      setRowHeight(row, 24);
    },
    [row, setRowHeight]
  );

  return (
    <div
      className={`row-resizer ${isDragging ? 'dragging' : ''}`}
      style={{ top: y - 3 }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  );
}
