import type { Plugin } from '@strapi/types';
import { createHistoryAuthorsService } from './authors';
import { createHistoryService } from './history';
import { createLifecyclesService } from './lifecycles';

export const services = {
  'history-authors': createHistoryAuthorsService,
  history: createHistoryService,
  lifecycles: createLifecyclesService,
} satisfies Plugin.LoadedPlugin['services'];
