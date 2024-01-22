import type { Plugin } from '@strapi/types';

/**
 * The routes will me merged with the other Content Manager routers,
 * so we need to avoid conficts in the router name, and to prefix the path for each route.
 */
export const routes: Plugin.LoadedPlugin['routes'] = {};
