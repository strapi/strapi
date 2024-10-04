import type { Plugin } from '@strapi/types';
import { createPreviewService } from './preview';

export const services = {
  preview: createPreviewService,
} satisfies Plugin.LoadedPlugin['services'];
