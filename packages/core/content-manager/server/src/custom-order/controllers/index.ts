import type { Core, Plugin } from '@strapi/types';
import { createCustomOrderController } from './custom-order';

/** The controllers of the feature, checked before the cast below widens the map. */
export type CustomOrderControllers = {
  'custom-order': Core.ControllerFactory<'plugin::content-manager.custom-order'>;
};

export const controllers = {
  'custom-order': createCustomOrderController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} satisfies CustomOrderControllers as unknown as Plugin.LoadedPlugin['controllers'];
