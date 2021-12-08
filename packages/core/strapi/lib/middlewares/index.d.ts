import { Strapi } from '../';
import { Middleware } from 'koa';

export type MiddlewareFactory = (config: any, ctx: { strapi: Strapi }) => Middleware | null;
export type Middleware = Middleware;
