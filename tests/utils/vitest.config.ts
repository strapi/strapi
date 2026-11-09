import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the e2e helpers, which the root config (packages only) doesn't cover:
 * `yarn vitest run --config tests/utils/vitest.config.ts`
 */
export default defineConfig({
  test: {
    root: __dirname,
    include: ['__tests__/**/*.test.ts'],
  },
});
