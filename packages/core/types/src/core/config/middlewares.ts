import type { MiddlewareConfig, MiddlewareHandler, MiddlewareName } from '..';

export type Middlewares = Array<MiddlewareName | MiddlewareConfig | MiddlewareHandler>;
