import codspeedPlugin from '@codspeed/vitest-plugin';
import { defineConfig } from 'vitest/config';

export const unitPreset = defineConfig({
  // Enables CodSpeed instrumentation when running `vitest bench` under the CodSpeed runner.
  // It is a no-op for regular `vitest run` test executions.
  plugins: [codspeedPlugin()],
  test: {
    // Require explicit imports from 'vitest' (no globals)
    globals: false,

    // Node environment for backend unit tests
    environment: 'node',

    // Only run tests with .vitest.test.ts suffix for incremental migration
    include: ['**/*.vitest.test.ts'],

    // Benchmarks executed with `vitest bench`
    benchmark: {
      include: ['**/__bench__/**/*.bench.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },

    // Exclude common non-test files and directories
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.cache/**',
      '**/*.testdata.{js,ts}',
      '**/*.test.utils.{js,ts}',
      '**/*.d.ts',
      '**/__tests__/resources/**',
      '**/tests/resources/**',
    ],

    // Match Jest's default timeout
    testTimeout: 5000,

    // Watch mode settings
    watch: false,
  },
});
