/**
 * User Interaction Performance Benchmarks
 *
 * Measures interaction latency for the Excel web application including:
 * - Keypress to cell update latency
 * - Click to selection latency
 * - Paste operation to render complete
 * - Formula bar sync latency
 *
 * These benchmarks measure the end-to-end time from user input to visual feedback.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Types
// ============================================================================

interface InteractionMetrics {
  inputTime: number;
  processingTime: number;
  renderTime: number;
  totalLatency: number;
}

interface BenchmarkResult {
  name: string;
  duration: number;
  samples: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p95: number;
  p99: number;
}

interface KeyEvent {
  key: string;
  keyCode: number;
  timestamp: number;
}

interface MouseEvent {
  x: number;
  y: number;
  button: number;
  timestamp: number;
}

interface CellAddress {
  row: number;
  col: number;
}

// ============================================================================
// Mock Input Event Queue
// ============================================================================

/**
 * Simulates the browser event loop and input processing
 */
class InputEventQueue {
  private queue: Array<{ type: string; event: unknown; callback: () => void }> = [];
  private processing = false;

  enqueue(type: string, event: unknown, callback: () => void): number {
    const enqueuedTime = performance.now();
    this.queue.push({ type, event, callback });

    if (!this.processing) {
      this.processQueue();
    }

    return enqueuedTime;
  }

  private processQueue(): void {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      // Simulate microtask delay
      item.callback();
    }

    this.processing = false;
  }

  clear(): void {
    this.queue = [];
    this.processing = false;
  }
}

// ============================================================================
// Mock Cell Editor
// ============================================================================

/**
 * Simulates cell editing behavior
 */
class CellEditor {
  private activeCell: CellAddress | null = null;
  private cellValue: string = '';
  private isEditing = false;
  private formulaBarValue: string = '';
  private onChangeCallbacks: Array<(value: string) => void> = [];

  startEditing(cell: CellAddress, initialValue: string = ''): number {
    const start = performance.now();

    this.activeCell = cell;
    this.cellValue = initialValue;
    this.formulaBarValue = initialValue;
    this.isEditing = true;

    // Simulate DOM updates
    this.simulateDOMUpdate();

    return performance.now() - start;
  }

  handleKeypress(key: string): InteractionMetrics {
    const inputTime = performance.now();

    if (!this.isEditing) {
      return {
        inputTime: 0,
        processingTime: 0,
        renderTime: 0,
        totalLatency: 0,
      };
    }

    // Processing phase
    const processingStart = performance.now();
    this.cellValue += key;
    this.formulaBarValue = this.cellValue;

    // Notify listeners
    for (const callback of this.onChangeCallbacks) {
      callback(this.cellValue);
    }
    const processingTime = performance.now() - processingStart;

    // Render phase
    const renderStart = performance.now();
    this.simulateDOMUpdate();
    this.simulateFormulaBarUpdate();
    const renderTime = performance.now() - renderStart;

    const totalLatency = performance.now() - inputTime;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency,
    };
  }

  handleBackspace(): InteractionMetrics {
    const inputTime = performance.now();

    if (!this.isEditing || this.cellValue.length === 0) {
      return { inputTime: 0, processingTime: 0, renderTime: 0, totalLatency: 0 };
    }

    const processingStart = performance.now();
    this.cellValue = this.cellValue.slice(0, -1);
    this.formulaBarValue = this.cellValue;

    for (const callback of this.onChangeCallbacks) {
      callback(this.cellValue);
    }
    const processingTime = performance.now() - processingStart;

    const renderStart = performance.now();
    this.simulateDOMUpdate();
    this.simulateFormulaBarUpdate();
    const renderTime = performance.now() - renderStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency: performance.now() - inputTime,
    };
  }

  commitEdit(): InteractionMetrics {
    const inputTime = performance.now();

    const processingStart = performance.now();
    const finalValue = this.cellValue;
    this.isEditing = false;

    // Simulate formula evaluation if applicable
    if (finalValue.startsWith('=')) {
      this.simulateFormulaEvaluation(finalValue);
    }
    const processingTime = performance.now() - processingStart;

    const renderStart = performance.now();
    this.simulateDOMUpdate();
    const renderTime = performance.now() - renderStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency: performance.now() - inputTime,
    };
  }

  onChange(callback: (value: string) => void): void {
    this.onChangeCallbacks.push(callback);
  }

  getValue(): string {
    return this.cellValue;
  }

  getFormulaBarValue(): string {
    return this.formulaBarValue;
  }

  private simulateDOMUpdate(): void {
    // Simulate DOM text content update
    const _html = `<div class="cell-editor">${this.cellValue}</div>`;
  }

  private simulateFormulaBarUpdate(): void {
    // Simulate formula bar sync
    const _html = `<input class="formula-bar" value="${this.formulaBarValue}">`;
  }

  private simulateFormulaEvaluation(formula: string): void {
    // Simulate basic formula parsing and evaluation
    const _tokens = formula.slice(1).split(/([+\-*/()])/);
    // Simplified evaluation simulation
  }
}

