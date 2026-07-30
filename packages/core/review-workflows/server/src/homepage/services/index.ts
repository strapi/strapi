import type { Plugin } from '@strapi/types';

import { createHomepageService } from './homepage';

export const services = {
  homepage: createHomepageService,
} satisfies Plugin.LoadedPlugin['services'];
