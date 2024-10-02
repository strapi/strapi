import type { Plugin } from '@strapi/types';
import { createPreviewController } from './preview';

export const controllers = {
  preview: createPreviewController,
} as unknown as Plugin.LoadedPlugin['controllers'];
