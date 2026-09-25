/**
 * Type-only entry point exposing the contracts of the plugins bundled with `@strapi/strapi`.
 *
 * Applications depend on `@strapi/strapi`, not on the bundled plugins, which are resolved from this
 * package at runtime (see `INTERNAL_PLUGINS` in `@strapi/core`). Under a strict package manager
 * layout such as pnpm's, a direct `import type {} from '@strapi/i18n/types'` in application code does
 * not resolve. Importing this module instead reaches the same declarations through `@strapi/strapi`,
 * which can see its own dependencies wherever they are installed.
 *
 * Importing this module opts the whole compilation into the bundled service contracts, like the
 * plugin entries it forwards to. It is deliberately not re-exported from the package's main entry.
 *
 * @example
 * // types/strapi-plugins.ts — a .ts file, so a failed resolution is reported instead of silenced
 * import type {} from '@strapi/strapi/plugins';
 */
// A namespace re-export, not an `import type {}`: declaration emit elides an import that binds
// nothing, and the registration inside `@strapi/i18n/types` would be dropped from `dist/plugins.d.ts`.
// The `/types` entry both registers the contract and re-exports `/services`.
export type * as i18n from '@strapi/i18n/types';
