import type { Core, Plugin } from '@strapi/types';
import { createHomepageController } from './homepage';

export const controllers = {
  homepage: createHomepageController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} satisfies {
  homepage: Core.ControllerFactory<'plugin::content-manager.homepage'>;
} as unknown as Plugin.LoadedPlugin['controllers'];
