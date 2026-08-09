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
 * Modules passed to Vite resolve.dedupe (and aliased): the admin alias modules plus the
 * CodeMirror singletons, so every copy collapses onto a single runtime instance.
 */
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
  'invariant',
  'react-dnd',
  'react-dnd-html5-backend',
] as const satisfies readonly AdminViteAliasModule[];
