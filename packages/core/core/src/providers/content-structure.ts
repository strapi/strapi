import type { Core } from '@strapi/types';

import { defineProvider } from './provider';
import { createContentStructureService } from '../services/content-structure';

export default defineProvider({
  init(strapi) {
    strapi.add('content-structure', () => createContentStructureService(strapi));
  },
  async bootstrap(strapi) {
    const contentStructure: Core.ContentStructureService = strapi.get('content-structure');

    // Executes tolerant validation during bootstrap, logs validation warnings
    const cleaned = await contentStructure.getCleanedFile();

    if (cleaned) {
      const count = await contentStructure.countGroups();
      strapi.log.info(`[content-structure] Loaded groups.json with ${count} folder group(s)`);
    }
  },
});
