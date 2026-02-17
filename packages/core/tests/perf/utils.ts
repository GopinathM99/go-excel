/**
 * Performance Benchmark Utilities
 *
 * Provides utilities for measuring execution time, memory usage,
 * and running benchmarks with statistical analysis.
 */

import { createSheet, setCell, type Sheet } from '../../src/models/Sheet';
import { createCell } from '../../src/models/Cell';
import { numberValue, stringValue } from '../../src/models/CellValue';

/**
 * Performance targets for Go Excel
 */
export const PERFORMANCE_TARGETS = {
  /** Scroll FPS target */
  SCROLL_FPS: 60,
  /** Time to open 1M cells (ms) */
  OPEN_1M_CELLS_MS: 3000,
  /** Time to recalculate 10k formulas (ms) */
  RECALC_10K_FORMULAS_MS: 500,
  /** Time to recalculate 100k formulas (ms) */
  RECALC_100K_FORMULAS_MS: 2000,
  /** Time to sort 10k rows (ms) */
  SORT_10K_ROWS_MS: 200,
  /** Time to sort 100k rows (ms) */
  SORT_100K_ROWS_MS: 2000,
  /** Time to filter 100k rows (ms) */
  FILTER_100K_ROWS_MS: 500,
  /** Memory for 100k cells (MB) */
  MEMORY_100K_CELLS_MB: 100,
  /** Memory for 1M cells (MB) */
  MEMORY_1M_CELLS_MB: 500,
  /** Render visible portion time (ms) */
  RENDER_VISIBLE_MS: 100,
  /** Deep dependency chain recalc (ms) */
  DEEP_DEPENDENCY_MS: 1000,
} as const;

/**
 * Result of a time measurement
 */
export interface TimingResult {
  /** Execution time in milliseconds */
  duration: number;
  /** Result of the measured function */
  result: unknown;
}

/**
 * Result of a memory measurement
 */
export interface MemoryResult {
  /** Memory used before execution (bytes) */
  memoryBefore: number;
  /** Memory used after execution (bytes) */
  memoryAfter: number;
  /** Memory difference (bytes) */
  memoryDelta: number;
  /** Memory delta in MB */
  memoryDeltaMB: number;
  /** Result of the measured function */
  result: unknown;
}

/**
 * Statistics for a benchmark run
 */
export interface BenchmarkStats {
  /** Name of the benchmark */
  name: string;
  /** Number of iterations */
  iterations: number;
  /** Minimum duration (ms) */
  min: number;
  /** Maximum duration (ms) */
  max: number;
  /** Average duration (ms) */
  mean: number;
  /** Median duration (ms) */
  median: number;
  /** Standard deviation (ms) */
  stdDev: number;
  /** 95th percentile (ms) */
  p95: number;
  /** 99th percentile (ms) */
  p99: number;
  /** Operations per second */
  opsPerSecond: number;
  /** Individual run times */
  samples: number[];
}

/**
 * Result of a full benchmark
 */
export interface BenchmarkResult {
  /** Benchmark statistics */
  stats: BenchmarkStats;
  /** Whether the benchmark passed the target */
  passed: boolean;
  /** Target value (if any) */
  target?: number;
  /** Message describing the result */
  message: string;
}

/**
 * Measures the execution time of a synchronous function
 *
 * @param fn - Function to measure
 * @returns Timing result with duration in ms
 */
export function measureTime<T>(fn: () => T): TimingResult {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  return {
    duration: end - start,
    result,
  };
}

/**
 * Measures the execution time of an asynchronous function
 *
 * @param fn - Async function to measure
 * @returns Promise with timing result
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<TimingResult> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  return {
    duration: end - start,
    result,
  };
}

/**
 * Measures memory usage before and after executing a function
 *
 * Note: Memory measurement accuracy depends on garbage collection timing.
 * Results should be treated as approximations.
 *
 * @param fn - Function to measure
 * @returns Memory result with usage stats
 */
