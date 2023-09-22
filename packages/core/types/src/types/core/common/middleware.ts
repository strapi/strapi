import type Koa from 'koa';
import type { Strapi } from '../../..';

export type MiddlewareFactory<T = any> = (
  config: T,
  ctx: { strapi: Strapi }
) => MiddlewareHandler | void;

export type MiddlewareName = string;

export type MiddlewareConfig = {
  name?: string;
  resolve?: string;
  config?: unknown;
};

export type MiddlewareHandler = Koa.Middleware;

export type Middleware = MiddlewareHandler | MiddlewareFactory;
