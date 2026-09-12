import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { registerQueryScope } from './scope/query-scope';
import { registerWriteStamping } from './scope/stamp';
import { registerDocumentServiceMiddleware } from './document-service';
import { registerIntegrations } from './integrations';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // 1. Permissions first: both providers refuse registrations once Strapi has
  //    finished loading, and the role scope must exist before any request is
  //    served.
  await strapi.service('plugin::spaces.permissions').registerActions();
  strapi.service('plugin::spaces.permissions').installRoleScope();

  // 2. Settle the space of every request as soon as its identity is known, and
  //    before any policy or controller runs. This covers anonymous callers on
  //    the content API too, so no request reaches the database without an
  //    answer to "which space?".
  strapi.get('auth').onAuthenticated(async (ctx: Context) => {
    await strapi.service('plugin::spaces.access').applyToRequest(ctx);
  });

  // 3. Enforcement. The query scope is the boundary — it narrows every read,
  //    every conditional write and every relation the database populates. The
  //    rest is there so that writes land in the right space and the admin
  //    behaves sensibly, not to hold the line on its own.
  registerQueryScope(strapi);
  registerWriteStamping(strapi);
  registerDocumentServiceMiddleware(strapi);
  registerIntegrations(strapi);

  // 4. Give existing content a space. Runs once; afterwards it is a no-op.
  if (strapi.config.get('plugin::spaces.migrateOnBootstrap', true)) {
    await strapi.service('plugin::spaces.migration').run();
  }
};
