import { useCallback, useState, useRef, useEffect } from 'react';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import { MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } from '@excel/shared';
import './ColumnResizer.css';

// Module-level canvas for text measurement (created once and reused)
let measureCanvas: HTMLCanvasElement | null = null;
function getMeasureContext(): CanvasRenderingContext2D | null {
  measureCanvas ??= document.createElement('canvas');
  return measureCanvas.getContext('2d');
}

interface ColumnResizerProps {
  col: number;
  x: number;
}

export function ColumnResizer({ col, x }: ColumnResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { getColumnWidth, setColumnWidth, cells, getCellStyle } = useSpreadsheetStore();

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
        MIN_COLUMN_WIDTH as number,
        Math.min(MAX_COLUMN_WIDTH as number, startWidth.current + delta)
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

      const ctx = getMeasureContext();
      if (!ctx) {
        setColumnWidth(col, 100);
        return;
      }

      const baseFontFamily =
        getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim() ||
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const baseFontSize = '13px';
      const cellPadding = 8; // 4px left + 4px right
      const borderWidth = 1;

      let maxWidth = 0;

      // Scan all cells in this column and measure their text width
      for (const [key, cellData] of cells.entries()) {
        const parts = key.split(',');
        const cellCol = Number(parts[1]);
        if (cellCol !== col) continue;

        const value = cellData.value;
        if (!value) continue;

        const cellRow = Number(parts[0]);
        const style = getCellStyle(cellRow, cellCol);

        // Build font string matching cell styles (bold/italic affect width)
        let fontStyle = 'normal';
        let fontWeight = 'normal';
        if (style?.italic) fontStyle = 'italic';
        if (style?.bold) fontWeight = 'bold';

        ctx.font = `${fontStyle} ${fontWeight} ${baseFontSize} ${baseFontFamily}`;
        const textWidth = ctx.measureText(value).width;
        if (textWidth > maxWidth) {
          maxWidth = textWidth;
        }
      }

      // Calculate final width: content + padding + border + small buffer
      const autoWidth =
        maxWidth > 0
          ? Math.ceil(maxWidth) + cellPadding + borderWidth + 2 // +2 for safety buffer
          : 100; // Default if no content

      const clampedWidth = Math.max(
        MIN_COLUMN_WIDTH as number,
        Math.min(MAX_COLUMN_WIDTH as number, autoWidth)
      );
      setColumnWidth(col, clampedWidth);
    },
    [col, cells, getCellStyle, setColumnWidth]
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
