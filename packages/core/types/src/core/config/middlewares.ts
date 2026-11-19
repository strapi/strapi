import type {
  MiddlewareConfig,
  MiddlewareHandler,
  MiddlewareName,
  RegisteredMiddlewareEntry,
} from '..';
import type { IsStrict } from '../strictness';

/**
 * A middleware of a third-party plugin, which may register no config contract. Type generation
 * registers the application middlewares (`global::*`, `api::*`), and bundled packages register theirs.
 */
type PluginMiddlewareName = `plugin::${string}`;

/**
 * An entry of `config/middlewares.ts` with strict types: a registered middleware with its config
 * contract, an unregistered `plugin::*` middleware with any config, or a `{ resolve, config }` entry,
 * which loads a package or a path and registers nothing.
 */
type StrictMiddlewareEntry =
  | RegisteredMiddlewareEntry
  | PluginMiddlewareName
  | { name: PluginMiddlewareName; config?: unknown }
  | { resolve: string; config?: unknown; name?: never };

/**
 * Input type of `config/middlewares.ts`. Resolved contract: `ResolvedConfig.Middlewares` in `@strapi/core`.
 *
 * With strict types, each entry is checked: a registered middleware takes its registered config
 * ({@link RegisteredMiddlewareEntry}), e.g. the Koa context of a function `origin` of `strapi::cors`,
 * and its name alone only when that config is optional. Other names are open only under `plugin::*`,
 * for third-party plugins that register nothing, and `{ resolve, config }` entries are open. Handler
 * functions are rejected: the runtime validation of the global middlewares only accepts names and
 * `{ name | resolve, config }` objects, and Strapi fails to start otherwise.
 *
 * A registered `plugin::*` name with a config outside its contract also matches the open `plugin::*`
 * entry, so it compiles.
 *
 * Without strict types, the type is develop's.
 */
export type Middlewares = Array<
  IsStrict extends false
    ? MiddlewareName | MiddlewareConfig | MiddlewareHandler
    : StrictMiddlewareEntry
>;
