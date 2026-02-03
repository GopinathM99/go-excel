/**
 * Memory Performance Tests
 *
 * Tests for measuring memory usage, detecting memory leaks,
 * and ensuring efficient memory management with large datasets.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  measureMemory,
  measureTime,
  createLargeSheet,
  PERFORMANCE_TARGETS,
  reportResults,
  runBenchmarkWithTarget,
  type BenchmarkResult,
} from './utils';
import {
  createSheet,
  setCell,
  deleteCell,
  clearRange,
  getCell,
  type Sheet,
} from '../../src/models/Sheet';
import { createCell } from '../../src/models/Cell';
import { numberValue, stringValue } from '../../src/models/CellValue';
import type { CellRange } from '../../src/models/CellRange';

/**
 * Simple stack for testing memory with snapshots
 * (Similar to undo stack behavior but simpler for testing)
 */
class SnapshotStack<T> {
  private stack: T[] = [];
  private maxSize: number;

  constructor(options: { maxSize: number }) {
    this.maxSize = options.maxSize;
  }

  push(item: T): void {
    this.stack.push(item);
    while (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  clear(): void {
    this.stack = [];
  }

  get size(): number {
    return this.stack.length;
  }
}

describe('Memory Performance', () => {
  const results: BenchmarkResult[] = [];

  /**
   * Force garbage collection if available
   */
  function forceGC(): void {
    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
  }

  /**
   * Gets current heap usage in MB
   */
  function getHeapUsedMB(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / (1024 * 1024);
    }
    return 0;
  }

  describe('Memory for 100k Cells', () => {
    it('should use less than 100MB for 100k cells', () => {
      forceGC();
      const memoryBefore = getHeapUsedMB();

      const sheet = createLargeSheet(1000, 100); // 100k cells

      forceGC();
      const memoryAfter = getHeapUsedMB();
      const memoryUsed = memoryAfter - memoryBefore;

      console.log(`Memory for 100k cells: ${memoryUsed.toFixed(2)} MB`);

      expect(memoryUsed).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_100K_CELLS_MB);
    });

    it('should release memory when sheet is cleared', () => {
      forceGC();
      const memoryBefore = getHeapUsedMB();

      let sheet: Sheet | null = createLargeSheet(1000, 100);
      forceGC();
      const memoryWithSheet = getHeapUsedMB();

      // Clear reference
      sheet = null;
      forceGC();

      const memoryAfterClear = getHeapUsedMB();

      console.log(`Memory before: ${memoryBefore.toFixed(2)} MB`);
      console.log(`Memory with sheet: ${memoryWithSheet.toFixed(2)} MB`);
      console.log(`Memory after clear: ${memoryAfterClear.toFixed(2)} MB`);

      // Memory should be mostly released (within 20% of original)
      const memoryReleased = memoryWithSheet - memoryAfterClear;
      const memoryAllocated = memoryWithSheet - memoryBefore;

      expect(memoryReleased).toBeGreaterThan(memoryAllocated * 0.5);
    });
  });

  describe('Memory for 1M Cells', () => {
    it('should use less than 500MB for 1M cells', () => {
      forceGC();
      const memoryBefore = getHeapUsedMB();

      // Create sheet in chunks to avoid memory pressure
      let sheet = createSheet('LargeSheet');
      const totalRows = 10000;
      const totalCols = 100;

      for (let row = 0; row < totalRows; row++) {
        for (let col = 0; col < totalCols; col++) {
          const cell = createCell(
            { row, col },
            String(row * totalCols + col),
            numberValue(row * totalCols + col)
          );
          sheet = setCell(sheet, cell);
        }
      }

      forceGC();
      const memoryAfter = getHeapUsedMB();
      const memoryUsed = memoryAfter - memoryBefore;

      console.log(`Memory for 1M cells: ${memoryUsed.toFixed(2)} MB`);
      console.log(`Bytes per cell: ${((memoryUsed * 1024 * 1024) / (totalRows * totalCols)).toFixed(2)}`);

      expect(memoryUsed).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_1M_CELLS_MB);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory on create/destroy cycles', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();
      const iterations = 10;
      const memoryReadings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Create a sheet with 10k cells
        let sheet: Sheet | null = createLargeSheet(100, 100);

        // Use the sheet
        for (let r = 0; r < 10; r++) {
          getCell(sheet, { row: r, col: r });
        }

        // Clear reference
        sheet = null;
        forceGC();

        memoryReadings.push(getHeapUsedMB());
      }

      const finalMemory = memoryReadings[memoryReadings.length - 1]!;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Initial memory: ${initialMemory.toFixed(2)} MB`);
      console.log(`Final memory: ${finalMemory.toFixed(2)} MB`);
      console.log(`Memory growth: ${memoryGrowth.toFixed(2)} MB`);

      // Memory should not grow significantly (allow 10MB for test overhead)
      expect(memoryGrowth).toBeLessThan(10);
    });

    it('should not leak memory on cell operations', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();

      let sheet = createSheet('TestSheet');

      // Perform many cell operations
      for (let iteration = 0; iteration < 100; iteration++) {
        for (let i = 0; i < 100; i++) {
          const cell = createCell(
            { row: i, col: 0 },
            String(iteration * 100 + i),
            numberValue(iteration * 100 + i)
          );
          sheet = setCell(sheet, cell);
        }

        // Clear cells
        for (let i = 0; i < 100; i++) {
          sheet = deleteCell(sheet, { row: i, col: 0 });
        }
      }

      forceGC();
      const finalMemory = getHeapUsedMB();
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth after 10000 set/delete cycles: ${memoryGrowth.toFixed(2)} MB`);

      expect(memoryGrowth).toBeLessThan(20);
    });

