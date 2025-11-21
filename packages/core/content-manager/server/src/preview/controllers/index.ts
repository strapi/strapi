import type { Plugin } from '@strapi/types';
import { createPreviewController } from '@content-manager/server/preview/controllers/preview';

export const controllers = {
  preview: createPreviewController,
  /**
   * Casting is needed because the types aren't aware that Strapi supports
   * passing a controller factory as the value, instead of a controller object directly
   */
} as unknown as Plugin.LoadedPlugin['controllers'];
