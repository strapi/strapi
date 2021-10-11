import { Strapi } from '@strapi/strapi';
import { Middleware } from 'koa';

export type MiddlewareFactory = (config: any, ctx: { strapi: Strapi }) => Middleware | null;