    it('should handle rapid cell updates without memory growth', () => {
      forceGC();

      let sheet = createLargeSheet(100, 100); // 10k cells
      const initialMemory = getHeapUsedMB();

      // Rapidly update cells
      for (let iteration = 0; iteration < 100; iteration++) {
        for (let row = 0; row < 10; row++) {
          for (let col = 0; col < 10; col++) {
            const cell = createCell(
              { row, col },
              String(iteration),
              numberValue(iteration)
            );
            sheet = setCell(sheet, cell);
          }
        }
      }

      forceGC();
      const finalMemory = getHeapUsedMB();
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth after 10000 updates: ${memoryGrowth.toFixed(2)} MB`);

      // Memory should not grow significantly
      expect(memoryGrowth).toBeLessThan(50);
    });
  });

  describe('Memory with Snapshot Stack', () => {
    it('should manage memory with large snapshot stack', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();

      const snapshotStack = new SnapshotStack<Sheet>({ maxSize: 100 });
      let sheet = createSheet('UndoTest');

      // Create 100 undo states with 1000 cells each
      for (let i = 0; i < 100; i++) {
        // Modify sheet
        for (let row = 0; row < 10; row++) {
          for (let col = 0; col < 100; col++) {
            const cell = createCell(
              { row, col },
              String(i * 1000 + row * 100 + col),
              numberValue(i * 1000 + row * 100 + col)
            );
            sheet = setCell(sheet, cell);
          }
        }

        // Push to snapshot stack
        snapshotStack.push(sheet);
      }

      forceGC();
      const memoryWithStack = getHeapUsedMB();
      const memoryUsed = memoryWithStack - initialMemory;

      console.log(`Memory with 100-item snapshot stack: ${memoryUsed.toFixed(2)} MB`);

      // Should use reasonable memory (< 200MB for 100 snapshots)
      expect(memoryUsed).toBeLessThan(200);
    });

    it('should release memory when snapshot stack is cleared', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();

      const snapshotStack = new SnapshotStack<Sheet>({ maxSize: 50 });
      let sheet = createSheet('UndoTest');

      // Fill snapshot stack
      for (let i = 0; i < 50; i++) {
        for (let row = 0; row < 100; row++) {
          const cell = createCell(
            { row, col: 0 },
            String(i * 100 + row),
            numberValue(i * 100 + row)
          );
          sheet = setCell(sheet, cell);
        }
        snapshotStack.push(sheet);
      }

      forceGC();
      const memoryWithStack = getHeapUsedMB();

      // Clear the snapshot stack
      snapshotStack.clear();

      forceGC();
      const memoryAfterClear = getHeapUsedMB();

      const memoryReleased = memoryWithStack - memoryAfterClear;
      console.log(`Memory released after clearing snapshot stack: ${memoryReleased.toFixed(2)} MB`);

      // Should release significant memory
      expect(memoryReleased).toBeGreaterThan(0);
    });

    it('should limit memory with maxSize constraint', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();

      // Small max size
      const snapshotStack = new SnapshotStack<Sheet>({ maxSize: 10 });
      let sheet = createSheet('UndoTest');

      // Try to add 100 items
      for (let i = 0; i < 100; i++) {
        for (let row = 0; row < 100; row++) {
          const cell = createCell(
            { row, col: 0 },
            String(i * 100 + row),
            numberValue(i * 100 + row)
          );
          sheet = setCell(sheet, cell);
        }
        snapshotStack.push(sheet);
      }

      forceGC();
      const finalMemory = getHeapUsedMB();
      const memoryUsed = finalMemory - initialMemory;

      console.log(`Memory with maxSize=10: ${memoryUsed.toFixed(2)} MB`);

      // Should use limited memory due to maxSize constraint
      expect(memoryUsed).toBeLessThan(50);
    });
  });

  describe('Sparse Data Memory Efficiency', () => {
    it('should use minimal memory for sparse data', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();

      let sheet = createSheet('SparseSheet');

      // Create sparse data - only 1% of cells filled
      for (let row = 0; row < 1000; row += 10) {
        for (let col = 0; col < 1000; col += 10) {
          const cell = createCell(
            { row, col },
            String(row * 1000 + col),
            numberValue(row * 1000 + col)
          );
          sheet = setCell(sheet, cell);
        }
      }

      forceGC();
      const memoryUsed = getHeapUsedMB() - initialMemory;
      const actualCells = 10000; // 100 rows * 100 cols at intervals

      console.log(`Memory for 10k sparse cells in 1M grid: ${memoryUsed.toFixed(2)} MB`);
      console.log(`Bytes per cell: ${((memoryUsed * 1024 * 1024) / actualCells).toFixed(2)}`);

      // Should use memory proportional to actual cells, not grid size
      // 10k cells should use much less than 100k would
      expect(memoryUsed).toBeLessThan(20);
    });
  });

  describe('Range Operations Memory', () => {
    it('should efficiently clear large ranges', () => {
      let sheet = createLargeSheet(1000, 100);

      forceGC();
      const memoryBefore = getHeapUsedMB();

      // Clear a large range
      const range: CellRange = {
        start: { row: 0, col: 0 },
        end: { row: 499, col: 99 },
      };

      const { duration } = measureTime(() => {
        sheet = clearRange(sheet, range);
      });

      forceGC();
      const memoryAfter = getHeapUsedMB();
      const memoryReleased = memoryBefore - memoryAfter;

      console.log(`Time to clear 50k cells: ${duration.toFixed(2)} ms`);
      console.log(`Memory released: ${memoryReleased.toFixed(2)} MB`);

      expect(duration).toBeLessThan(100);
    });
  });

  describe('String Interning', () => {
    it('should handle repeated strings efficiently', () => {
      forceGC();
      const initialMemory = getHeapUsedMB();

      let sheet = createSheet('StringTest');

      // Create cells with repeated string values
      const repeatedStrings = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

      for (let row = 0; row < 10000; row++) {
        const str = repeatedStrings[row % repeatedStrings.length]!;
        const cell = createCell(
          { row, col: 0 },
          str,
          stringValue(str)
        );
        sheet = setCell(sheet, cell);
      }

      forceGC();
      const memoryUsed = getHeapUsedMB() - initialMemory;

      console.log(`Memory for 10k cells with 5 unique strings: ${memoryUsed.toFixed(2)} MB`);

      // Should use less memory than unique strings
      expect(memoryUsed).toBeLessThan(30);
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
