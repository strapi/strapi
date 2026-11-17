import type {
  MiddlewareConfig,
  MiddlewareHandler,
  MiddlewareName,
  RegisteredMiddlewareEntry,
} from '..';
import type { IsStrict } from '../strictness';

/**
 * Input type of `config/middlewares.ts`. Resolved contract: `ResolvedConfig.Middlewares` in `@strapi/core`.
 *
 * With strict types, handler functions are rejected: the runtime validation of the global
 * middlewares only accepts names and `{ name | resolve, config }` objects, and Strapi fails to start
 * otherwise. An entry that names a registered middleware types its `config` by the registered
 * contract ({@link RegisteredMiddlewareEntry}), e.g. the Koa context of a function `origin` of
 * `strapi::cors`. Unregistered names and `resolve` entries keep develop's type. Without strict
 * types, the type is develop's.
 */
export type Middlewares = Array<
  | MiddlewareName
  | MiddlewareConfig
  | (IsStrict extends false ? MiddlewareHandler : RegisteredMiddlewareEntry)
>;