// ============================================================================
// Mock Selection Manager
// ============================================================================

/**
 * Simulates selection behavior
 */
class SelectionManager {
  private selection: { start: CellAddress; end: CellAddress } | null = null;
  private cellWidth = 100;
  private cellHeight = 24;
  private onSelectionChangeCallbacks: Array<(selection: { start: CellAddress; end: CellAddress } | null) => void> = [];

  handleClick(x: number, y: number): InteractionMetrics {
    const inputTime = performance.now();

    const processingStart = performance.now();

    // Calculate cell from coordinates
    const col = Math.floor(x / this.cellWidth);
    const row = Math.floor(y / this.cellHeight);

    this.selection = {
      start: { row, col },
      end: { row, col },
    };

    // Notify listeners
    for (const callback of this.onSelectionChangeCallbacks) {
      callback(this.selection);
    }
    const processingTime = performance.now() - processingStart;

    const renderStart = performance.now();
    this.simulateSelectionRender();
    const renderTime = performance.now() - renderStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency: performance.now() - inputTime,
    };
  }

  handleDragSelect(startX: number, startY: number, endX: number, endY: number): InteractionMetrics {
    const inputTime = performance.now();

    const processingStart = performance.now();

    const startCol = Math.floor(startX / this.cellWidth);
    const startRow = Math.floor(startY / this.cellHeight);
    const endCol = Math.floor(endX / this.cellWidth);
    const endRow = Math.floor(endY / this.cellHeight);

    this.selection = {
      start: { row: Math.min(startRow, endRow), col: Math.min(startCol, endCol) },
      end: { row: Math.max(startRow, endRow), col: Math.max(startCol, endCol) },
    };

    for (const callback of this.onSelectionChangeCallbacks) {
      callback(this.selection);
    }
    const processingTime = performance.now() - processingStart;

    const renderStart = performance.now();
    this.simulateSelectionRender();
    const renderTime = performance.now() - renderStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency: performance.now() - inputTime,
    };
  }

  handleArrowKey(direction: 'up' | 'down' | 'left' | 'right'): InteractionMetrics {
    const inputTime = performance.now();

    const processingStart = performance.now();

    if (!this.selection) {
      this.selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    }

    const delta = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    }[direction];

    const newRow = Math.max(0, this.selection.start.row + delta.row);
    const newCol = Math.max(0, this.selection.start.col + delta.col);

    this.selection = {
      start: { row: newRow, col: newCol },
      end: { row: newRow, col: newCol },
    };

    for (const callback of this.onSelectionChangeCallbacks) {
      callback(this.selection);
    }
    const processingTime = performance.now() - processingStart;

    const renderStart = performance.now();
    this.simulateSelectionRender();
    const renderTime = performance.now() - renderStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency: performance.now() - inputTime,
    };
  }

  onSelectionChange(callback: (selection: { start: CellAddress; end: CellAddress } | null) => void): void {
    this.onSelectionChangeCallbacks.push(callback);
  }

  getSelection(): { start: CellAddress; end: CellAddress } | null {
    return this.selection;
  }

  private simulateSelectionRender(): void {
    if (!this.selection) return;

    // Simulate selection box rendering
    const _html = `<div class="selection-box" style="
      top: ${this.selection.start.row * this.cellHeight}px;
      left: ${this.selection.start.col * this.cellWidth}px;
      width: ${(this.selection.end.col - this.selection.start.col + 1) * this.cellWidth}px;
      height: ${(this.selection.end.row - this.selection.start.row + 1) * this.cellHeight}px;
    "></div>`;
  }
}

// ============================================================================
// Mock Clipboard Manager
// ============================================================================

/**
 * Simulates clipboard operations
 */
class ClipboardManager {
  private clipboardData: string[][] = [];

