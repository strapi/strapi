import type { OxlintConfig } from 'oxlint';

/**
 * Shared baseline applied to every file in the monorepo.
 *
 * Native plugins mirror the current ESLint stack (typescript, react,
 * jsx-a11y, import) plus unicorn correctness rules.
 *
 * vitest is enabled here at the top level (not in the test override): the
 * `correctness` category only expands rules for top-level plugins, so a plugin
 * added inside an override gets no category rules. Its rules target test
 * patterns (describe/it/expect) and are inert on app code; they also apply to
 * Jest test files (shared globals) while the repo migrates unit tests to Vitest.
 */
export const base = {
  plugins: ['typescript', 'react', 'jsx-a11y', 'import', 'unicorn', 'vitest'],
  categories: {
    // Phase 1: correctness only (definitely-wrong code, lowest noise).
    // TODO @Nico Phase 2 — port the ESLint/Airbnb policy surface here
    // (suspicious/style/restriction) once the rule matrix is agreed. Goal is
    // to reproduce what ESLint covers today, preferring over- to under-coverage.
    correctness: 'error',
  },
  ignorePatterns: [
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.nx/**',
    '**/test-apps/**',
    // examples are sandboxes (see AGENTS.md).
    // TODO @Nico Phase 2 — `yarn lint` lints kitchensink + todo-example; decide
    // whether to lint those example apps here too.
    'examples/**',
  ],
} satisfies Partial<OxlintConfig>;
