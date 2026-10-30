import type { Core } from '@strapi/types';

import { registerAuditEvents } from './audit-logs';
import { createDocumentServiceMiddleware } from './middlewares/document-service';
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

  registerAuditEvents(strapi);

  // Registered here, not in `register`: an approval queue registered there must run around
  // this middleware, otherwise the publish guard refuses what the queue would have parked
  strapi.documents.use(
    createDocumentServiceMiddleware({
      strapi,
      getDependencies: () => ({
        provenance: getService(strapi, 'provenance'),
        request: getService(strapi, 'request'),
        settings: getService(strapi, 'settings'),
        values: getService(strapi, 'values'),
      }),
    })
  );

  if (getService(strapi, 'settings').isProvenanceEnabled()) {
    await getService(strapi, 'provenance').createMissingLocks();
  }

  // The router is mounted when the server listens, after bootstrap: this runs around it
  strapi.server.use(createQueryProvenanceMiddleware({ strapi }));
};
