import type { BuildAdminOptions } from './node/build-admin';

export * from '@strapi/core';

export type * from '@strapi/types';
export type * from './cli/types';

export type { BuildAdminOptions };

/**
 * Build the admin panel for a programmatic app (Phase 2). Façade over the node
 * build pipeline that accepts a `defineApp(...)` definition directly instead of
 * scanning files.
 *
 * The heavy build pipeline (vite/webpack, prettier, …) is loaded lazily via a
 * dynamic import so importing `@strapi/strapi` at runtime stays cheap.
 *
 * @example
 * ```ts
 * import { buildAdmin } from '@strapi/strapi';
 * import app from './app';
 *
 * await buildAdmin({ app });
 * ```
 */
export const buildAdmin = async (options: BuildAdminOptions): Promise<void> => {
  const { buildAdmin: run } = await import('./node/build-admin');
  return run(options);
};
