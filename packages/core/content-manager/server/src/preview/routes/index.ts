import type { Plugin } from '@strapi/types';
import { previewRouter } from './preview';

/**
 * The routes will be merged with the other Content Manager routers,
 * so we need to avoid conficts in the router name, and to prefix the path for each route.
 */
export const routes = {
  preview: previewRouter,
} satisfies Plugin.LoadedPlugin['routes'];
