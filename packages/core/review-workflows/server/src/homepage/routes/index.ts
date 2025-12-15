import type { Plugin } from '@strapi/types';
import { homepageRouter } from './homepage';

export const routes = {
  homepage: homepageRouter,
} satisfies Plugin.LoadedPlugin['routes'];
