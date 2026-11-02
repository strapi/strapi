import type { OxlintOverride } from 'oxlint';

/**
 * Backend / Node code (Koa server, core services, CLI, scripts).
 * Mirrors eslint-config-custom/back: Node env + `strapi` global.
 */
export const back = {
  // Oxlint resolves `files` globs from this config's directory, not the repo
  // root, so repo-rooted paths need a leading `**/` to match.
  files: [
    '**/packages/**/server/**',
    '**/packages/core/**/src/**',
    '**/packages/utils/**',
    '**/packages/cli/**',
    '**/packages/providers/**',
  ],
  env: { node: true },
  globals: { strapi: 'readonly' },
  // TODO @Nico Phase 2 — port backend Node/CJS policy (eslint-plugin-node@11):
  // exports-style, no-unsupported-features, etc.
} satisfies OxlintOverride;
