/**
 * Scroll and Render Performance Tests
 *
 * Tests for measuring scroll performance, rendering speed,
 * and UI responsiveness with large datasets.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  measureTime,
  measureMemory,
  runBenchmarkWithTarget,
  createLargeSheet,
  PERFORMANCE_TARGETS,
  reportResults,
  type BenchmarkResult,
} from './utils';
import {
  createSheet,
  setCell,
  getCell,
  getCellsInRange,
  setFrozenPanes,
  type Sheet,
} from '../../src/models/Sheet';
import { createCell } from '../../src/models/Cell';
import { numberValue, stringValue } from '../../src/models/CellValue';
import type { CellRange } from '../../src/models/CellRange';

describe('Scroll and Render Performance', () => {
  const results: BenchmarkResult[] = [];

  /**
   * Simulates rendering visible cells in a viewport
   */
  function renderVisibleCells(
    sheet: Sheet,
    viewport: { startRow: number; endRow: number; startCol: number; endCol: number }
  ): number {
    let renderedCount = 0;
    for (let row = viewport.startRow; row <= viewport.endRow; row++) {
      for (let col = viewport.startCol; col <= viewport.endCol; col++) {
        const cell = getCell(sheet, { row, col });
        // Simulate rendering by accessing cell data
        if (cell.content.raw !== '') {
          renderedCount++;
        }
      }
    }
    return renderedCount;
  }

  /**
   * Simulates scrolling through a range of rows
   */
  function simulateScroll(
    sheet: Sheet,
    startRow: number,
    endRow: number,
    viewportHeight: number = 50,
    viewportWidth: number = 20
  ): number[] {
    const frameTimes: number[] = [];
    let currentRow = startRow;

    while (currentRow < endRow) {
      const frameStart = performance.now();

      // Render current viewport
      renderVisibleCells(sheet, {
        startRow: currentRow,
        endRow: Math.min(currentRow + viewportHeight, endRow),
        startCol: 0,
        endCol: viewportWidth,
      });

      const frameEnd = performance.now();
      frameTimes.push(frameEnd - frameStart);

      // Scroll by viewport height
      currentRow += viewportHeight;
    }

    return frameTimes;
  }

  /**
   * Calculates FPS from frame times
   */
  function calculateFPS(frameTimes: number[]): { avgFPS: number; minFPS: number; maxFPS: number } {
    const fps = frameTimes.map((t) => (t > 0 ? 1000 / t : 60));
    return {
      avgFPS: fps.reduce((a, b) => a + b, 0) / fps.length,
      minFPS: Math.min(...fps),
      maxFPS: Math.max(...fps),
    };
  }

  describe('Render 100k Rows', () => {
    let largeSheet: Sheet;

    beforeEach(() => {
      largeSheet = createLargeSheet(100000, 20, { mixedTypes: true });
    });

    it('should render visible portion in under 100ms', () => {
      const viewport = {
        startRow: 0,
        endRow: 50,
        startCol: 0,
        endCol: 20,
      };

      const result = runBenchmarkWithTarget(
        'Render visible portion (100k rows)',
        () => renderVisibleCells(largeSheet, viewport),
        PERFORMANCE_TARGETS.RENDER_VISIBLE_MS,
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should render visible portion from middle of sheet', () => {
      const viewport = {
        startRow: 50000,
        endRow: 50050,
        startCol: 0,
        endCol: 20,
      };

      const result = runBenchmarkWithTarget(
        'Render visible portion (middle of 100k rows)',
        () => renderVisibleCells(largeSheet, viewport),
        PERFORMANCE_TARGETS.RENDER_VISIBLE_MS,
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should render visible portion from end of sheet', () => {
      const viewport = {
        startRow: 99950,
        endRow: 100000,
        startCol: 0,
        endCol: 20,
      };

      const result = runBenchmarkWithTarget(
        'Render visible portion (end of 100k rows)',
        () => renderVisibleCells(largeSheet, viewport),
        PERFORMANCE_TARGETS.RENDER_VISIBLE_MS,
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });
  });

  describe('Scroll Through 100k Rows', () => {
    let largeSheet: Sheet;

    beforeEach(() => {
      largeSheet = createLargeSheet(100000, 20, { mixedTypes: true });
    });

    it('should maintain 60fps while scrolling', () => {
      const frameTimes = simulateScroll(largeSheet, 0, 100000, 50, 20);
      const { avgFPS, minFPS } = calculateFPS(frameTimes);

      console.log(`Scroll FPS - Avg: ${avgFPS.toFixed(1)}, Min: ${minFPS.toFixed(1)}`);

      // At least average FPS should be above target
      expect(avgFPS).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.SCROLL_FPS);
    });

    it('should handle rapid scrolling', () => {
      // Simulate rapid scrolling by jumping viewports
      const jumpSize = 1000; // Jump 1000 rows at a time
      const frameTimes: number[] = [];

      for (let row = 0; row < 100000; row += jumpSize) {
        const frameStart = performance.now();

        renderVisibleCells(largeSheet, {
          startRow: row,
          endRow: Math.min(row + 50, 100000),
          startCol: 0,
          endCol: 20,
        });

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const { avgFPS } = calculateFPS(frameTimes);
      expect(avgFPS).toBeGreaterThanOrEqual(30); // At least 30fps for rapid scrolling
    });
  });

  describe('Frozen Panes Performance', () => {
    let sheetWithFrozenPanes: Sheet;

    beforeEach(() => {
      sheetWithFrozenPanes = createLargeSheet(100000, 100, { mixedTypes: true });
      sheetWithFrozenPanes = setFrozenPanes(sheetWithFrozenPanes, 10, 5);
    });

    it('should render with 10 frozen rows efficiently', () => {
      const renderWithFrozenRows = () => {
        const frozenRows = sheetWithFrozenPanes.frozenPanes?.rows ?? 0;
        const frozenCols = sheetWithFrozenPanes.frozenPanes?.columns ?? 0;

        // Render frozen rows (always visible)
        renderVisibleCells(sheetWithFrozenPanes, {
          startRow: 0,
          endRow: frozenRows,
          startCol: 0,
          endCol: 20,
        });

        // Render frozen columns (always visible)
        renderVisibleCells(sheetWithFrozenPanes, {
          startRow: 0,
          endRow: 50,
          startCol: 0,
          endCol: frozenCols,
        });

        // Render scrollable area
        renderVisibleCells(sheetWithFrozenPanes, {
          startRow: frozenRows,
          endRow: frozenRows + 40,
          startCol: frozenCols,
          endCol: 20,
        });
      };

      const result = runBenchmarkWithTarget(
        'Render with frozen panes (10 rows, 5 cols)',
        renderWithFrozenRows,
        PERFORMANCE_TARGETS.RENDER_VISIBLE_MS * 1.5, // Allow 50% more time for frozen panes
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should handle 100 frozen rows', () => {
      const heavyFrozenSheet = setFrozenPanes(sheetWithFrozenPanes, 100, 10);

      const renderWithHeavyFrozen = () => {
        const frozenRows = heavyFrozenSheet.frozenPanes?.rows ?? 0;
        const frozenCols = heavyFrozenSheet.frozenPanes?.columns ?? 0;

        // Render all frozen rows
        renderVisibleCells(heavyFrozenSheet, {
          startRow: 0,
          endRow: frozenRows,
          startCol: 0,
          endCol: 20,
        });

        // Render frozen columns for visible area
        renderVisibleCells(heavyFrozenSheet, {
          startRow: frozenRows,
          endRow: frozenRows + 50,
          startCol: 0,
          endCol: frozenCols,
        });

        // Render scrollable content
        renderVisibleCells(heavyFrozenSheet, {
          startRow: frozenRows,
          endRow: frozenRows + 50,
          startCol: frozenCols,
          endCol: 20,
        });
      };

      const { duration } = measureTime(renderWithHeavyFrozen);

      // With 100 frozen rows, should still be under 200ms
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Cell Selection Performance', () => {
    let largeSheet: Sheet;

    beforeEach(() => {
      largeSheet = createLargeSheet(100000, 100, { mixedTypes: true });
    });

    it('should select a large range quickly', () => {
      const selectRange = () => {
        const range: CellRange = {
          start: { row: 0, col: 0 },
          end: { row: 1000, col: 50 },
        };

        // Simulate selection by getting all cells in range
        const cells = getCellsInRange(largeSheet, range);
        return cells.length;
      };

      const result = runBenchmarkWithTarget(
        'Select large range (1000x50 cells)',
        selectRange,
        100, // Should complete in under 100ms
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should handle selection at end of sheet', () => {
      const selectAtEnd = () => {
        const range: CellRange = {
          start: { row: 99000, col: 50 },
          end: { row: 100000, col: 100 },
        };

        const cells = getCellsInRange(largeSheet, range);
        return cells.length;
      };

      const result = runBenchmarkWithTarget(
        'Select range at end of sheet (1000x50 cells)',
        selectAtEnd,
        100,
        10
      );

      results.push(result);
      expect(result.passed).toBe(true);
    });

    it('should handle full column selection', () => {
      const selectFullColumn = () => {
        const range: CellRange = {
          start: { row: 0, col: 0 },
          end: { row: 99999, col: 0 },
        };

        // For full column, we iterate but don't load all cells
        let count = 0;
        for (let row = 0; row < 100000; row++) {
          const cell = getCell(largeSheet, { row, col: 0 });
          if (cell.content.raw !== '') count++;
        }
        return count;
      };

      const { duration } = measureTime(selectFullColumn);

      // Full column iteration should be under 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Virtual Scrolling Simulation', () => {
    let sheet: Sheet;

    beforeEach(() => {
      sheet = createLargeSheet(100000, 50);
    });

    it('should support virtual scrolling with buffer', () => {
      const bufferSize = 20; // Rows before/after viewport
      const viewportSize = 50;

      const virtualScroll = (scrollPosition: number) => {
        const startRow = Math.max(0, scrollPosition - bufferSize);
        const endRow = Math.min(100000, scrollPosition + viewportSize + bufferSize);

        renderVisibleCells(sheet, {
          startRow,
          endRow,
          startCol: 0,
          endCol: 20,
        });
      };

      // Measure time to render at various positions
      const positions = [0, 25000, 50000, 75000, 99950];
      const times: number[] = [];

      for (const pos of positions) {
        const { duration } = measureTime(() => virtualScroll(pos));
        times.push(duration);
      }

      const maxTime = Math.max(...times);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`Virtual scroll - Max: ${maxTime.toFixed(2)}ms, Avg: ${avgTime.toFixed(2)}ms`);

      // All renders should be fast
      expect(maxTime).toBeLessThan(50);
    });
  });

  // Report all results at the end
  describe('Performance Summary', () => {
    it('should report all benchmark results', () => {
      if (results.length > 0) {
        console.log(reportResults(results));
      }
    });
  });
});
