import type { Plugin } from '@strapi/types';
import { createHistoryVersionController } from './history-version';

export const controllers = {
  'history-version': createHistoryVersionController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} as unknown as Plugin.LoadedPlugin['controllers'];
