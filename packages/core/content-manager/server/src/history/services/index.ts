import type { Plugin } from '@strapi/types';
import { createHistoryVersionService } from './history-version';

export const services = {
  'history-version': createHistoryVersionService,
} satisfies Plugin.LoadedPlugin['services'];
