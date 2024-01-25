import type { Plugin } from '@strapi/types';
import { createHistoryVersionService } from './history-version';

export const services: Plugin.LoadedPlugin['services'] = {
  'history-version': createHistoryVersionService,
};
