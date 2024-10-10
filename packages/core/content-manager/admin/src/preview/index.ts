/* eslint-disable check-file/no-index */

import { PreviewSidePanel } from './components/PreviewSidePanel';
import { FEATURE_ID } from './constants';

import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const previewAdmin = {
  bootstrap(app) {
    // TODO: Add license registry check when it's available
    if (!window.strapi.future.isEnabled(FEATURE_ID)) {
      return;
    }

    const contentManagerPluginApis = app.getPlugin('content-manager').apis;

    if (
      'addEditViewSidePanel' in contentManagerPluginApis &&
      typeof contentManagerPluginApis.addEditViewSidePanel === 'function'
    ) {
      contentManagerPluginApis.addEditViewSidePanel([PreviewSidePanel]);
    }
  },
} satisfies Partial<PluginDefinition>;

export { previewAdmin };
