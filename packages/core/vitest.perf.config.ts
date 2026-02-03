import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for performance benchmarks
 *
 * This configuration is separate from unit tests to:
 * - Run with longer timeouts
 * - Output detailed timing statistics
 * - Support CI thresholds
 *
 * Usage:
 *   pnpm --filter @excel/core test:perf
 */
export default defineConfig({
  test: {
    // Only include performance test files
    include: ['tests/perf/**/*.perf.ts'],

    // Exclude unit tests
    exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    // Use Node environment for accurate memory measurements
    environment: 'node',

    // Longer timeout for performance tests
    testTimeout: 60000, // 60 seconds

    // Hook timeout
    hookTimeout: 30000,

    // Run tests sequentially to avoid interference
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Disable parallel execution for consistent measurements
    sequence: {
      concurrent: false,
    },

    // Reporter configuration
    reporters: ['default', 'json'],
    outputFile: {
      json: './tests/perf/results.json',
    },

    // Global setup/teardown
    globals: true,

    // Retry failed tests (perf tests can be flaky)
    retry: 1,

    // Coverage is not needed for performance tests
    coverage: {
      enabled: false,
    },

    // Benchmark-specific settings
    benchmark: {
      // Include benchmark files
      include: ['tests/perf/**/*.perf.ts'],

      // Output format
      reporters: ['default'],

      // Output file for CI parsing
      outputFile: './tests/perf/benchmark-results.json',
    },

    // Environment variables for performance tests
    env: {
      NODE_ENV: 'test',
      PERF_TEST: 'true',
    },
  },

  // Optimization for performance tests
  optimizeDeps: {
    include: ['@excel/core'],
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@excel/core': './src',
    },
  },
});
