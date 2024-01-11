import type Koa from 'koa';
import type { Common, Strapi } from '../../..';

export type MiddlewareFactory<T = any> = (
  config: T,
  ctx: { strapi: Strapi }
) => MiddlewareHandler | void;

export type MiddlewareName = Common.UID.Middleware | string;

export type MiddlewareConfig = {
  name?: MiddlewareName;
  resolve?: string;
  config?: unknown;
};

export type MiddlewareHandler = Koa.Middleware;

export type Middleware = MiddlewareHandler | MiddlewareFactory;
