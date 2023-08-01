import type Koa from 'koa';

export type MiddlewareFactory<T = unknown> = (
  config: T,
  ctx: { strapi: Strapi }
) => MiddlewareHandler | void;

export type MiddlewareHandler = Koa.Middleware;

export type Middleware = MiddlewareHandler | MiddlewareFactory;
