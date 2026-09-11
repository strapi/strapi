import type { Core } from '@strapi/types';

import { getService } from '../utils';

/**
 * Asserts that an MCP handler's Strapi instance is the ambient `global.strapi`.
 *
 * Two of the upload plugin's services — `folder` and `file` — are registered as plain object
 * literals rather than factories (see `services/index.ts`), so their methods close over the
 * module-scope ambient `strapi` and query `global.strapi.db` regardless of which instance is
 * passed to `getService`. Passing an instance therefore selects the right plugin registry but
 * does *not* bind the queries to it.
 *
 * The folder tools reach `folder` directly. The asset write tools reach `file` transitively:
 * `upload.updateFileInfo` resolves it with a bare `getService('file')` (`services/upload.ts`),
 * and `file.getFolderPath` then queries the ambient `strapi.db`. So a handler that looks
 * instance-bound can still mix ambient reads with instance-bound writes.
 *
 * Threading an instance through both services is a broader refactor than the MCP surface should
 * carry: `create`, `update` and `deleteByIds` reach for `strapi.db`, `strapi.eventHub` and
 * `strapi.getModel`, `update` runs a multi-statement transaction, and every admin controller and
 * validator already depends on the ambient form.
 *
 * So the dependency is made explicit and asserted instead. Handlers call this in their factory
 * body — at handler construction, not per call — so a mismatch fails while the tool is being
 * registered rather than surfacing to an agent as tool output mid-conversation.
 *
 * A single-app server is unaffected: `createStrapi` assigns its instance to `global.strapi`, so
 * the two agree. If they ever diverge — a second Strapi instance in one process — this throws
 * rather than silently reading or writing the wrong app's media library.
 */
export const assertAmbientInstance = (strapi: Core.Strapi) => {
  if (strapi !== global.strapi) {
    throw new Error(
      'The upload `folder` and `file` services are bound to the ambient `global.strapi`, but an ' +
        'MCP handler was constructed with a different Strapi instance. Media queries would run ' +
        'against the wrong app. Convert those services to factories before serving MCP from a ' +
        'non-global instance.'
    );
  }
};

/**
 * Resolves the `folder` service for an MCP handler.
 *
 * A bare `getService('folder', strapi)` reads as instance-bound but is not — see
 * `assertAmbientInstance` for why. Handlers assert the instance once at construction; this keeps
 * the resolution behind a named helper so the call sites do not reintroduce the misleading form.
 */
export const getFolderService = (strapi: Core.Strapi) => getService('folder', strapi);
