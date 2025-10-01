import type { Plugin } from '@strapi/types';
import { homepageRouter } from './homepage';

/**
 * The routes will be merged with the other Content Manager routers,
 * so we need to avoid conficts in the router name, and to prefix the path for each route.
 */
export const routes = {
  homepage: homepageRouter,
} satisfies Plugin.LoadedPlugin['routes'];