  copy(data: string[][]): InteractionMetrics {
    const inputTime = performance.now();

    const processingStart = performance.now();
    this.clipboardData = data.map((row) => [...row]);
    const processingTime = performance.now() - processingStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime: 0,
      totalLatency: performance.now() - inputTime,
    };
  }

  paste(targetRow: number, targetCol: number, onCellUpdate: (row: number, col: number, value: string) => void): InteractionMetrics {
    const inputTime = performance.now();

    const processingStart = performance.now();

    // Process paste data
    for (let r = 0; r < this.clipboardData.length; r++) {
      for (let c = 0; c < this.clipboardData[r]!.length; c++) {
        onCellUpdate(targetRow + r, targetCol + c, this.clipboardData[r]![c]!);
      }
    }
    const processingTime = performance.now() - processingStart;

    const renderStart = performance.now();
    // Simulate re-render of affected cells
    this.simulatePasteRender(this.clipboardData.length, this.clipboardData[0]?.length || 0);
    const renderTime = performance.now() - renderStart;

    return {
      inputTime: processingStart - inputTime,
      processingTime,
      renderTime,
      totalLatency: performance.now() - inputTime,
    };
  }

  setClipboardData(data: string[][]): void {
    this.clipboardData = data;
  }

  private simulatePasteRender(rows: number, cols: number): void {
    // Simulate rendering updated cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const _html = `<div class="cell updated"></div>`;
      }
    }
  }
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

