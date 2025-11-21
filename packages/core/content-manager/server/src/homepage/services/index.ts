import type { Plugin } from '@strapi/types';

import { createHomepageService } from '@content-manager/server/homepage/services/homepage';

export const services = {
  homepage: createHomepageService,
} satisfies Plugin.LoadedPlugin['services'];
