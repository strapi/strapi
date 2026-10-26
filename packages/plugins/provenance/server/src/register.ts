import type { Core } from '@strapi/types';

import { FIELD_PROVENANCE_UID, TOKEN_PROFILE_UID } from './constants';
import { createDocumentServiceMiddleware } from './middlewares/document-service';
import { isProvenanceReadRoute, QUERY_PARAM } from './middlewares/query-provenance';
import { getService } from './utils';

export const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.documents.use(
    createDocumentServiceMiddleware({
      strapi,
      getDependencies: () => ({
        provenance: getService(strapi, 'provenance'),
        request: getService(strapi, 'request'),
        settings: getService(strapi, 'settings'),
        reviewWorkflows: getService(strapi, 'reviewWorkflows'),
        values: getService(strapi, 'values'),
      }),
    })
  );

  // GraphQL would expose the plugin's tables to API tokens: an agent could forge a review or
  // change its own token profile
  if (strapi.plugin('graphql')) {
    const extension = strapi.plugin('graphql').service('extension');

    extension.shadowCRUD(FIELD_PROVENANCE_UID).disable();
    extension.shadowCRUD(TOKEN_PROFILE_UID).disable();
  }

  // `?provenance=true` on Content API reads; the Content API rejects unknown query params
  strapi.contentAPI.addQueryParams({
    [QUERY_PARAM]: {
      schema: (z) => z.enum(['true', 'false']).optional(),
      matchRoute: isProvenanceReadRoute,
    },
  });
};
