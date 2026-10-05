import type { Core } from '@strapi/types';

/**
 * The `admin` config that `strapi.config.get('admin')` returns, with loader defaults.
 * Input type, what applications write in `config/admin.ts`: {@link Core.Config.Admin}.
 * Loader defaults: `admin.serveAdminPanel` in `src/configuration/index.ts`, then `admin.url`,
 * `admin.path` and `admin.absoluteUrl`.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedAdminConfig = Core.Config.Admin;
