import type { Core } from '@strapi/types';

import { patchAdminRolesForSpaces } from './admin-roles-integration';
import { patchApiTokensForSpaces } from './api-tokens-integration';
import { registerContentVisibilityGuards } from './content-visibility';
import { registerDbReadNet } from './db-read-net';
import { registerSettingsCapabilitiesGuard } from './settings-capabilities';
import { patchTransferTokensForSpaces } from './transfer-tokens-integration';
import { patchWebhooksForSpaces } from './webhooks-integration';
import { createMultitenancyMiddleware } from './document-service/multitenancy';
import { registerLifecycleSubscriber } from './lifecycles';
import { patchI18nForSpaces } from './i18n-integration';
import { createResolveSpaceMiddleware } from './middlewares/resolve-space';
import { createPublicationGateMiddleware } from './publication-gate';
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

  // Canonical enforcement path: filter reads / stamp writes on the document service.
  strapi.documents.use(createMultitenancyMiddleware(strapi));

  // Publication is a per-workspace capability: publish/unpublish are refused
  // in workspaces that don't have it.
  strapi.documents.use(createPublicationGateMiddleware(strapi));

  // Safety net for raw `strapi.db.query()` writes that bypass the document service.
  registerLifecycleSubscriber(strapi);

  // …and for raw READS: filters every db.query find/count on space-scoped
  // models (Media Library included) to the active workspace.
  registerDbReadNet(strapi);

  await seedDefaultSpaces(strapi);

  // Content types vanish from workspaces they're not bound to: CM navigation
  // stripped, CM document routes and content API routes 404. Registered after
  // resolve-space so it observes the resolved slug.
  registerContentVisibilityGuards(strapi);

  // Per-workspace Settings capabilities: disabled sections 404 outside the
  // default workspace. Must run before the per-resource scoping middlewares.
  registerSettingsCapabilitiesGuard(strapi);

  // Roles are workspace-bound: managed from the default workspace, scoped
  // elsewhere. Registered after resolve-space so its middlewares observe the
  // resolved slug.
  patchAdminRolesForSpaces(strapi);

  // API tokens are workspace-bound too: a bound token only operates inside its
  // workspaces regardless of the header value (auth-level enforcement).
  patchApiTokensForSpaces(strapi);

  // Transfer tokens: same management scoping as API tokens (runtime transfer
  // enforcement is a dedicated follow-up slice).
  patchTransferTokensForSpaces(strapi);

  // Webhooks: workspace-bound via the plugin store (they aren't a content
  // type) — created in a workspace, visible only there and in default.
  patchWebhooksForSpaces(strapi);

  // Cross-plugin i18n integration (locale visibility per space, per-space default
  // locale). Must run after seeding so its bootstrap-time permission re-sync sees
  // the real space list. No-op when i18n isn't installed.
  await patchI18nForSpaces(strapi);
};
