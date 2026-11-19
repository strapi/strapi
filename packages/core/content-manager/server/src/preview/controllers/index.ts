import type { Core, Plugin } from '@strapi/types';
import { createPreviewController } from './preview';

/** The controllers of the feature, checked before the cast below widens the map. */
export type PreviewControllers = {
  preview: Core.ControllerFactory<'plugin::content-manager.preview'>;
};

export const controllers = {
  preview: createPreviewController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} satisfies PreviewControllers as unknown as Plugin.LoadedPlugin['controllers'];
