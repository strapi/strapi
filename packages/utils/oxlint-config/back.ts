import type { OxlintOverride } from 'oxlint';

/**
 * Backend / Node code (Koa server, core services, CLI, scripts).
 * Mirrors eslint-config-custom/back: Node env + `strapi` global.
 */
export const back = {
  files: [
    'packages/**/server/**',
    'packages/core/**/src/**',
    'packages/utils/**',
    'packages/cli/**',
    'packages/providers/**',
    'scripts/**',
  ],
  env: { node: true },
  globals: { strapi: 'readonly' },
  // TODO @Nico Phase 2 — port backend Node/CJS policy (eslint-plugin-node@11):
  // exports-style, no-unsupported-features, etc.
} satisfies OxlintOverride;
