import type { Plugin } from '@strapi/types';
import { createHistoryService } from './history';
import { createLifecyclesService } from './lifecycles';

export const services = {
  history: createHistoryService,
  lifecycle: createLifecyclesService,
} satisfies Plugin.LoadedPlugin['services'];
