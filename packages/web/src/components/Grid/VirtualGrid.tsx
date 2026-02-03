import { useRef, useCallback, useState, useEffect, useMemo, memo } from 'react';
import { useSpreadsheetStore } from '../../store/spreadsheet';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_ROW_HEIGHT, VIRTUALIZATION_BUFFER } from '@excel/shared';
import { columnIndexToLabel } from '@excel/core';
import { CellEditor } from './CellEditor';
import { SelectionOverlay } from './SelectionOverlay';
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
  onClick,
  onDoubleClick,
}: CellProps) {
  return (
    <div
      className={`grid-cell ${isSelected ? 'selected' : ''}`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width,
        height,
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

  const {
    rowCount,
    columnCount,
    getColumnWidth,
    getRowHeight,
    getCellValue,
    selectedCell,
    setSelectedCell,
    selectionRange,
    setSelectionRange,
    editingCell,
    startEditing,
    frozenRows,
    frozenCols,
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
    const startRow = Math.max(0, findRowAtPosition(scrollTop) - VIRTUALIZATION_BUFFER);
    const endRow = Math.min(
      rowCount,
      findRowAtPosition(scrollTop + containerSize.height) + VIRTUALIZATION_BUFFER + 1
    );

    const startCol = Math.max(0, findColAtPosition(scrollLeft) - VIRTUALIZATION_BUFFER);
    const endCol = Math.min(
      columnCount,
      findColAtPosition(scrollLeft + containerSize.width) + VIRTUALIZATION_BUFFER + 1
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
      startEditing(row, col);
    },
    [startEditing]
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
          startEditing(selectedCell.row, selectedCell.col);
          e.preventDefault();
          return;
        default:
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
  ]);

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
    [scrollTop, scrollLeft, containerSize, rowPositions, columnPositions, getRowHeight, getColumnWidth]
  );

  // Render cells
  const cells = useMemo(() => {
    const result: JSX.Element[] = [];
    const { startRow, endRow, startCol, endCol } = visibleRange;

    for (let row = startRow; row < endRow; row++) {
      const y = rowPositions[row] ?? 0;
      const height = getRowHeight(row);

      for (let col = startCol; col < endCol; col++) {
        const x = columnPositions[col] ?? 0;
        const width = getColumnWidth(col);
        const value = getCellValue(row, col);
        const isSelected = selectedCell?.row === row && selectedCell?.col === col;

        result.push(
          <GridCell
            key={`${row}-${col}`}
            row={row}
            col={col}
            x={x}
            y={y}
            width={width}
            height={height}
            value={value}
            isSelected={isSelected}
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
    selectedCell,
    handleCellClick,
    handleCellDoubleClick,
  ]);

  // Render row headers
  const rowHeaders = useMemo(() => {
    const result: JSX.Element[] = [];
    const { startRow, endRow } = visibleRange;

    for (let row = startRow; row < endRow; row++) {
      const y = rowPositions[row] ?? 0;
      const height = getRowHeight(row);
      const isSelected = selectedCell?.row === row;

      result.push(
        <div
          key={`row-${row}`}
          className={`row-header ${isSelected ? 'selected' : ''}`}
          style={{
            transform: `translateY(${y}px)`,
            height,
          }}
        >
          {row + 1}
        </div>
      );
    }

    return result;
  }, [visibleRange, rowPositions, getRowHeight, selectedCell]);

  // Render column headers
  const columnHeaders = useMemo(() => {
    const result: JSX.Element[] = [];
    const { startCol, endCol } = visibleRange;

    for (let col = startCol; col < endCol; col++) {
      const x = columnPositions[col] ?? 0;
      const width = getColumnWidth(col);
      const isSelected = selectedCell?.col === col;

      result.push(
        <div
          key={`col-${col}`}
          className={`column-header ${isSelected ? 'selected' : ''}`}
          style={{
            transform: `translateX(${x}px)`,
            width,
          }}
        >
          {columnIndexToLabel(col)}
        </div>
      );
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
            transform: `translateX(${-scrollLeft}px)`,
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
            transform: `translateY(${-scrollTop}px)`,
            height: totalHeight,
          }}
        >
          {rowHeaders}
        </div>
      </div>

      {/* Scrollable cell area */}
      <div
        className="grid-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
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
