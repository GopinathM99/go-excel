# Performance Benchmarks

This directory contains performance benchmarks for the Go Excel core package.

## Performance Targets

| Metric               | Target  |
| -------------------- | ------- |
| Scroll FPS           | 60fps   |
| Open 1M cells        | < 3s    |
| Recalc 10k formulas  | < 500ms |
| Recalc 100k formulas | < 2s    |
| Sort 10k rows        | < 200ms |
| Sort 100k rows       | < 2s    |
| Filter 100k rows     | < 500ms |
| Memory (100k cells)  | < 100MB |
| Memory (1M cells)    | < 500MB |

## Running Benchmarks

### Run All Performance Tests

```bash
# From project root
pnpm --filter @excel/core test:perf

# Or from packages/core directory
pnpm test:perf
```

### Run Specific Benchmark Suite

```bash
# Scroll/render tests
pnpm --filter @excel/core test:perf -- --grep "Scroll"

# Calculation tests
pnpm --filter @excel/core test:perf -- --grep "Calculation"

# Memory tests
pnpm --filter @excel/core test:perf -- --grep "Memory"

# Data tools tests (sort/filter)
pnpm --filter @excel/core test:perf -- --grep "Data Tools"
```

### Run with Memory Profiling

For accurate memory measurements, run with the `--expose-gc` flag:

```bash
node --expose-gc ./node_modules/vitest/vitest.mjs run --config vitest.perf.config.ts
```

## Benchmark Suites

### scroll.perf.ts

Tests scroll and render performance:

- Render 100k rows (visible portion only)
- Scroll through 100k rows (FPS measurement)
- Render with frozen panes (rows/columns)
- Cell selection across large ranges

### calculation.perf.ts

Tests formula calculation performance:

- Recalculate 10k cells with formulas
- Recalculate 100k cells with formulas
- Deep dependency chain (1000 levels)
- Circular reference detection
- Complex formula parsing (nested IFs, VLOOKUPs)

### memory.perf.ts

Tests memory usage and leak detection:

- Memory for 100k cells
- Memory for 1M cells
- Memory leak detection (create/destroy cycles)
- Memory with large undo stack
- Sparse data memory efficiency

### data-tools.perf.ts

Tests sort and filter performance:

- Sort 10k rows (single/multi-column)
- Sort 100k rows
- Filter 100k rows (single/multiple criteria)
- Get unique values from 100k rows

## Benchmark Utilities

The `utils.ts` file provides:

```typescript
// Measure execution time
measureTime(fn) -> { duration: number, result: T }

// Measure memory usage
measureMemory(fn) -> { memoryBefore, memoryAfter, memoryDeltaMB, result }

// Run benchmark with statistics
runBenchmark(name, fn, iterations) -> BenchmarkStats

// Run benchmark with pass/fail target
runBenchmarkWithTarget(name, fn, targetMs, iterations) -> BenchmarkResult

// Create test data
createLargeSheet(rows, cols, options)
createSheetWithFormulas(rows, cols)
createDeepDependencyChain(depth)

// Format and report results
reportResults(results) -> string
```

## CI Integration

Performance tests can be run in CI with failure thresholds:

```yaml
# Example GitHub Actions workflow
- name: Run Performance Tests
  run: pnpm --filter @excel/core test:perf
  env:
    CI: true
```

The tests will fail if performance targets are not met, preventing regressions.

### CI Configuration

```typescript
const CI_CONFIG = {
  thresholdMultiplier: 1.5, // Allow 50% slack for CI
  minIterations: 5, // Statistical significance
  failOnRegression: true, // Fail build on regression
  regressionThreshold: 20, // 20% threshold for regression
};
```

## Writing New Benchmarks

```typescript
import { describe, it, expect } from 'vitest';
import {
  measureTime,
  runBenchmarkWithTarget,
  createLargeSheet,
  PERFORMANCE_TARGETS,
} from './utils';

describe('My Performance Tests', () => {
  it('should meet performance target', () => {
    const sheet = createLargeSheet(10000, 10);

    const result = runBenchmarkWithTarget(
      'My Operation',
      () => performOperation(sheet),
      200, // Target: 200ms
      10 // 10 iterations
    );

    expect(result.passed).toBe(true);
  });
});
```

## Interpreting Results

Example output:

```
================================================================================
PERFORMANCE BENCHMARK RESULTS
================================================================================

[OK] Sort 10k rows (single column, ascending)
    Status: PASS
    Median: 45.32ms
    Target: 200ms
    Min/Max: 42.15ms / 51.23ms
    Std Dev: 3.21ms
    P95/P99: 48.45ms / 51.23ms
    Ops/sec: 22.07

[XX] Recalculate 100k formulas
    Status: FAIL
    Median: 2350.12ms
    Target: 2000ms
    Min/Max: 2210.45ms / 2520.33ms
    ...

--------------------------------------------------------------------------------
Summary: 15 passed, 1 failed, 16 total
================================================================================
```

## Performance Tips

1. **Virtual Scrolling**: Only render visible cells
2. **Sparse Storage**: Only store non-empty cells
3. **Lazy Calculation**: Recalculate only affected cells
4. **Dependency Graph**: Use topological sort for efficient recalc order
5. **Immutable Updates**: Use structural sharing for undo stack
6. **String Interning**: Share common string values
7. **Batch Operations**: Group multiple cell updates
