import type { Core, Plugin } from '@strapi/types';
import { createHistoryVersionController } from './history-version';

/** The controllers of the feature, checked before the cast below widens the map. */
export type HistoryControllers = {
  'history-version': Core.ControllerFactory<'plugin::content-manager.history-version'>;
};

export const controllers = {
  'history-version': createHistoryVersionController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} satisfies HistoryControllers as unknown as Plugin.LoadedPlugin['controllers'];
