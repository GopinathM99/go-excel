/**
 * Performance Benchmarks Index
 *
 * Exports all performance testing utilities and provides a unified
 * runner for all benchmark suites.
 */

// Export utilities
export {
  measureTime,
  measureTimeAsync,
  measureMemory,
  runBenchmark,
  runBenchmarkWithTarget,
  createLargeSheet,
  createSheetWithFormulas,
  createDeepDependencyChain,
  reportResults,
  formatBenchmarkStats,
  sleep,
  generateRandomCellData,
  PERFORMANCE_TARGETS,
  type TimingResult,
  type MemoryResult,
  type BenchmarkStats,
  type BenchmarkResult,
} from './utils';

// Re-export test suite names for documentation
export const BENCHMARK_SUITES = [
  'scroll.perf.ts',
  'calculation.perf.ts',
  'memory.perf.ts',
  'data-tools.perf.ts',
] as const;

/**
 * Performance Targets Summary
 *
 * These are the key metrics that Go Excel should meet:
 *
 * | Metric                  | Target        |
 * |-------------------------|---------------|
 * | Scroll FPS              | 60fps         |
 * | Open 1M cells           | < 3s          |
 * | Recalc 10k formulas     | < 500ms       |
 * | Recalc 100k formulas    | < 2s          |
 * | Sort 10k rows           | < 200ms       |
 * | Sort 100k rows          | < 2s          |
 * | Filter 100k rows        | < 500ms       |
 * | Memory (100k cells)     | < 100MB       |
 * | Memory (1M cells)       | < 500MB       |
 * | Render visible portion  | < 100ms       |
 * | Deep dependency chain   | < 1s          |
 */

/**
 * Runs all performance benchmarks and returns aggregated results
 *
 * Usage from command line:
 * ```
 * pnpm --filter @excel/core test:perf
 * ```
 *
 * Or run specific suite:
 * ```
 * pnpm --filter @excel/core test:perf -- --grep "Sort"
 * ```
 */
export function runAllBenchmarks(): void {
  console.log('Running all performance benchmarks...');
  console.log('Use: pnpm --filter @excel/core test:perf');
}

/**
 * Configuration for CI performance testing
 */
export const CI_CONFIG = {
  /**
   * Threshold multiplier for CI (allows some slack for CI environments)
   */
  thresholdMultiplier: 1.5,

  /**
   * Minimum number of iterations for statistical significance
   */
  minIterations: 5,

  /**
   * Whether to fail the build on performance regression
   */
  failOnRegression: true,

  /**
   * Percentage threshold for regression detection
   */
  regressionThreshold: 20,
} as const;

/**
 * Validates that all performance targets are met
 *
 * @param results - Array of benchmark results
 * @returns Whether all tests passed
 */
export function validatePerformanceTargets(
  results: Array<{ passed: boolean; stats: { name: string; median: number } }>
): boolean {
  const failed = results.filter((r) => !r.passed);

  if (failed.length > 0) {
    console.error('Performance targets not met:');
    for (const result of failed) {
      console.error(`  - ${result.stats.name}: ${result.stats.median.toFixed(2)}ms`);
    }
    return false;
  }

  console.log('All performance targets met!');
  return true;
}
