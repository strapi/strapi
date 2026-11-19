import type { Core, Plugin } from '@strapi/types';
import { createHomepageController } from './homepage';

/** The controllers of the feature, checked before the cast below widens the map. */
export type HomepageControllers = {
  homepage: Core.ControllerFactory<'plugin::content-manager.homepage'>;
};

export const controllers = {
  homepage: createHomepageController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} satisfies HomepageControllers as unknown as Plugin.LoadedPlugin['controllers'];
