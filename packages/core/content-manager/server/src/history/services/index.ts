import type { Plugin } from '@strapi/types';
import { createHistoryService } from './history';

export const services = {
  history: createHistoryService,
} satisfies Plugin.LoadedPlugin['services'];
