import { BaseContext, Middleware as KoaMiddleware } from 'koa';
import { Strapi } from '../../';
import { MiddlewareFactory } from '../../middlewares';

export type Middleware = KoaMiddleware | MiddlewareFactory;
