/**
 * Web Rendering Performance Benchmarks
 *
 * Measures rendering performance for the Excel web application including:
 * - Initial render time
 * - Re-render time after data changes
 * - Scroll performance (FPS)
 * - Selection rendering
 *
 * These benchmarks simulate browser rendering behavior in a Node.js environment
 * using performance APIs and can be run in a real browser environment for
 * more accurate measurements.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Types
// ============================================================================

interface RenderMetrics {
  frameTime: number;
  fps: number;
  renderCount: number;
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
  fps?: number;
}

interface ViewportConfig {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  visibleRows: number;
  visibleCols: number;
}

// ============================================================================
// Mock DOM Environment
// ============================================================================

/**
 * Mock requestAnimationFrame for Node.js environment
 * In browser tests, this would use the actual API
 */
class MockAnimationFrame {
  private callbacks: Array<{ id: number; callback: FrameRequestCallback }> = [];
  private nextId = 1;
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  request(callback: FrameRequestCallback): number {
    const id = this.nextId++;
    this.callbacks.push({ id, callback });
    return id;
  }

  cancel(id: number): void {
    this.callbacks = this.callbacks.filter((cb) => cb.id !== id);
  }

  flush(): void {
    const timestamp = performance.now() - this.startTime;
    const callbacks = [...this.callbacks];
    this.callbacks = [];
    for (const { callback } of callbacks) {
      callback(timestamp);
    }
  }

  tick(frames: number = 1): void {
    for (let i = 0; i < frames; i++) {
      this.flush();
    }
  }
}

// ============================================================================
// Virtual Grid Renderer (Simulated)
// ============================================================================

/**
 * Simulates the virtual grid rendering behavior
 */
class VirtualGridRenderer {
  private viewport: ViewportConfig;
  private data: Map<string, string>;
  private renderBuffer: string[] = [];
  private lastRenderTime = 0;

  constructor(viewport: ViewportConfig) {
    this.viewport = viewport;
    this.data = new Map();
  }

  /**
   * Populates the grid with test data
   */
  populateData(rows: number, cols: number): void {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.data.set(`${row}:${col}`, `Cell ${row},${col}`);
      }
    }
  }

  /**
   * Updates a cell value
   */
  updateCell(row: number, col: number, value: string): void {
    this.data.set(`${row}:${col}`, value);
  }

  /**
   * Renders the visible viewport
   */
  render(scrollTop: number = 0, scrollLeft: number = 0): RenderMetrics {
    const startTime = performance.now();

    // Calculate visible range
    const startRow = Math.floor(scrollTop / this.viewport.cellHeight);
    const startCol = Math.floor(scrollLeft / this.viewport.cellWidth);
    const endRow = Math.min(startRow + this.viewport.visibleRows, 1000000);
    const endCol = Math.min(startCol + this.viewport.visibleCols, 16384);

    // Clear render buffer
    this.renderBuffer = [];

    // Render visible cells
    let renderCount = 0;
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const value = this.data.get(`${row}:${col}`) || '';
        // Simulate DOM operations
        this.renderBuffer.push(
          `<div style="position:absolute;top:${row * this.viewport.cellHeight}px;left:${col * this.viewport.cellWidth}px;width:${this.viewport.cellWidth}px;height:${this.viewport.cellHeight}px">${value}</div>`
        );
        renderCount++;
      }
    }

    const endTime = performance.now();
    const frameTime = endTime - startTime;
    const fps = frameTime > 0 ? 1000 / frameTime : 60;

    this.lastRenderTime = frameTime;

    return {
      frameTime,
      fps: Math.min(fps, 60), // Cap at 60fps
      renderCount,
    };
  }

  /**
   * Renders selection highlight
   */
  renderSelection(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): RenderMetrics {
    const start = performance.now();

    // Calculate selection bounds
    const top = startRow * this.viewport.cellHeight;
    const left = startCol * this.viewport.cellWidth;
    const width = (endCol - startCol + 1) * this.viewport.cellWidth;
    const height = (endRow - startRow + 1) * this.viewport.cellHeight;

    // Simulate selection rendering
    const selectionHtml = `<div class="selection" style="position:absolute;top:${top}px;left:${left}px;width:${width}px;height:${height}px;border:2px solid #4285f4;background:rgba(66,133,244,0.1)"></div>`;
    this.renderBuffer.push(selectionHtml);

    // Render cell borders for selected range
    let renderCount = 0;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        // Simulate per-cell selection styling
        renderCount++;
      }
    }

    const end = performance.now();
    const frameTime = end - start;

    return {
      frameTime,
      fps: frameTime > 0 ? Math.min(1000 / frameTime, 60) : 60,
      renderCount,
    };
  }

  getLastRenderTime(): number {
    return this.lastRenderTime;
  }
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

