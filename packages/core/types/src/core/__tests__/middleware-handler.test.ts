import type Koa from 'koa';

import type { MiddlewareHandler } from '../middleware';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

// With strict types, a handler's result and what `next()` resolves to are `unknown`: Koa ignores
// the result, and `next()` resolves to whatever the next middleware returns (koa-compose).
declare const handlerChecks: [
  Expect<Equal<ReturnType<MiddlewareHandler>, unknown>>,
  Expect<Equal<Awaited<ReturnType<Parameters<MiddlewareHandler>[1]>>, unknown>>,
  Expect<Equal<ReturnType<StrapiInstance['auth']['authenticate']>, unknown>>,
];
handlerChecks satisfies unknown;

// The context stays Koa's.
declare const contextChecks: [
  Expect<Equal<Parameters<MiddlewareHandler>[0], Parameters<Koa.Middleware>[0]>>,
];
contextChecks satisfies unknown;

// Third-party Koa middlewares (koa-helmet, koa-body, @koa/cors) stay handlers, and handlers fit
// `app.use`.
declare const koaMiddleware: Koa.Middleware;
koaMiddleware satisfies MiddlewareHandler;
declare const handler: MiddlewareHandler;
handler satisfies Koa.Middleware;
