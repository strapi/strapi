/* eslint-disable check-file/no-index */

import { PreviewSidePanel } from './components/PreviewSidePanel';

import type { ContentManagerPlugin } from '../content-manager';
import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const previewAdmin: Partial<PluginDefinition> = {
  bootstrap(app) {
    const contentManagerPluginApis = app.getPlugin('content-manager')
      .apis as ContentManagerPlugin['config']['apis'];

    contentManagerPluginApis.addEditViewSidePanel([PreviewSidePanel]);
  },
};

export { previewAdmin };