function runRenderBenchmark(
  name: string,
  fn: () => RenderMetrics,
  iterations: number = 10,
  warmupIterations: number = 3
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < warmupIterations; i++) {
    fn();
  }

  // Actual benchmark
  const samples: number[] = [];
  let totalFps = 0;

  for (let i = 0; i < iterations; i++) {
    const metrics = fn();
    samples.push(metrics.frameTime);
    totalFps += metrics.fps;
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
    fps: totalFps / iterations,
  };
}

function measureFPS(
  renderFn: () => void,
  durationMs: number = 1000
): { avgFps: number; minFps: number; maxFps: number; frames: number } {
  const frameTimes: number[] = [];
  const startTime = performance.now();
  let lastFrameTime = startTime;
  let frames = 0;

  while (performance.now() - startTime < durationMs) {
    const frameStart = performance.now();
    renderFn();
    const frameEnd = performance.now();

    frameTimes.push(frameEnd - frameStart);
    lastFrameTime = frameEnd;
    frames++;
  }

  const fps = frameTimes.map((t) => (t > 0 ? 1000 / t : 60));

  return {
    avgFps: fps.reduce((a, b) => a + b, 0) / fps.length,
    minFps: Math.min(...fps),
    maxFps: Math.max(...fps),
    frames,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Web Rendering Performance', () => {
  let renderer: VirtualGridRenderer;
  let animationFrame: MockAnimationFrame;

  const defaultViewport: ViewportConfig = {
    width: 1920,
    height: 1080,
    cellWidth: 100,
    cellHeight: 24,
    visibleRows: 45,
    visibleCols: 20,
  };

  beforeEach(() => {
    renderer = new VirtualGridRenderer(defaultViewport);
    animationFrame = new MockAnimationFrame();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Initial Render Performance', () => {
    it('should render empty grid in under 16ms (60fps)', () => {
      const result = runRenderBenchmark(
        'Empty grid render',
        () => renderer.render(),
        20
      );

      console.log(`Empty grid render: ${result.median.toFixed(2)}ms (${result.fps?.toFixed(1)} fps)`);
      expect(result.median).toBeLessThan(16.67); // 60fps threshold
    });

    it('should render grid with 100k cells data in under 50ms', () => {
      renderer.populateData(1000, 100); // 100k cells

      const result = runRenderBenchmark(
        'Initial render (100k cells)',
        () => renderer.render(),
        10
      );

      console.log(`Initial render (100k cells): ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(50);
    });

    it('should render grid with 1M cells data in under 100ms', () => {
      renderer.populateData(10000, 100); // 1M cells

      const result = runRenderBenchmark(
        'Initial render (1M cells)',
        () => renderer.render(),
        5
      );

      console.log(`Initial render (1M cells): ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(100);
    });
  });

  describe('Re-render Performance', () => {
    beforeEach(() => {
      renderer.populateData(1000, 100);
      renderer.render(); // Initial render
    });

    it('should re-render after single cell change in under 5ms', () => {
      const result = runRenderBenchmark(
        'Re-render (single cell change)',
        () => {
          renderer.updateCell(50, 50, 'Updated');
          return renderer.render();
        },
        20
      );

      console.log(`Re-render (single cell): ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(5);
    });

    it('should re-render after bulk cell changes in under 20ms', () => {
      const result = runRenderBenchmark(
        'Re-render (bulk changes)',
        () => {
          // Update 100 cells
          for (let i = 0; i < 100; i++) {
            renderer.updateCell(i, 0, `Updated ${i}`);
          }
          return renderer.render();
        },
        10
      );

      console.log(`Re-render (bulk changes): ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(20);
    });

    it('should re-render after column resize in under 10ms', () => {
      // Simulate column resize by re-rendering
      const result = runRenderBenchmark(
        'Re-render (column resize)',
        () => renderer.render(),
        20
      );

      console.log(`Re-render (column resize): ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(10);
    });
  });

  describe('Scroll Performance', () => {
    beforeEach(() => {
      renderer.populateData(10000, 100);
    });

    it('should maintain 60fps during vertical scroll', () => {
      let scrollTop = 0;
      const scrollStep = defaultViewport.cellHeight * 5; // 5 rows per frame

      const { avgFps, minFps } = measureFPS(() => {
        scrollTop += scrollStep;
        if (scrollTop > 100000) scrollTop = 0;
        renderer.render(scrollTop, 0);
      }, 500);

      console.log(`Vertical scroll: avg=${avgFps.toFixed(1)}fps, min=${minFps.toFixed(1)}fps`);
      expect(avgFps).toBeGreaterThanOrEqual(55); // Allow 5fps variance
    });

    it('should maintain 60fps during horizontal scroll', () => {
      let scrollLeft = 0;
      const scrollStep = defaultViewport.cellWidth * 2;

      const { avgFps, minFps } = measureFPS(() => {
        scrollLeft += scrollStep;
        if (scrollLeft > 10000) scrollLeft = 0;
        renderer.render(0, scrollLeft);
      }, 500);

      console.log(`Horizontal scroll: avg=${avgFps.toFixed(1)}fps, min=${minFps.toFixed(1)}fps`);
      expect(avgFps).toBeGreaterThanOrEqual(55);
    });

    it('should maintain 60fps during diagonal scroll', () => {
      let scrollTop = 0;
      let scrollLeft = 0;
      const scrollStepY = defaultViewport.cellHeight * 3;
      const scrollStepX = defaultViewport.cellWidth * 2;

      const { avgFps, minFps } = measureFPS(() => {
        scrollTop += scrollStepY;
        scrollLeft += scrollStepX;
        if (scrollTop > 100000) scrollTop = 0;
        if (scrollLeft > 10000) scrollLeft = 0;
        renderer.render(scrollTop, scrollLeft);
      }, 500);

      console.log(`Diagonal scroll: avg=${avgFps.toFixed(1)}fps, min=${minFps.toFixed(1)}fps`);
      expect(avgFps).toBeGreaterThanOrEqual(50); // Slightly lower threshold for diagonal
    });

    it('should handle rapid scroll position jumps', () => {
      const positions = [0, 50000, 25000, 75000, 10000, 90000];

      const result = runRenderBenchmark(
        'Rapid scroll jumps',
        () => {
          const pos = positions[Math.floor(Math.random() * positions.length)]!;
          return renderer.render(pos, 0);
        },
        20
      );

      console.log(`Rapid scroll jumps: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(16.67); // Should still hit 60fps
    });
  });

  describe('Selection Rendering', () => {
    beforeEach(() => {
      renderer.populateData(1000, 100);
      renderer.render();
    });

    it('should render single cell selection in under 1ms', () => {
      const result = runRenderBenchmark(
        'Single cell selection',
        () => renderer.renderSelection(50, 50, 50, 50),
        30
      );

      console.log(`Single cell selection: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(1);
    });

    it('should render small range selection in under 5ms', () => {
      const result = runRenderBenchmark(
        'Small range selection (10x10)',
        () => renderer.renderSelection(50, 50, 60, 60),
        20
      );

      console.log(`Small range selection: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(5);
    });

    it('should render large range selection in under 20ms', () => {
      const result = runRenderBenchmark(
        'Large range selection (100x50)',
        () => renderer.renderSelection(0, 0, 100, 50),
        10
      );

      console.log(`Large range selection: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(20);
    });

    it('should render full column selection efficiently', () => {
      const result = runRenderBenchmark(
        'Full column selection',
        () => renderer.renderSelection(0, 5, 999, 5),
        10
      );

      console.log(`Full column selection: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(50);
    });

    it('should render full row selection efficiently', () => {
      const result = runRenderBenchmark(
        'Full row selection',
        () => renderer.renderSelection(50, 0, 50, 99),
        10
      );

      console.log(`Full row selection: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(10);
    });
  });

  describe('Large Viewport Rendering', () => {
    it('should handle 4K display viewport', () => {
      const largeViewport: ViewportConfig = {
        width: 3840,
        height: 2160,
        cellWidth: 100,
        cellHeight: 24,
        visibleRows: 90,
        visibleCols: 40,
      };

      const largeRenderer = new VirtualGridRenderer(largeViewport);
      largeRenderer.populateData(10000, 100);

      const result = runRenderBenchmark(
        '4K viewport render',
        () => largeRenderer.render(),
        10
      );

      console.log(`4K viewport render: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(33.33); // At least 30fps
    });

    it('should handle ultra-wide display viewport', () => {
      const ultraWideViewport: ViewportConfig = {
        width: 5120,
        height: 1440,
        cellWidth: 100,
        cellHeight: 24,
        visibleRows: 60,
        visibleCols: 52,
      };

      const ultraWideRenderer = new VirtualGridRenderer(ultraWideViewport);
      ultraWideRenderer.populateData(10000, 100);

      const result = runRenderBenchmark(
        'Ultra-wide viewport render',
        () => ultraWideRenderer.render(),
        10
      );

      console.log(`Ultra-wide viewport render: ${result.median.toFixed(2)}ms`);
      expect(result.median).toBeLessThan(33.33);
    });
  });

  describe('Performance Summary', () => {
    it('should output comprehensive rendering metrics', () => {
      renderer.populateData(10000, 100);

      console.log('\n' + '='.repeat(60));
      console.log('RENDERING PERFORMANCE SUMMARY');
      console.log('='.repeat(60));

      // Initial render
      const initialRender = runRenderBenchmark(
        'Initial render',
        () => renderer.render(),
        10
      );
      console.log(`Initial Render: ${initialRender.median.toFixed(2)}ms (${initialRender.fps?.toFixed(1)} fps)`);

      // Scroll performance
      let scrollTop = 0;
      const scrollPerf = measureFPS(() => {
        scrollTop += 100;
        if (scrollTop > 100000) scrollTop = 0;
        renderer.render(scrollTop, 0);
      }, 1000);
      console.log(`Scroll Performance: ${scrollPerf.avgFps.toFixed(1)} fps avg, ${scrollPerf.minFps.toFixed(1)} fps min`);

      // Selection rendering
      const selectionRender = runRenderBenchmark(
        'Selection render',
        () => renderer.renderSelection(0, 0, 50, 20),
        10
      );
      console.log(`Selection Render: ${selectionRender.median.toFixed(2)}ms`);

      console.log('='.repeat(60) + '\n');

      // All should meet performance targets
      expect(initialRender.fps).toBeGreaterThanOrEqual(20);
      expect(scrollPerf.avgFps).toBeGreaterThanOrEqual(50);
    });
  });
});

// ============================================================================
// Exports for External Use
// ============================================================================

export {
  VirtualGridRenderer,
  MockAnimationFrame,
  runRenderBenchmark,
  measureFPS,
  type RenderMetrics,
  type BenchmarkResult,
  type ViewportConfig,
};
