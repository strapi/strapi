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
    // Outside Nx `lint` graph — `yarn lint` runs per-package eslint only (38 projects).
    'tests/**', // has tests/.eslintrc.cjs but no package lint script
    'scripts/**', // root repo scripts (package scripts/ dirs are per-package eslint)
    '.commitlintrc.ts', // root config, not in Nx lint graph
    'templates/**', // root templates/website demo app
    // Per-package eslint ignores we mirror here (oxlint has no per-package config).
    'packages/cli/create-strapi-app/templates/**',
    // .github/actions/check-pr-status has an Nx lint target; these paths do not.
    '.github/scripts/**',
    '.github/actions/community-pr-triage/**',
  ],
} satisfies Partial<OxlintConfig>;
