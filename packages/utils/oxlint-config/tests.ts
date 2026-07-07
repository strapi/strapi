import type { OxlintOverride } from 'oxlint';

/**
 * Test files.
 *
 * The vitest plugin is enabled at the top level (see base.ts) because the
 * `correctness` category only expands rules for top-level plugins. This
 * override just sets the test environment globals (describe/it/expect), which
 * Jest and Vitest share — `env.jest` is the oxlint preset for those globals.
 */
export const tests = {
  files: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}', '**/__tests__/**', 'tests/**'],
  env: { jest: true },
} satisfies OxlintOverride;
