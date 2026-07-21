/**
 * Modules given explicit Vite resolve aliases (and included in resolve.dedupe) for the admin bundle.
 * Single source of truth for resolution contract tests.
 *
 * @internal
 */
export const ADMIN_VITE_ALIAS_MODULES = [
  'react',
  'react-dom',
  'react-router-dom',
  'styled-components',
  'react-redux',
  '@reduxjs/toolkit',
  '@strapi/design-system',
  '@radix-ui/react-tooltip',
  'lodash',
  'invariant',
  'prismjs',
] as const;

export type AdminViteAliasModule = (typeof ADMIN_VITE_ALIAS_MODULES)[number];

/** Same modules passed to Vite resolve.dedupe */
export const ADMIN_VITE_DEDUPE_MODULES = ADMIN_VITE_ALIAS_MODULES;

/**
 * Alias modules with exact versions declared in @strapi/admin dependencies (not peers).
 */
export const ADMIN_PINNED_ALIAS_MODULES = [
  '@reduxjs/toolkit',
  'react-redux',
  '@strapi/design-system',
  'lodash',
  'invariant',
] as const satisfies readonly AdminViteAliasModule[];