export function measureMemory<T>(fn: () => T): MemoryResult {
  // Force garbage collection if available (requires --expose-gc flag)
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }

  const memoryBefore = getMemoryUsage();
  const result = fn();

  // Force GC again to get accurate measurement
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }

  const memoryAfter = getMemoryUsage();
  const memoryDelta = memoryAfter - memoryBefore;

  return {
    memoryBefore,
    memoryAfter,
    memoryDelta,
    memoryDeltaMB: memoryDelta / (1024 * 1024),
    result,
  };
}

/**
 * Gets current memory usage in bytes
 */
function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  // Fallback for browser environment
  if (
    typeof performance !== 'undefined' &&
    (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  ) {
    return (performance as Performance & { memory: { usedJSHeapSize: number } }).memory
      .usedJSHeapSize;
  }
  return 0;
}

/**
 * Runs a benchmark multiple times and collects statistics
 *
 * @param name - Name of the benchmark
 * @param fn - Function to benchmark
 * @param iterations - Number of iterations (default: 10)
 * @param warmupIterations - Number of warmup iterations (default: 2)
 * @returns Benchmark statistics
 */
export function runBenchmark(
  name: string,
  fn: () => void,
  iterations: number = 10,
  warmupIterations: number = 2
): BenchmarkStats {
  // Warmup runs
  for (let i = 0; i < warmupIterations; i++) {
    fn();
  }

  // Actual benchmark runs
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const { duration } = measureTime(fn);
    samples.push(duration);
  }

  // Calculate statistics
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const mean = sum / samples.length;

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;

  // Standard deviation
  const squaredDiffs = samples.map((s) => Math.pow(s - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / samples.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // Percentiles
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);

  return {
    name,
    iterations,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    median,
    stdDev,
    p95: sorted[Math.min(p95Index, sorted.length - 1)]!,
    p99: sorted[Math.min(p99Index, sorted.length - 1)]!,
    opsPerSecond: 1000 / mean,
    samples,
  };
}

/**
 * Runs a benchmark and checks against a target
 *
 * @param name - Name of the benchmark
 * @param fn - Function to benchmark
 * @param targetMs - Target time in milliseconds
 * @param iterations - Number of iterations
 * @returns Benchmark result with pass/fail status
 */
export function runBenchmarkWithTarget(
  name: string,
  fn: () => void,
  targetMs: number,
  iterations: number = 10
): BenchmarkResult {
  const stats = runBenchmark(name, fn, iterations);
  const passed = stats.median <= targetMs;

  return {
    stats,
    passed,
    target: targetMs,
    message: passed
      ? `PASS: ${name} - ${stats.median.toFixed(2)}ms (target: ${targetMs}ms)`
      : `FAIL: ${name} - ${stats.median.toFixed(2)}ms (target: ${targetMs}ms)`,
  };
}

/**
 * Creates a large sheet with test data
 *
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @param options - Options for data generation
 * @returns Sheet populated with test data
 */
export function createLargeSheet(
  rows: number,
  cols: number,
  options: {
    /** Whether to include formulas (default: false) */
    withFormulas?: boolean;
    /** Ratio of formula cells (default: 0.1) */
    formulaRatio?: number;
    /** Whether to use mixed data types (default: true) */
    mixedTypes?: boolean;
  } = {}
): Sheet {
  const { withFormulas = false, formulaRatio = 0.1, mixedTypes = true } = options;

  let sheet = createSheet('Benchmark');

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const address = { row, col };

      if (withFormulas && Math.random() < formulaRatio && row > 0) {
        // Create a formula referencing the cell above
        const formula = `=A${row}`; // Simple formula
        const cell = createCell(address, formula);
        sheet = setCell(sheet, cell);
      } else if (mixedTypes) {
        // Mixed data types
        const typeRandom = Math.random();
        if (typeRandom < 0.6) {
          // 60% numbers
          const cell = createCell(
            address,
            String(Math.random() * 1000),
            numberValue(Math.random() * 1000)
          );
          sheet = setCell(sheet, cell);
        } else if (typeRandom < 0.9) {
          // 30% strings
          const cell = createCell(address, `Text_${row}_${col}`, stringValue(`Text_${row}_${col}`));
          sheet = setCell(sheet, cell);
        } else {
          // 10% empty cells
          // Skip to leave cell empty
        }
      } else {
        // All numbers
        const cell = createCell(address, String(row * cols + col), numberValue(row * cols + col));
        sheet = setCell(sheet, cell);
      }
    }
  }

  return sheet;
}

