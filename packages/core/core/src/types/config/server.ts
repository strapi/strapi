import type { Core } from '@strapi/types';

/**
 * The `server` config that `strapi.config.get('server')` returns, with loader defaults.
 * Input type, what applications write in `config/server.ts`: {@link Core.Config.Server}.
 * Loader defaults: `defaultServerConfig` in `src/configuration/index.ts`, then `server.url` and
 * `server.absoluteUrl`.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedServerConfig = Core.Config.Server;
