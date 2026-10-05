import type { Core } from '@strapi/types';

/**
 * The `database` config that `strapi.config.get('database')` returns, with loader defaults.
 * Input type, what applications write in `config/database.ts`: {@link Core.Config.Database}.
 * Loader defaults: none in `src/configuration/index.ts`. `src/Strapi.ts` merges `logger` and
 * `settings.migrations` into a copy when it creates the database.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedDatabaseConfig = Core.Config.Database;
