import type { Core } from '@strapi/types';

/**
 * The `database` config that `strapi.config.get('database')` returns.
 * Input type, what applications write in `config/database.ts`: {@link Core.Config.Database}.
 * Loader defaults: none, `loadConfiguration` in `src/configuration/index.ts` sets no `database`
 * field, so this contract equals the input type. `src/Strapi.ts` merges `logger` and
 * `settings.migrations` into the config when it creates the database; this contract does not
 * describe that copy.
 *
 * TODO @Nico Without `config/database.*`, `get('database')` returns `undefined` at runtime, but
 * Strapi cannot start without it. Kept non-optional like the input type.
 */
export type Database = Core.Config.Database;
