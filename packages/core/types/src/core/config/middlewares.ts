import type { MiddlewareConfig, MiddlewareHandler, MiddlewareName } from '..';

/**
 * Input type of `config/middlewares.ts`. Resolved contract: `ResolvedMiddlewaresConfig` in `@strapi/core`.
 */
export type Middlewares = Array<MiddlewareName | MiddlewareConfig | MiddlewareHandler>;
