import type { Core } from '@strapi/types';

import { registerDbNet } from './db-net';
import { createResolveBranchMiddleware } from './middlewares/resolve-branch';
import { registerRelationShims } from './route-shims/relations';
import { registerBranchesActions } from './services/permissions/actions';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // `X-Strapi-Branch` → `ctx.state.branch` on every request (admin + content API).
  strapi.server.use(createResolveBranchMiddleware(strapi));

  // RBAC actions gating the branch lifecycle routes and the admin UI.
  await registerBranchesActions(strapi);

  // Visibility of raw DB reads (main hides branch rows, a branch sees its
  // chain minus tombstones) and branch stamping of raw creates.
  registerDbNet(strapi);

  // The Content Manager's relation endpoints read join tables directly: on a
  // branch they are re-answered from the document's delta.
  registerRelationShims(strapi);
};
