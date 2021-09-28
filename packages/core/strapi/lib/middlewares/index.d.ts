import { Strapi } from '../';
import { Middleware } from 'koa';

export type MiddlewareFactory = (options: any, ctx: { strapi: Strapi }) => Middleware;
