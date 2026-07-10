/**
 * Modules given explicit Vite resolve aliases (and included in resolve.dedupe) for the admin bundle.
 * Single source of truth for resolution contract tests.
 *
 * @internal
 */
import { ADMIN_VITE_SINGLETON_MODULES } from './admin-vite-singleton-modules';

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
] as const;

export type AdminViteAliasModule = (typeof ADMIN_VITE_ALIAS_MODULES)[number];

/** Alias modules plus singleton deps that must not be duplicated in the admin graph */
export const ADMIN_VITE_DEDUPE_MODULES = [
  ...ADMIN_VITE_ALIAS_MODULES,
  ...ADMIN_VITE_SINGLETON_MODULES,
] as const;

export { ADMIN_VITE_SINGLETON_MODULES };

/**
 * Alias modules with exact versions declared in @strapi/admin dependencies (not peers).
 */
export const ADMIN_PINNED_ALIAS_MODULES = [
  '@reduxjs/toolkit',
  'react-redux',
  '@strapi/design-system',
  'lodash',
] as const satisfies readonly AdminViteAliasModule[];
