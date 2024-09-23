import type Koa from 'koa';

import type * as UID from '../uid';

import type { Strapi } from './strapi';

export type MiddlewareFactory<T = any> = (
  config: T,
  ctx: { strapi: Strapi }
) => MiddlewareHandler | void;

export type MiddlewareName = UID.Middleware | string;

export type MiddlewareConfig = {
  name?: MiddlewareName;
  resolve?: string;
  config?: unknown;
};

export type MiddlewareHandler = Koa.Middleware;

export type Middleware = MiddlewareHandler | MiddlewareFactory;
