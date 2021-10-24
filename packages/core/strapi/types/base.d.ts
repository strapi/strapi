import { Strapi } from './index';
import { createAdminAPI } from '../lib/services/server/admin-api';
import { createContentAPI } from '../lib/services/server/content-api';
export interface StrapiMiddlewareFactory {
  (config: any, context: { strapi: Strapi }): void;
}

export interface StrapiServices {}
export interface StrapiControllers {}
export interface StrapiPolicies {}
export interface StrapiMiddlewares extends Record<string, StrapiMiddlewareFactory> {}
export interface StrapiPlugins {}
export interface StrapiModules {}
export interface StrapiComponents {}

export interface StrapiApi {
  'content-api': ReturnType<typeof createAdminAPI>;
  admin: ReturnType<typeof createContentAPI>;
}
