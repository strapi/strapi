import type { MiddlewareConfig, MiddlewareHandler, MiddlewareName } from '../common';

export type Middlewares = Array<MiddlewareName | MiddlewareConfig | MiddlewareHandler>;
