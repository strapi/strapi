import { BaseContext, Middleware as KoaMiddleware } from 'koa';
import { Strapi } from './index';
import { default as apisRegistry } from '../lib/core/registries/apis';
import { default as configRegistry } from '../lib/core/registries/config';
import { default as contentTypesRegistry } from '../lib/core/registries/content-types';
import { default as controllersRegistry } from '../lib/core/registries/controllers';
import { default as hooksRegistry } from '../lib/core/registries/hooks';
import { default as middlewaresRegistry } from '../lib/core/registries/middlewares';
import { default as modulesRegistry } from '../lib/core/registries/modules';
import { default as pluginsRegistry } from '../lib/core/registries/plugins';
import { default as policiesRegistry } from '../lib/core/registries/policies';
import { default as servicesRegistry } from '../lib/core/registries/services';
import { default as authService } from '../lib/services/auth';

export interface PolicyContext extends BaseContext {
  type: string;
  is(name): string | false;
}

export type Policy = (ctx: PolicyContext, { strapi: Strapi }) => boolean | undefined;

export type Service = {
  [key: string]: any;
};
export type ServiceFactory = ({ strapi: Strapi }) => Service;

export type MiddlewareFactory = (config: any, ctx: { strapi: Strapi }) => Middleware | null;
export type Middleware = KoaMiddleware | MiddlewareFactory;

export interface StrapiCoreRegistries {
  apis: ReturnType<typeof apisRegistry>;
  config: ReturnType<typeof configRegistry>;
  'content-types': ReturnType<typeof contentTypesRegistry>;
  controllers: ReturnType<typeof controllersRegistry>;
  hooks: ReturnType<typeof hooksRegistry>;
  middlewares: ReturnType<typeof middlewaresRegistry>;
  modules: ReturnType<typeof modulesRegistry>;
  plugins: ReturnType<typeof pluginsRegistry>;
  policies: ReturnType<typeof policiesRegistry>;
  services: ReturnType<typeof servicesRegistry>;
  auth: ReturnType<typeof authService>;
}
