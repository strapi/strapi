import type { OxlintOverride } from 'oxlint';

/**
 * Test files.
 *
 * The jest + vitest plugins are enabled at the top level (see base.ts) because
 * the `correctness` category only expands rules for top-level plugins. This
 * override just sets the test environment globals.
 *
 * Trade-off: jest and vitest are near-identical forks, so enabling both emits
 * duplicate diagnostics on shared globals (describe/it/expect). Kept on purpose
 * to support both runners and prefer over- to under-coverage (per Nico).
 * To drop the duplicates later, remove `jest` from base.ts — `vitest` rules
 * still lint jest test files (shared globals).
 */
export const tests = {
  files: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}', '**/__tests__/**', 'tests/**'],
  env: { jest: true },
} satisfies OxlintOverride;
