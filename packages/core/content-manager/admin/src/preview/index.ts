/* eslint-disable check-file/no-index */

import { FEATURE_ID } from './constants';

import type { PluginDefinition } from '@strapi/admin/strapi-admin';

const previewAdmin = {
  bootstrap(app) {
    // TODO: Add license registry check when it's available
    if (!window.strapi.future.isEnabled(FEATURE_ID)) {
      return {};
    }
    // eslint-disable-next-line no-console -- TODO remove when we have real functionality
    console.log('Bootstrapping preview admin');
  },
} satisfies Partial<PluginDefinition>;

export { previewAdmin };
