import type { Plugin } from '@strapi/types';

import { createAutosaveService } from './autosave';
import { createLifecyclesService } from './lifecycles';

export const services = {
  autosave: createAutosaveService,
  'autosave-lifecycles': createLifecyclesService,
} satisfies Plugin.LoadedPlugin['services'];
