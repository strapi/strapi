import type { Core } from '@strapi/types';

import { createQueryProvenanceMiddleware } from './middlewares/query-provenance';
import { getService } from './utils';

const ACTIONS = [
  {
    section: 'settings',
    category: 'Provenance',
    subCategory: 'Settings',
    pluginName: 'provenance',
    displayName: 'Read',
    uid: 'settings.read',
  },
  {
    section: 'settings',
    category: 'Provenance',
    subCategory: 'Settings',
    pluginName: 'provenance',
    displayName: 'Update',
    uid: 'settings.update',
  },
];

export const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.service('admin::permission').actionProvider.registerMany(ACTIONS);

  getService(strapi, 'reviewWorkflows').subscribeToWorkflowChanges();
  await getService(strapi, 'provenance').createMissingLocks();

  // The router is mounted when the server listens, after bootstrap: this runs around it
  strapi.server.use(createQueryProvenanceMiddleware({ strapi }));
};
