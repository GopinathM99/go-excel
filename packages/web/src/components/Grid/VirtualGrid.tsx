import React, { useRef, useCallback, useState, useEffect, useMemo, memo } from 'react';
import { useSpreadsheetStore, type CellStyle } from '../../store/spreadsheet';
import { DEFAULT_ROW_HEIGHT, VIRTUALIZATION_BUFFER } from '@excel/shared';
import { columnIndexToLabel } from '@excel/core';
import { CellEditor } from './CellEditor';
import { SelectionOverlay } from './SelectionOverlay';
import { ColumnResizer } from './ColumnResizer';
import { RowResizer } from './RowResizer';
import { detectAndFill } from '../../utils/autoFill';
import './VirtualGrid.css';

interface VisibleRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface CellProps {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  isSelected: boolean;
  cellStyle?: CellStyle;
  onClick: (row: number, col: number, event: React.MouseEvent) => void;
  onDoubleClick: (row: number, col: number) => void;
}

const GridCell = memo(function GridCell({
  row,
  col,
  x,
  y,
  width,
  height,
  value,
  isSelected,
  cellStyle,
  onClick,
  onDoubleClick,
}: CellProps) {
  return (
    <div
      className={`grid-cell ${isSelected ? 'selected' : ''}`}
      style={{
        transform: `translate(${String(x)}px, ${String(y)}px)`,
        width,
        height,
        fontWeight: cellStyle?.bold ? 'bold' : undefined,
        fontStyle: cellStyle?.italic ? 'italic' : undefined,
        textDecoration: cellStyle?.underline ? 'underline' : undefined,
      }}
      onClick={(e) => onClick(row, col, e)}
      onDoubleClick={() => onDoubleClick(row, col)}
      data-row={row}
      data-col={col}
    >
      <span className="cell-content">{value}</span>
    </div>
  );
});

