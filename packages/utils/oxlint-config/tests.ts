import type { OxlintOverride } from 'oxlint';

/**
 * Test files.
 *
 * Sets Jest/Vitest globals for test paths. Vitest plugin rules stay off in
 * Phase 1 (see base.ts) until an ESLint-side test-quality policy exists.
 */
export const tests = {
  files: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}', '**/__tests__/**', 'tests/**'],
  env: { jest: true },
} satisfies OxlintOverride;
