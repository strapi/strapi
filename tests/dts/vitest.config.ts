import { defineConfig } from 'vitest/config';

/**
 * Type tests for the public API of Strapi packages.
 *
 * Tests import packages by name, so they run against the published declaration files in each
 * package's `dist` (build first), the same way an application consumes them.
 */
export default defineConfig({
  test: {
    root: __dirname,
    watch: false,
    typecheck: {
      enabled: true,
      only: true,
      include: ['**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
});
