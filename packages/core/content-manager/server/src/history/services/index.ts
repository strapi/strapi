import type { Plugin } from '@strapi/types';
import { createHistoryService } from '@content-manager/server/history/services/history';
import { createLifecyclesService } from '@content-manager/server/history/services/lifecycles';

export const services = {
  history: createHistoryService,
  lifecycles: createLifecyclesService,
} satisfies Plugin.LoadedPlugin['services'];
