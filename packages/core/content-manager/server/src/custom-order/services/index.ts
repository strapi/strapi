import type { Plugin } from '@strapi/types';
import { createCustomOrderService } from './custom-order';

export const services = {
  'custom-order': createCustomOrderService,
} satisfies Plugin.LoadedPlugin['services'];