export function VirtualGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Drag selection state (refs to avoid re-renders during drag)
  const isDraggingRef = useRef(false);
  const dragStartCellRef = useRef<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false); // only for CSS class toggle

  const {
    rowCount,
    columnCount,
    columnWidths: _columnWidths,
    rowHeights: _rowHeights,
    getColumnWidth,
    getRowHeight,
    cells: _cellData,
    getCellValue,
    selectedCell,
    setSelectedCell,
    selectionRange,
    setSelectionRange,
    editingCell,
    startEditing,
    updateEditValue,
    frozenRows: _frozenRows,
    frozenCols: _frozenCols,
    getCellStyle,
  } = useSpreadsheetStore();

  // Precompute column positions for efficient lookup
  const columnPositions = useMemo(() => {
    const positions: number[] = [0];
    let pos = 0;
    for (let i = 0; i < columnCount; i++) {
      pos += getColumnWidth(i);
      positions.push(pos);
    }
    return positions;
  }, [columnCount, getColumnWidth]);

  // Precompute row positions for efficient lookup
  const rowPositions = useMemo(() => {
    const positions: number[] = [0];
    let pos = 0;
    for (let i = 0; i < rowCount; i++) {
      pos += getRowHeight(i);
      positions.push(pos);
    }
    return positions;
  }, [rowCount, getRowHeight]);

  const totalWidth = columnPositions[columnCount] ?? 0;
  const totalHeight = rowPositions[rowCount] ?? 0;

  // Binary search for finding row/col from position
  const findRowAtPosition = useCallback(
    (y: number): number => {
      let low = 0;
      let high = rowCount - 1;
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        if ((rowPositions[mid] ?? 0) <= y) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }
      return low;
    },
    [rowCount, rowPositions]
  );

  const findColAtPosition = useCallback(
    (x: number): number => {
      let low = 0;
      let high = columnCount - 1;
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        if ((columnPositions[mid] ?? 0) <= x) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }
      return low;
    },
    [columnCount, columnPositions]
  );

  // Calculate visible range using binary search
  const visibleRange = useMemo((): VisibleRange => {
    const buffer = VIRTUALIZATION_BUFFER as number;
    const startRow = Math.max(0, findRowAtPosition(scrollTop) - buffer);
    const endRow = Math.min(
      rowCount,
      findRowAtPosition(scrollTop + containerSize.height) + buffer + 1
    );

    const startCol = Math.max(0, findColAtPosition(scrollLeft) - buffer);
    const endCol = Math.min(
      columnCount,
      findColAtPosition(scrollLeft + containerSize.width) + buffer + 1
    );

    return { startRow, endRow, startCol, endCol };
  }, [
    scrollTop,
    scrollLeft,
    containerSize,
    rowCount,
    columnCount,
    findRowAtPosition,
    findColAtPosition,
  ]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll with RAF for smooth scrolling
  const scrollRAF = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;

    if (scrollRAF.current !== null) {
      cancelAnimationFrame(scrollRAF.current);
    }

    scrollRAF.current = requestAnimationFrame(() => {
      setScrollTop(target.scrollTop);
      setScrollLeft(target.scrollLeft);
      scrollRAF.current = null;
    });
  }, []);

  // Handle cell click
  const handleCellClick = useCallback(
    (row: number, col: number, event: React.MouseEvent) => {
      if (event.shiftKey && selectedCell) {
        // Range selection
        setSelectionRange({
          start: selectedCell,
          end: { row, col },
        });
      } else {
        setSelectedCell({ row, col });
      }
    },
    [selectedCell, setSelectedCell, setSelectionRange]
  );

  // Handle double click to edit
  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      startEditing(row, col, 'doubleclick');
    },
    [startEditing]
  );

  // Convert mouse event to grid cell coordinates
  const getCellFromMouseEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): { row: number; col: number } | null => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return null;

      const rect = scrollContainer.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollContainer.scrollLeft;
      const y = e.clientY - rect.top + scrollContainer.scrollTop;

      // Clamp to valid bounds
      const row = Math.max(0, Math.min(rowCount - 1, findRowAtPosition(y)));
      const col = Math.max(0, Math.min(columnCount - 1, findColAtPosition(x)));

      return { row, col };
    },
    [rowCount, columnCount, findRowAtPosition, findColAtPosition]
  );

  // ---- Auto-fill drag state ----
  const isFillDragging = useRef(false);
  const fillSelectionBounds = useRef<{
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
  } | null>(null);
  const [fillPreview, setFillPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  // Track the current fill target for use in mouseup
  const fillTargetRef = useRef<{
    direction: 'down' | 'up' | 'right' | 'left';
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
  } | null>(null);

  // Fill drag start: triggered from the fill handle in SelectionOverlay
  const handleFillDragStart = useCallback(
    (_e: React.MouseEvent) => {
      // Compute selection bounds
      const startCell = selectionRange?.start ?? selectedCell;
      const endCell = selectionRange?.end ?? selectedCell;
      if (!startCell || !endCell) return;

      const minRow = Math.min(startCell.row, endCell.row);
      const maxRow = Math.max(startCell.row, endCell.row);
      const minCol = Math.min(startCell.col, endCell.col);
      const maxCol = Math.max(startCell.col, endCell.col);

      isFillDragging.current = true;
      fillSelectionBounds.current = { minRow, maxRow, minCol, maxCol };
      fillTargetRef.current = null;
    },
    [selectedCell, selectionRange]
  );

  // Attach fill drag mousemove / mouseup to window
  useEffect(() => {
    const handleFillMouseMove = (e: MouseEvent) => {
      if (!isFillDragging.current || !fillSelectionBounds.current) return;

      const cell = getCellFromMouseEvent(e);
      if (!cell) return;

      const { minRow, maxRow, minCol, maxCol } = fillSelectionBounds.current;

      // Determine which direction the user is dragging based on the cell position
      const rowDelta =
        cell.row > maxRow ? cell.row - maxRow : cell.row < minRow ? minRow - cell.row : 0;
      const colDelta =
        cell.col > maxCol ? cell.col - maxCol : cell.col < minCol ? minCol - cell.col : 0;

      // If mouse is still within the selection bounds, clear preview
      if (rowDelta === 0 && colDelta === 0) {
        setFillPreview(null);
        fillTargetRef.current = null;
        return;
      }

      // Pick the dominant direction
      let direction: 'down' | 'up' | 'right' | 'left';
      let targetMinRow: number, targetMaxRow: number, targetMinCol: number, targetMaxCol: number;

      if (rowDelta >= colDelta) {
        // Vertical fill
        if (cell.row > maxRow) {
          direction = 'down';
          targetMinRow = maxRow + 1;
          targetMaxRow = cell.row;
          targetMinCol = minCol;
          targetMaxCol = maxCol;
        } else {
          direction = 'up';
          targetMinRow = cell.row;
          targetMaxRow = minRow - 1;
          targetMinCol = minCol;
          targetMaxCol = maxCol;
        }
      } else {
        // Horizontal fill
        if (cell.col > maxCol) {
          direction = 'right';
          targetMinRow = minRow;
          targetMaxRow = maxRow;
          targetMinCol = maxCol + 1;
          targetMaxCol = cell.col;
        } else {
          direction = 'left';
          targetMinRow = minRow;
          targetMaxRow = maxRow;
          targetMinCol = cell.col;
          targetMaxCol = minCol - 1;
        }
      }

      // Clamp to valid grid bounds
      targetMinRow = Math.max(0, targetMinRow);
      targetMaxRow = Math.min(rowCount - 1, targetMaxRow);
      targetMinCol = Math.max(0, targetMinCol);
      targetMaxCol = Math.min(columnCount - 1, targetMaxCol);

      if (targetMinRow > targetMaxRow || targetMinCol > targetMaxCol) {
        setFillPreview(null);
        fillTargetRef.current = null;
        return;
      }

      const previewX = columnPositions[targetMinCol] ?? 0;
      const previewY = rowPositions[targetMinRow] ?? 0;
      const previewW = (columnPositions[targetMaxCol + 1] ?? 0) - previewX;
      const previewH = (rowPositions[targetMaxRow + 1] ?? 0) - previewY;

      setFillPreview({ x: previewX, y: previewY, width: previewW, height: previewH });
      fillTargetRef.current = {
        direction,
        minRow: targetMinRow,
        maxRow: targetMaxRow,
        minCol: targetMinCol,
        maxCol: targetMaxCol,
      };
    };

    const handleFillMouseUp = () => {
      if (!isFillDragging.current) return;

      const bounds = fillSelectionBounds.current;
      const target = fillTargetRef.current;

      isFillDragging.current = false;
      fillSelectionBounds.current = null;
      setFillPreview(null);

      if (!bounds || !target) {
        fillTargetRef.current = null;
        return;
      }

      const store = useSpreadsheetStore.getState();
      const updates: { row: number; col: number; value: string }[] = [];

      if (target.direction === 'down' || target.direction === 'up') {
        // For each column in the selection, gather source values and fill
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
          const sourceValues: string[] = [];
          if (target.direction === 'down') {
            for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
              sourceValues.push(store.getCellValue(r, col));
            }
            const fillCount = target.maxRow - target.minRow + 1;
            const filled = detectAndFill(sourceValues, fillCount);
            for (let i = 0; i < filled.length; i++) {
              updates.push({ row: target.minRow + i, col, value: filled[i] ?? '' });
            }
          } else {
            // Filling upward: source values read top-to-bottom, then reverse to continue upward
            for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
              sourceValues.push(store.getCellValue(r, col));
            }
            // Reverse source so the pattern continues upward from the top of the selection
            sourceValues.reverse();
            const fillCount = target.maxRow - target.minRow + 1;
            const filled = detectAndFill(sourceValues, fillCount);
            // Place values from bottom to top of the target area
            for (let i = 0; i < filled.length; i++) {
              updates.push({ row: target.maxRow - i, col, value: filled[i] ?? '' });
            }
          }
        }
      } else {
        // Horizontal fill (right or left)
        for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
          const sourceValues: string[] = [];
          if (target.direction === 'right') {
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
              sourceValues.push(store.getCellValue(row, c));
            }
            const fillCount = target.maxCol - target.minCol + 1;
            const filled = detectAndFill(sourceValues, fillCount);
            for (let i = 0; i < filled.length; i++) {
              updates.push({ row, col: target.minCol + i, value: filled[i] ?? '' });
            }
          } else {
            // Filling leftward
            for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
              sourceValues.push(store.getCellValue(row, c));
            }
            sourceValues.reverse();
            const fillCount = target.maxCol - target.minCol + 1;
            const filled = detectAndFill(sourceValues, fillCount);
            for (let i = 0; i < filled.length; i++) {
              updates.push({ row, col: target.maxCol - i, value: filled[i] ?? '' });
            }
          }
        }
      }

      if (updates.length > 0) {
        store.setCellValues(updates);

        // Expand selection range to include the filled cells
        const newMinRow = Math.min(bounds.minRow, target.minRow);
        const newMaxRow = Math.max(bounds.maxRow, target.maxRow);
        const newMinCol = Math.min(bounds.minCol, target.minCol);
        const newMaxCol = Math.max(bounds.maxCol, target.maxCol);

        store.setSelectionRange({
          start: { row: newMinRow, col: newMinCol },
          end: { row: newMaxRow, col: newMaxCol },
        });
      }

      fillTargetRef.current = null;
    };

    window.addEventListener('mousemove', handleFillMouseMove);
    window.addEventListener('mouseup', handleFillMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleFillMouseMove);
      window.removeEventListener('mouseup', handleFillMouseUp);
    };
  }, [getCellFromMouseEvent, rowCount, columnCount, columnPositions, rowPositions]);

  // Handle mousedown on grid-scroll-container for drag selection
  const handleGridMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't interfere with the fill-handle (used by fill/autofill feature)
      const target = e.target as HTMLElement;
      if (target.classList.contains('fill-handle')) return;

      // Only handle left mouse button
      if (e.button !== 0) return;

      // Don't start drag if we're editing
      if (editingCell) return;

      const cell = getCellFromMouseEvent(e);
      if (!cell) return;

      // Handle shift+click for range selection (keep existing behavior)
      if (e.shiftKey && selectedCell) {
        setSelectionRange({
          start: selectedCell,
          end: cell,
        });
        return;
      }

      // Start drag tracking
      isDraggingRef.current = true;
      dragStartCellRef.current = cell;
      setIsDragging(true);

      // Set the clicked cell as selected immediately
      setSelectedCell(cell);
    },
    [editingCell, selectedCell, getCellFromMouseEvent, setSelectedCell, setSelectionRange]
  );

  // Attach mousemove and mouseup to window for smooth drag selection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !dragStartCellRef.current) return;

      const cell = getCellFromMouseEvent(e);
      if (!cell) return;

      const start = dragStartCellRef.current;

      // Only set selection range if the mouse has moved to a different cell
      if (cell.row !== start.row || cell.col !== start.col) {
        setSelectionRange({
          start: start,
          end: cell,
        });
      } else {
        // Mouse is back on the start cell, clear the range
        setSelectionRange(null);
      }
    };

    const handleMouseUp = (_e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      dragStartCellRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getCellFromMouseEvent, setSelectionRange]);

  // Scroll to cell function
  const scrollToCell = useCallback(
    (row: number, col: number) => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const cellTop = rowPositions[row] ?? 0;
      const cellLeft = columnPositions[col] ?? 0;
      const cellHeight = getRowHeight(row);
      const cellWidth = getColumnWidth(col);

      const visibleTop = scrollTop;
      const visibleBottom = scrollTop + containerSize.height;
      const visibleLeft = scrollLeft;
      const visibleRight = scrollLeft + containerSize.width;

      let newScrollTop = scrollTop;
      let newScrollLeft = scrollLeft;

      // Vertical scrolling
      if (cellTop < visibleTop) {
        newScrollTop = cellTop;
      } else if (cellTop + cellHeight > visibleBottom) {
        newScrollTop = cellTop + cellHeight - containerSize.height;
      }

      // Horizontal scrolling
      if (cellLeft < visibleLeft) {
        newScrollLeft = cellLeft;
      } else if (cellLeft + cellWidth > visibleRight) {
        newScrollLeft = cellLeft + cellWidth - containerSize.width;
      }

      if (newScrollTop !== scrollTop || newScrollLeft !== scrollLeft) {
        scrollContainer.scrollTo({
          top: newScrollTop,
          left: newScrollLeft,
          behavior: 'auto',
        });
      }
    },
    [
      scrollTop,
      scrollLeft,
      containerSize,
      rowPositions,
      columnPositions,
      getRowHeight,
      getColumnWidth,
    ]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingCell) return; // Don't navigate while editing

      if (!selectedCell) return;

      let newRow = selectedCell.row;
      let newCol = selectedCell.col;
      let handled = true;

      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, newRow - 1);
          break;
        case 'ArrowDown':
          newRow = Math.min(rowCount - 1, newRow + 1);
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, newCol - 1);
          break;
        case 'ArrowRight':
          newCol = Math.min(columnCount - 1, newCol + 1);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            newCol = Math.max(0, newCol - 1);
          } else {
            newCol = Math.min(columnCount - 1, newCol + 1);
          }
          break;
        case 'Enter':
          if (e.shiftKey) {
            newRow = Math.max(0, newRow - 1);
          } else {
            newRow = Math.min(rowCount - 1, newRow + 1);
          }
          break;
        case 'Home':
          if (e.ctrlKey || e.metaKey) {
            newRow = 0;
          }
          newCol = 0;
          break;
        case 'End':
          if (e.ctrlKey || e.metaKey) {
            newRow = rowCount - 1;
          }
          newCol = columnCount - 1;
          break;
        case 'PageUp':
          newRow = Math.max(0, newRow - Math.floor(containerSize.height / DEFAULT_ROW_HEIGHT));
          break;
        case 'PageDown':
          newRow = Math.min(
            rowCount - 1,
            newRow + Math.floor(containerSize.height / DEFAULT_ROW_HEIGHT)
          );
          break;
        case 'F2':
          startEditing(selectedCell.row, selectedCell.col, 'f2');
          e.preventDefault();
          return;
        case 'Delete':
        case 'Backspace':
          startEditing(selectedCell.row, selectedCell.col, 'type');
          updateEditValue('');
          e.preventDefault();
          return;
        default:
          // Start editing on printable character input
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            startEditing(selectedCell.row, selectedCell.col, 'type');
            updateEditValue(e.key);
            e.preventDefault();
            return;
          }
          handled = false;
      }

      if (handled) {
        e.preventDefault();

        if (e.shiftKey && e.key.startsWith('Arrow')) {
          // Extend selection
          setSelectionRange({
            start: selectionRange?.start ?? selectedCell,
            end: { row: newRow, col: newCol },
          });
        } else {
          setSelectedCell({ row: newRow, col: newCol });
        }

        // Scroll to make cell visible
        scrollToCell(newRow, newCol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedCell,
    editingCell,
    selectionRange,
    rowCount,
    columnCount,
    containerSize,
    setSelectedCell,
    setSelectionRange,
    startEditing,
    updateEditValue,
    scrollToCell,
  ]);

  // Render cells
  const cells = useMemo(() => {
    const result: React.JSX.Element[] = [];
    const { startRow, endRow, startCol, endCol } = visibleRange;

    for (let row = startRow; row < endRow; row++) {
      const y = rowPositions[row] ?? 0;
      const height = getRowHeight(row);

      for (let col = startCol; col < endCol; col++) {
        const x = columnPositions[col] ?? 0;
        const width = getColumnWidth(col);
        const value = getCellValue(row, col);
        const isSelected = selectedCell?.row === row && selectedCell.col === col;
        const style = getCellStyle(row, col);

        result.push(
          <GridCell
            key={`${String(row)}-${String(col)}`}
            row={row}
            col={col}
            x={x}
            y={y}
            width={width}
            height={height}
            value={value}
            isSelected={isSelected}
            cellStyle={style}
            onClick={handleCellClick}
            onDoubleClick={handleCellDoubleClick}
          />
        );
      }
    }

    return result;
  }, [
    visibleRange,
    rowPositions,
    columnPositions,
    getRowHeight,
    getColumnWidth,
    getCellValue,
    getCellStyle,
    selectedCell,
    handleCellClick,
    handleCellDoubleClick,
  ]);

  // Render row headers
  const rowHeaders = useMemo(() => {
    const result: React.JSX.Element[] = [];
    const { startRow, endRow } = visibleRange;

    for (let row = startRow; row < endRow; row++) {
      const y = rowPositions[row] ?? 0;
      const height = getRowHeight(row);
      const isSelected = selectedCell?.row === row;

      result.push(
        <div
          key={`row-${String(row)}`}
          className={`row-header ${isSelected ? 'selected' : ''}`}
          style={{
            transform: `translateY(${String(y)}px)`,
            height,
          }}
        >
          {row + 1}
        </div>
      );

      // Render row resizer at the bottom edge of the row header
      result.push(<RowResizer key={`row-resizer-${String(row)}`} row={row} y={y + height} />);
    }

    return result;
  }, [visibleRange, rowPositions, getRowHeight, selectedCell]);

  // Render column headers
  const columnHeaders = useMemo(() => {
    const result: React.JSX.Element[] = [];
    const { startCol, endCol } = visibleRange;

    for (let col = startCol; col < endCol; col++) {
      const x = columnPositions[col] ?? 0;
      const width = getColumnWidth(col);
      const isSelected = selectedCell?.col === col;

      result.push(
        <div
          key={`col-${String(col)}`}
          className={`column-header ${isSelected ? 'selected' : ''}`}
          style={{
            transform: `translateX(${String(x)}px)`,
            width,
          }}
        >
          {(columnIndexToLabel as (col: number) => string)(col)}
        </div>
      );

      // Render column resizer at the right edge of the column header
      result.push(<ColumnResizer key={`col-resizer-${String(col)}`} col={col} x={x + width} />);
    }

    return result;
  }, [visibleRange, columnPositions, getColumnWidth, selectedCell]);

  // Calculate selection box position
  const selectionBox = useMemo(() => {
    if (!selectedCell && !selectionRange) return null;

    const startCell = selectionRange?.start ?? selectedCell;
    const endCell = selectionRange?.end ?? selectedCell;

    if (!startCell || !endCell) return null;

    const minRow = Math.min(startCell.row, endCell.row);
    const maxRow = Math.max(startCell.row, endCell.row);
    const minCol = Math.min(startCell.col, endCell.col);
    const maxCol = Math.max(startCell.col, endCell.col);

    const x = columnPositions[minCol] ?? 0;
    const y = rowPositions[minRow] ?? 0;
    const width = (columnPositions[maxCol + 1] ?? 0) - x;
    const height = (rowPositions[maxRow + 1] ?? 0) - y;

    return { x, y, width, height };
  }, [selectedCell, selectionRange, columnPositions, rowPositions]);

  // Get editing cell position
  const editingCellPosition = useMemo(() => {
    if (!editingCell) return null;

    const x = columnPositions[editingCell.col] ?? 0;
    const y = rowPositions[editingCell.row] ?? 0;
    const width = getColumnWidth(editingCell.col);
    const height = getRowHeight(editingCell.row);

    return { x, y, width, height };
  }, [editingCell, columnPositions, rowPositions, getColumnWidth, getRowHeight]);

  return (
    <div className="virtual-grid" ref={containerRef} tabIndex={0}>
      {/* Corner */}
      <div className="grid-corner" />

      {/* Column headers */}
      <div className="column-headers-container">
        <div
          className="column-headers"
          style={{
            transform: `translateX(${String(-scrollLeft)}px)`,
            width: totalWidth,
          }}
        >
          {columnHeaders}
        </div>
      </div>

      {/* Row headers */}
      <div className="row-headers-container">
        <div
          className="row-headers"
          style={{
            transform: `translateY(${String(-scrollTop)}px)`,
            height: totalHeight,
          }}
        >
          {rowHeaders}
        </div>
      </div>

      {/* Scrollable cell area */}
      <div
        className={`grid-scroll-container${isDragging ? ' is-dragging' : ''}`}
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleGridMouseDown}
      >
        <div
          className="grid-content"
          style={{
            width: totalWidth,
            height: totalHeight,
          }}
        >
          {cells}

          {/* Selection overlay */}
          {selectionBox && (
            <SelectionOverlay
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              onFillDragStart={handleFillDragStart}
              fillPreview={fillPreview}
            />
          )}

          {/* Cell editor */}
          {editingCell && editingCellPosition && (
            <CellEditor
              x={editingCellPosition.x}
              y={editingCellPosition.y}
              width={editingCellPosition.width}
              height={editingCellPosition.height}
            />
          )}
        </div>
      </div>
    </div>
  );
}
