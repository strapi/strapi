import type { Plugin } from '@strapi/types';

import { createPreviewService } from '@content-manager/server/preview/services/preview';
import { createPreviewConfigService } from '@content-manager/server/preview/services/preview-config';

export const services = {
  preview: createPreviewService,
  'preview-config': createPreviewConfigService,
} satisfies Plugin.LoadedPlugin['services'];
