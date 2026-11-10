import type { MiddlewareConfig, MiddlewareHandler, MiddlewareName } from '..';
import type { IsStrict } from '../strictness';

/**
 * Input type of `config/middlewares.ts`. Resolved contract: `ResolvedConfig.Middlewares` in `@strapi/core`.
 *
 * With strict types, handler functions are rejected: the runtime validation of the global
 * middlewares only accepts names and `{ name | resolve, config }` objects, and Strapi fails to start
 * otherwise. Without strict types, the type is develop's.
 */
export type Middlewares = Array<
  MiddlewareName | MiddlewareConfig | (IsStrict extends false ? MiddlewareHandler : never)
>;
