import type { Plugin } from '@strapi/types';

import { autosaveRouter } from './autosave';

export const routes = {
  autosave: autosaveRouter,
} satisfies Plugin.LoadedPlugin['routes'];
