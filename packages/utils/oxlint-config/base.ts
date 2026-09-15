import type { OxlintConfig } from 'oxlint';

/**
 * Shared baseline applied to every file in the monorepo.
 *
 * Native plugins mirror the current ESLint stack (typescript, react, import)
 * plus unicorn correctness rules. `unicorn` is kept monorepo-wide (including
 * admin/TSX) for over-coverage during migration — ESLint does not enable
 * eslint-plugin-unicorn today, but the correctness rules are low-noise and
 * catch real bugs (e.g. useless spread).
 *
 * `jsx-a11y` is deferred: ESLint front/typescript has 0 active jsx-a11y rules
 * (legacy javascript config had one warn rule). Revisit in Phase 2 if we want
 * a11y enforcement via OxLint.
 *
 * `vitest` is deferred for Phase 1: ESLint has no eslint-plugin-vitest today, so
 * enabling it only produced ~500 test-only diagnostics with no ESLint parity
 * signal. Revisit after an intentional Jest/Vitest ESLint policy exists.
 */
export const base = {
  plugins: ['typescript', 'react', 'import', 'unicorn'],
  categories: {
    // Blocking bar: correctness plus extra-policy `perf`.
    // Later categories (suspicious/pedantic/style) are not extra policy yet.
    correctness: 'error',
    perf: 'error',
  },
  rules: {
    // Yup `.when({ then, otherwise })` objects are not Promise thenables; the
    // rule cannot distinguish DSL keys from real thenable misuse.
    'unicorn/no-thenable': 'off',
    // Behavioral / intentional deps; revisit when enabling broader react-hooks.
    'react/exhaustive-deps': 'off',
    // Backend ESLint turns this off on purpose (sequential await is allowed).
    // ESLint only errors it on a 62-file frontend JS surface (2 projects).
    // A category enable would expand that ban onto the backend (~495 of the
    // Aug 20 +685 perf delta). Frontend JS stays covered by ESLint.
    'eslint/no-await-in-loop': 'off',
    // Extra-policy `perf` checks cleared before joining the blocking bar.
    'unicorn/prefer-set-has': 'error',
    'react/no-object-type-as-default-prop': 'error',
    'react/jsx-no-constructed-context-values': 'error',
    'react/no-array-index-key': 'error',
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
    // Parser TS(1016) on can/cannot cannot be suppressed locally; restore via CMS-1692.
    'packages/core/content-manager/server/src/services/permission-checker.ts',
  ],
} satisfies Partial<OxlintConfig>;
