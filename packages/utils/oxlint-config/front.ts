import type { OxlintOverride } from 'oxlint';

/**
 * Admin panel (React/Redux). Mirrors eslint-config-custom/front.
 * React `settings` live at the top level (overrides cannot carry `settings`).
 */
export const front = {
  files: ['packages/**/admin/**', '**/*.tsx'],
  env: { browser: true },
  // TODO @Nico Phase 2 — port admin policy: import/order, import/no-default-export,
  // check-file folder/filename conventions, react display-name, lodash import rules.
} satisfies OxlintOverride;
