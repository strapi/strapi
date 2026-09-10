import type { Core } from '@strapi/types';

import { patchAdminRolesForSpaces } from './admin-roles-integration';
import { patchAdminUsersForSpaces } from './admin-users-integration';
import { patchApiTokensForSpaces } from './api-tokens-integration';
import { backfillLegacyRows, persistPluginTables } from './backfill';
import { registerDefaultOnlyGuard } from './default-only-guard';
import { registerContentVisibilityGuards } from './content-visibility';
import { registerDbReadNet } from './db-read-net';
import { patchTransferTokensForSpaces } from './transfer-tokens-integration';
import { patchWebhooksForSpaces } from './webhooks-integration';
import { createMultitenancyMiddleware } from './document-service/multitenancy';
import { registerLifecycleSubscriber } from './lifecycles';
import { patchHistoryAndAuditLogsForSpaces } from './history-audit-integration';
import { patchI18nForSpaces } from './i18n-integration';
import { createResolveSpaceMiddleware } from './middlewares/resolve-space';
import { patchPreviewForSpaces } from './preview-integration';
import { patchReleasesForSpaces } from './releases-integration';
import { registerSpacesActions } from './services/permissions/actions';

const SPACE_MODEL_UID = 'plugin::spaces.space';

/**
 * Seeds the initial spaces on a fresh install. `default` is the platform's
 * canonical space (the one admins land in); `acme` exists so a new install can
 * demonstrate isolation without any manual setup (see README quick start).
 * Idempotent: runs only when the spaces table is empty.
 */
const seedDefaultSpaces = async (strapi: Core.Strapi) => {
  const count = await strapi.db.query(SPACE_MODEL_UID).count();
  if (count > 0) {
    return;
  }

  await strapi.db.query(SPACE_MODEL_UID).createMany({
    data: [
      { slug: 'default', name: 'Default', color: '#4945FF', status: 'active' },
      { slug: 'acme', name: 'Acme', color: '#EE5E52', status: 'active' },
    ],
  });

  strapi.log.info('[spaces] Seeded initial spaces "default" and "acme".');
};

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Resolve `X-Strapi-Space-Id` → `ctx.state.spaceId` / `ctx.state.spaceSlug` on
  // every request (admin + content API). Registered here — not in register.ts —
  // because core middlewares (error handling, `ctx.badRequest`, …) are initialized
  // between the register and bootstrap phases and must run before us. The router
  // itself mounts at listen() time, so this still precedes every route handler.
  // Must also be `use()`d before `patchI18nForSpaces` adds its route-wrap
  // middlewares below, so they observe the resolved space.
  strapi.server.use(createResolveSpaceMiddleware(strapi));

  // RBAC action gating POST /spaces/move (and the admin UI's move buttons).
  await registerSpacesActions(strapi);

  await seedDefaultSpaces(strapi);

  // Rows that predate workspaces belong to the default workspace; from then on
  // a NULL `space_id` means "shared with every workspace". Runs before the nets
  // are registered and is idempotent (plugin-store marker).
  await backfillLegacyRows(strapi);

  // Keep the plugin tables through a temporary uninstall (EE-only service).
  await persistPluginTables(strapi);

  // Canonical enforcement path: decide the target workspace of every write and
  // run it inside that scope on the document service.
  strapi.documents.use(createMultitenancyMiddleware(strapi));

  // Safety net for raw `strapi.db.query()` writes that bypass the document service.
  registerLifecycleSubscriber(strapi);

  // …and THE read filter: every db.query find/count on a workspace-scoped model
  // (Media Library included) sees the active workspace's rows plus the shared ones.
  registerDbReadNet(strapi);

  // Content types vanish from workspaces they're not bound to: CM navigation
  // stripped, CM document routes and content API routes 404. Registered after
  // resolve-space so it observes the resolved slug.
  registerContentVisibilityGuards(strapi);

  // What belongs to the default workspace only (schema writes, release
  // publishing, workspace management); everything else is decided by roles.
  registerDefaultOnlyGuard(strapi);

  // Roles are workspace-bound: managed from the default workspace, scoped
  // elsewhere. Registered after resolve-space so its middlewares observe the
  // resolved slug.
  patchAdminRolesForSpaces(strapi);

  // Users belong to workspaces: member-only lists outside default, invites
  // that bind (or add an existing account), and the membership guard on the
  // header. Registered after the tokens integration so its auth wrapper runs
  // inside the token one.
  patchAdminUsersForSpaces(strapi);

  // API tokens are workspace-bound too: a bound token only operates inside its
  // workspaces regardless of the header value (auth-level enforcement).
  patchApiTokensForSpaces(strapi);

  // Transfer tokens: same management scoping as API tokens (runtime transfer
  // enforcement is a dedicated follow-up slice).
  patchTransferTokensForSpaces(strapi);

  // Webhooks: workspace-bound via the plugin store (they aren't a content
  // type) — created in a workspace, visible only there and in default.
  patchWebhooksForSpaces(strapi);

  // History versions follow their entry's workspace; audit logs record the
  // workspace they were performed in, and a sub-workspace only sees its own.
  patchHistoryAndAuditLogsForSpaces(strapi);

  // Releases are cross-workspace: each workspace sees its own entries in a
  // release; publishing is a default-workspace action. No-op without the plugin.
  patchReleasesForSpaces(strapi);

  // Live preview: the preview handler receives the active workspace (and its
  // preview origin) under `params.plugins.spaces`.
  patchPreviewForSpaces(strapi);

  // Cross-plugin i18n integration (locale visibility per space, per-space default
  // locale). Must run after seeding so its bootstrap-time permission re-sync sees
  // the real space list. No-op when i18n isn't installed.
  await patchI18nForSpaces(strapi);
};