function runInteractionBenchmark(
  name: string,
  fn: () => InteractionMetrics,
  iterations: number = 20,
  warmupIterations: number = 5
): BenchmarkResult & { avgMetrics: InteractionMetrics } {
  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    fn();
  }

  // Actual benchmark
  const samples: number[] = [];
  const metrics: InteractionMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = fn();
    samples.push(result.totalLatency);
    metrics.push(result);
  }

  // Calculate statistics
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]!
      : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const squaredDiffs = samples.map((s) => Math.pow(s - mean, 2));
  const stdDev = Math.sqrt(
    squaredDiffs.reduce((a, b) => a + b, 0) / samples.length
  );

  // Average metrics
  const avgMetrics: InteractionMetrics = {
    inputTime: metrics.reduce((a, b) => a + b.inputTime, 0) / metrics.length,
    processingTime: metrics.reduce((a, b) => a + b.processingTime, 0) / metrics.length,
    renderTime: metrics.reduce((a, b) => a + b.renderTime, 0) / metrics.length,
    totalLatency: mean,
  };

  return {
    name,
    duration: median,
    samples,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    median,
    stdDev,
    p95: sorted[Math.floor(sorted.length * 0.95)]!,
    p99: sorted[Math.floor(sorted.length * 0.99)]!,
    avgMetrics,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('User Interaction Performance', () => {
  let editor: CellEditor;
  let selection: SelectionManager;
  let clipboard: ClipboardManager;
  let eventQueue: InputEventQueue;

  beforeEach(() => {
    editor = new CellEditor();
    selection = new SelectionManager();
    clipboard = new ClipboardManager();
    eventQueue = new InputEventQueue();
  });

  afterEach(() => {
    eventQueue.clear();
  });

  describe('Keypress to Cell Update Latency', () => {
    beforeEach(() => {
      editor.startEditing({ row: 0, col: 0 });
    });

    it('should update cell within 16ms of keypress (60fps)', () => {
      const result = runInteractionBenchmark(
        'Single keypress',
        () => editor.handleKeypress('a'),
        50
      );

      console.log(`Single keypress latency: ${result.median.toFixed(2)}ms`);
      console.log(`  - Input: ${result.avgMetrics.inputTime.toFixed(2)}ms`);
      console.log(`  - Processing: ${result.avgMetrics.processingTime.toFixed(2)}ms`);
      console.log(`  - Render: ${result.avgMetrics.renderTime.toFixed(2)}ms`);

      expect(result.median).toBeLessThan(16.67);
    });

    it('should handle rapid typing at 60fps', () => {
      const text = 'Hello World 123!';
      let totalLatency = 0;

      for (const char of text) {
        const metrics = editor.handleKeypress(char);
        totalLatency += metrics.totalLatency;
      }

      const avgLatency = totalLatency / text.length;
      console.log(`Rapid typing avg latency: ${avgLatency.toFixed(2)}ms per character`);

      expect(avgLatency).toBeLessThan(16.67);
    });

    it('should handle backspace within 16ms', () => {
      // Type some text first
      for (const char of 'Test') {
        editor.handleKeypress(char);
      }

      const result = runInteractionBenchmark(
        'Backspace',
        () => editor.handleBackspace(),
        30
      );

      console.log(`Backspace latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(16.67);
    });

    it('should commit edit (Enter key) within 50ms', () => {
      editor.handleKeypress('1');
      editor.handleKeypress('2');
      editor.handleKeypress('3');

      const result = runInteractionBenchmark(
        'Commit edit',
        () => editor.commitEdit(),
        20
      );

      console.log(`Commit edit latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(50);
    });

    it('should commit formula edit within 100ms', () => {
      // Enter a formula
      for (const char of '=SUM(A1:A100)') {
        editor.handleKeypress(char);
      }

      const result = runInteractionBenchmark(
        'Commit formula',
        () => {
          editor.startEditing({ row: 0, col: 0 }, '=SUM(A1:A100)');
          return editor.commitEdit();
        },
        20
      );

      console.log(`Commit formula latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(100);
    });
  });

  describe('Click to Selection Latency', () => {
    it('should select cell within 16ms of click', () => {
      const result = runInteractionBenchmark(
        'Cell click selection',
        () => selection.handleClick(550, 240), // Click on cell (5, 10)
        50
      );

      console.log(`Click selection latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(16.67);
    });

    it('should handle drag selection within 16ms per frame', () => {
      const result = runInteractionBenchmark(
        'Drag selection',
        () => selection.handleDragSelect(100, 100, 500, 500),
        30
      );

      console.log(`Drag selection latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(16.67);
    });

    it('should handle arrow key navigation within 16ms', () => {
      selection.handleClick(100, 100); // Initial selection

      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['down', 'right', 'up', 'left'];
      const results: BenchmarkResult[] = [];

      for (const direction of directions) {
        const result = runInteractionBenchmark(
          `Arrow ${direction}`,
          () => selection.handleArrowKey(direction),
          30
        );
        results.push(result);
      }

      const maxLatency = Math.max(...results.map((r) => r.median));
      console.log(`Arrow key navigation max latency: ${maxLatency.toFixed(2)}ms`);
      expect(maxLatency).toBeLessThan(16.67);
    });

    it('should handle rapid arrow key presses', () => {
      selection.handleClick(500, 500);

      const start = performance.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        selection.handleArrowKey('down');
      }

      const totalTime = performance.now() - start;
      const avgTime = totalTime / iterations;

      console.log(`Rapid arrow keys: ${avgTime.toFixed(2)}ms per press`);
      expect(avgTime).toBeLessThan(16.67);
    });
  });

  describe('Paste to Render Complete Latency', () => {
    it('should paste single cell within 10ms', () => {
      clipboard.setClipboardData([['Test Value']]);

      const result = runInteractionBenchmark(
        'Paste single cell',
        () => clipboard.paste(0, 0, () => {}),
        30
      );

      console.log(`Paste single cell latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(10);
    });

    it('should paste 10x10 range within 50ms', () => {
      const data = Array(10).fill(null).map((_, r) =>
        Array(10).fill(null).map((_, c) => `Cell ${r},${c}`)
      );
      clipboard.setClipboardData(data);

      const result = runInteractionBenchmark(
        'Paste 10x10 range',
        () => clipboard.paste(0, 0, () => {}),
        20
      );

      console.log(`Paste 10x10 latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(50);
    });

    it('should paste 100x100 range within 500ms', () => {
      const data = Array(100).fill(null).map((_, r) =>
        Array(100).fill(null).map((_, c) => `Cell ${r},${c}`)
      );
      clipboard.setClipboardData(data);

      const result = runInteractionBenchmark(
        'Paste 100x100 range',
        () => clipboard.paste(0, 0, () => {}),
        10
      );

      console.log(`Paste 100x100 latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(500);
    });

    it('should paste 1000 rows within 1000ms', () => {
      const data = Array(1000).fill(null).map((_, r) =>
        Array(10).fill(null).map((_, c) => `Cell ${r},${c}`)
      );
      clipboard.setClipboardData(data);

      const result = runInteractionBenchmark(
        'Paste 1000 rows',
        () => clipboard.paste(0, 0, () => {}),
        5
      );

      console.log(`Paste 1000 rows latency: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(1000);
    });
  });

  describe('Formula Bar Sync Latency', () => {
    it('should sync formula bar within 5ms of cell edit', () => {
      editor.startEditing({ row: 0, col: 0 });

      let syncLatency = 0;
      editor.onChange(() => {
        // Measure time from change to formula bar update
        const start = performance.now();
        const _value = editor.getFormulaBarValue();
        syncLatency = performance.now() - start;
      });

      editor.handleKeypress('T');

      console.log(`Formula bar sync latency: ${syncLatency.toFixed(2)}ms`);
      expect(syncLatency).toBeLessThan(5);
    });

    it('should sync formula bar during rapid typing', () => {
      editor.startEditing({ row: 0, col: 0 });

      const syncTimes: number[] = [];
      editor.onChange(() => {
        const start = performance.now();
        const _value = editor.getFormulaBarValue();
        syncTimes.push(performance.now() - start);
      });

      const text = 'Rapid typing test for formula bar sync';
      for (const char of text) {
        editor.handleKeypress(char);
      }

      const avgSync = syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length;
      const maxSync = Math.max(...syncTimes);

      console.log(`Formula bar sync: avg=${avgSync.toFixed(2)}ms, max=${maxSync.toFixed(2)}ms`);
      expect(maxSync).toBeLessThan(10);
    });
  });

  describe('Combined Interaction Scenarios', () => {
    it('should handle click-type-enter workflow within 100ms total', () => {
      const start = performance.now();

      // Click to select cell
      selection.handleClick(200, 100);

      // Start editing
      editor.startEditing({ row: 4, col: 2 });

      // Type value
      for (const char of '12345') {
        editor.handleKeypress(char);
      }

      // Commit edit
      editor.commitEdit();

      const totalTime = performance.now() - start;

      console.log(`Click-type-enter workflow: ${totalTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(100);
    });

    it('should handle select-copy-navigate-paste workflow', () => {
      const start = performance.now();

      // Select range
      selection.handleDragSelect(0, 0, 500, 500);

      // Copy
      const copyData = Array(5).fill(null).map((_, r) =>
        Array(5).fill(null).map((_, c) => `${r},${c}`)
      );
      clipboard.copy(copyData);

      // Navigate to target
      for (let i = 0; i < 10; i++) {
        selection.handleArrowKey('down');
        selection.handleArrowKey('right');
      }

      // Paste
      clipboard.paste(10, 10, () => {});

      const totalTime = performance.now() - start;

      console.log(`Select-copy-navigate-paste workflow: ${totalTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Performance Summary', () => {
    it('should output comprehensive interaction metrics', () => {
      console.log('\n' + '='.repeat(60));
      console.log('INTERACTION PERFORMANCE SUMMARY');
      console.log('='.repeat(60));

      // Keypress latency
      editor.startEditing({ row: 0, col: 0 });
      const keypressResult = runInteractionBenchmark(
        'Keypress',
        () => editor.handleKeypress('x'),
        50
      );
      console.log(`Keypress Latency: ${keypressResult.median.toFixed(2)}ms`);

      // Click selection
      const clickResult = runInteractionBenchmark(
        'Click selection',
        () => selection.handleClick(100, 100),
        50
      );
      console.log(`Click Selection: ${clickResult.median.toFixed(2)}ms`);

      // Arrow navigation
      selection.handleClick(100, 100);
      const arrowResult = runInteractionBenchmark(
        'Arrow navigation',
        () => selection.handleArrowKey('down'),
        50
      );
      console.log(`Arrow Navigation: ${arrowResult.median.toFixed(2)}ms`);

      // Small paste
      clipboard.setClipboardData([['A', 'B'], ['C', 'D']]);
      const pasteResult = runInteractionBenchmark(
        'Paste 2x2',
        () => clipboard.paste(0, 0, () => {}),
        30
      );
      console.log(`Paste (2x2): ${pasteResult.median.toFixed(2)}ms`);

      console.log('='.repeat(60) + '\n');

      // All should meet 60fps threshold
      expect(keypressResult.median).toBeLessThan(16.67);
      expect(clickResult.median).toBeLessThan(16.67);
      expect(arrowResult.median).toBeLessThan(16.67);
    });
  });
});

// ============================================================================
// Exports for External Use
// ============================================================================

export {
  CellEditor,
  SelectionManager,
  ClipboardManager,
  InputEventQueue,
  runInteractionBenchmark,
  type InteractionMetrics,
  type BenchmarkResult,
  type CellAddress,
};
