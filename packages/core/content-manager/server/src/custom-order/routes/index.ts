import type { Plugin } from '@strapi/types';
import { customOrderRouter } from './custom-order';

/**
 * The routes will be merged with the other Content Manager routers,
 * so we need to avoid conflicts in the router name.
 */
export const routes = {
  'custom-order': customOrderRouter,
} satisfies Plugin.LoadedPlugin['routes'];
