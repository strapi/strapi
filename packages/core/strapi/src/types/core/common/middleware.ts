import type Koa from 'koa';
import type { Strapi } from '../../../Strapi';

export type MiddlewareFactory<T = any> = (
  config: T,
  ctx: { strapi: Strapi }
) => MiddlewareHandler | void;

export type MiddlewareHandler = Koa.Middleware;

export type Middleware = MiddlewareHandler | MiddlewareFactory;
