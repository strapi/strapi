import { ADMIN_VITE_SINGLETON_MODULES } from './admin-vite-singleton-modules';

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
  // react-dnd holds its DndContext in module scope, and @strapi/admin and
  // @strapi/content-manager each declare react-dnd@16.0.1 themselves. npm hoisting collapses
  // those onto one copy, so the DndProvider rendered by @strapi/admin's AuthenticatedLayout and
  // the useDragLayer call in the content-manager layout share a context only by accident of
  // hoisting. Any tree that keeps the copies separate (pnpm's strict isolation,
  // install-strategy=nested, a plugin pinning its own react-dnd) gives them two different
  // contexts and the Content Manager crashes on mount with
  // "Invariant Violation: Expected drag drop context" (#22392, #22792).
  'react-dnd',
  'react-dnd-html5-backend',
] as const;

export type AdminViteAliasModule = (typeof ADMIN_VITE_ALIAS_MODULES)[number];

/**
 * Modules deduplicated but deliberately NOT aliased.
 *
 * A local plugin (`config/plugins.ts` → `{ resolve: './src/plugins/x' }`) is imported into the
 * generated `.strapi/client/app.js` by a *relative* path, so Rollup treats its built
 * `dist/admin/index.mjs` as project source rather than as a dependency. The bare specifiers that
 * `@strapi/sdk-plugin` externalises into that file are therefore resolved from the plugin's own
 * directory first — and a local plugin installed with npm/pnpm has its own `node_modules`, because
 * the SDK template lists `@strapi/strapi` in the generated `devDependencies`.
 *
 * Without dedupe, every local plugin pulls a second copy of the whole admin application into the
 * build graph (`@strapi/admin`, `@strapi/content-manager`, `@strapi/upload`, … and their trees).
 * Measured on a stock app: one empty generated plugin added 4,940 modules (+99%) and ~840MB of
 * peak build heap, which is what makes `strapi build` OOM once a project has a handful of local
 * plugins (#22946).
 *
 * `@strapi/strapi` is the head of that chain — `@strapi/admin` and the core plugins are reached
 * *through* it — so deduping it alone collapses ~98% of the duplication. `react-intl` and
 * `@strapi/icons` are added because the SDK's plugin template imports them directly rather than
 * via `@strapi/strapi`, so they need their own entries.
 *
 * These MUST NOT be added to {@link ADMIN_VITE_ALIAS_MODULES}: `resolve.alias` prefix-substitutes
 * to a filesystem path and so bypasses the package's `exports` map.
 *   - `@strapi/strapi` exports `./admin` (real target `dist/admin/index.mjs`) — the exact subpath
 *     every plugin imports. Aliasing rewrites it to a non-existent `<pkgdir>/admin` and the build
 *     dies with "[vite:load-fallback] Could not load …/@strapi/strapi/admin".
 *   - `@strapi/icons` exports `./symbols` and fails the same way.
 *   - `@strapi/admin` publishes no `.` export at all, so `getModulePath()` would throw
 *     ERR_PACKAGE_PATH_NOT_EXPORTED at config time. It needs no entry here: deduping
 *     `@strapi/strapi` already collapses it.
 * The contract tests in `__tests__/admin-vite-aliases.test.ts` enforce this separation.
 *
 * @internal
 */
export const ADMIN_VITE_DEDUPE_ONLY_MODULES = [
  '@strapi/strapi',
  '@strapi/icons',
  'react-intl',
] as const;

export type AdminViteDedupeOnlyModule = (typeof ADMIN_VITE_DEDUPE_ONLY_MODULES)[number];

/**
 * Modules passed to Vite resolve.dedupe: the admin alias modules plus the CodeMirror singletons
 * (both of which are also aliased), plus the dedupe-only modules above, so every copy collapses
 * onto a single runtime instance.
 */
export const ADMIN_VITE_DEDUPE_MODULES = [
  ...ADMIN_VITE_ALIAS_MODULES,
  ...ADMIN_VITE_SINGLETON_MODULES,
  ...ADMIN_VITE_DEDUPE_ONLY_MODULES,
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
  'invariant',
  'react-dnd',
  'react-dnd-html5-backend',
] as const satisfies readonly AdminViteAliasModule[];
