import type { Core } from '@strapi/types';

import { getService } from '../utils';

/**
 * Resolves the `folder` service for an MCP handler.
 *
 * Unlike `upload`, the `folder` service is registered as a plain object literal rather than a
 * factory (see `services/index.ts`), so its methods close over the module-scope ambient `strapi`
 * and query `global.strapi.db` regardless of which instance is passed to `getService`. Passing an
 * instance therefore selects the right plugin registry but does *not* bind the queries to it.
 *
 * Handlers must not paper over that with a bare `getService('folder', strapi)` call, which reads
 * as instance-bound but is not. Threading an instance through every folder-service method is a
 * broader refactor than the MCP surface should carry: `create`, `update` and `deleteByIds` reach
 * for `strapi.db`, `strapi.eventHub` and `strapi.getModel`, `update` runs a multi-statement
 * transaction, and every admin controller and validator already depends on the ambient form.
 *
 * So the dependency is made explicit and asserted instead. A single-app server is unaffected:
 * `createStrapi` assigns its instance to `global.strapi`, so the two agree. If they ever diverge
 * — a second Strapi instance in one process — this throws rather than silently reading or writing
 * the wrong app's media library.
 */
export const getFolderService = (strapi: Core.Strapi) => {
  if (strapi !== global.strapi) {
    throw new Error(
      'The upload `folder` service is bound to the ambient `global.strapi`, but the MCP handler ' +
        'received a different Strapi instance. Folder queries would run against the wrong app. ' +
        'Convert the `folder` service to a factory before serving MCP from a non-global instance.'
    );
  }

  return getService('folder', strapi);
};
