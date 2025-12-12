/* eslint-disable check-file/no-index */

import type { ContentManagerPlugin } from '@content-manager/admin/content-manager';
import { PreviewSidePanel } from '@content-manager/admin/preview/components/PreviewSidePanel';

import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const previewAdmin: Partial<PluginDefinition> = {
  bootstrap(app) {
    const contentManagerPluginApis = app.getPlugin('content-manager')
      .apis as ContentManagerPlugin['config']['apis'];

    contentManagerPluginApis.addEditViewSidePanel([PreviewSidePanel]);
  },
};

export { previewAdmin };