/**
 * Creates a sheet with formula dependencies
 *
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @returns Sheet with formulas
 */
export function createSheetWithFormulas(rows: number, cols: number): Sheet {
  let sheet = createSheet('FormulaSheet');

  // First row: base values
  for (let col = 0; col < cols; col++) {
    const cell = createCell({ row: 0, col }, String(col + 1), numberValue(col + 1));
    sheet = setCell(sheet, cell);
  }

  // Subsequent rows: formulas referencing previous row
  for (let row = 1; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const prevRow = row - 1;
      const formula = `=A${prevRow + 1}+1`;
      const cell = createCell({ row, col }, formula);
      sheet = setCell(sheet, cell);
    }
  }

  return sheet;
}

/**
 * Creates a deep dependency chain for testing
 *
 * @param depth - Depth of the dependency chain
 * @returns Sheet with deep formula chain
 */
export function createDeepDependencyChain(depth: number): Sheet {
  let sheet = createSheet('DeepChain');

  // Base cell at A1
  const baseCell = createCell({ row: 0, col: 0 }, '1', numberValue(1));
  sheet = setCell(sheet, baseCell);

  // Create chain: A2=A1+1, A3=A2+1, etc.
  for (let row = 1; row < depth; row++) {
    const formula = `=A${row}+1`;
    const cell = createCell({ row, col: 0 }, formula);
    sheet = setCell(sheet, cell);
  }

  return sheet;
}

/**
 * Formats benchmark results for console output
 *
 * @param results - Array of benchmark results
 * @returns Formatted string
 */
export function reportResults(results: BenchmarkResult[]): string {
  const lines: string[] = ['', '='.repeat(80), 'PERFORMANCE BENCHMARK RESULTS', '='.repeat(80), ''];

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const icon = result.passed ? '[OK]' : '[XX]';

    lines.push(`${icon} ${result.stats.name}`);
    lines.push(`    Status: ${status}`);
    lines.push(`    Median: ${result.stats.median.toFixed(2)}ms`);
    if (result.target) {
      lines.push(`    Target: ${result.target}ms`);
    }
    lines.push(`    Min/Max: ${result.stats.min.toFixed(2)}ms / ${result.stats.max.toFixed(2)}ms`);
    lines.push(`    Std Dev: ${result.stats.stdDev.toFixed(2)}ms`);
    lines.push(`    P95/P99: ${result.stats.p95.toFixed(2)}ms / ${result.stats.p99.toFixed(2)}ms`);
    lines.push(`    Ops/sec: ${result.stats.opsPerSecond.toFixed(2)}`);
    lines.push('');
  }

  lines.push('-'.repeat(80));
  lines.push(`Summary: ${passed} passed, ${failed} failed, ${results.length} total`);
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Formats a single benchmark stat for logging
 */
export function formatBenchmarkStats(stats: BenchmarkStats): string {
  return [
    `[${stats.name}]`,
    `  Iterations: ${stats.iterations}`,
    `  Mean: ${stats.mean.toFixed(2)}ms`,
    `  Median: ${stats.median.toFixed(2)}ms`,
    `  Min: ${stats.min.toFixed(2)}ms`,
    `  Max: ${stats.max.toFixed(2)}ms`,
    `  Std Dev: ${stats.stdDev.toFixed(2)}ms`,
    `  P95: ${stats.p95.toFixed(2)}ms`,
    `  P99: ${stats.p99.toFixed(2)}ms`,
    `  Ops/sec: ${stats.opsPerSecond.toFixed(2)}`,
  ].join('\n');
}

/**
 * Sleep for a specified duration (for simulating async operations)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates random cell data for testing
 */
export function generateRandomCellData(
  count: number
): Array<{ row: number; col: number; value: number }> {
  const data: Array<{ row: number; col: number; value: number }> = [];
  for (let i = 0; i < count; i++) {
    data.push({
      row: Math.floor(i / 100),
      col: i % 100,
      value: Math.random() * 1000,
    });
  }
  return data;
}
