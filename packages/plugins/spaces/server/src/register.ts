import _ from 'lodash';
import type { Core } from '@strapi/types';

import { patchAuditLogContentType, patchHistoryVersionModel } from './history-audit-integration';
import { isSpaceScopedContentType } from './services/content-types';
import { injectVisibilityRelation } from './settings-visibility';

const SPACE_MODEL_UID = 'plugin::spaces.space';

/**
 * Marks a row as a workspace-local copy of an inherited document: same
 * documentId as the shared original, `space_id` of the workspace that took it
 * over. Private and invisible — it is plumbing, not content.
 */
const makeOverrideFlag = () => ({
  type: 'boolean' as const,
  default: false,
  private: true,
  configurable: false,
  visible: false,
  writable: true,
});
const I18N_LOCALE_UID = 'plugin::i18n.locale';

/**
 * Returns a fresh relation descriptor every call — Strapi mutates attribute metadata
 * during model registration, so sharing one object across CTs corrupts join metadata
 * (same lesson as `makeSpacesRelation` in `settings-visibility/index.ts`).
 *
 * `useJoinTable: false` materializes the FK as a real `space_id` column on the CT's
 * own table (instead of a `<ct>_space_lnk` join table). That keeps raw SQL debugging
 * obvious, makes the tenant filter a plain indexed column comparison, and matches the
 * README's documented storage model.
 */
const makeSpaceRelation = () => ({
  type: 'relation' as const,
  relation: 'manyToOne' as const,
  target: SPACE_MODEL_UID,
  useJoinTable: false,
  writable: true,
  // Private so the content API sanitizer strips the tenant FK from public responses —
  // API consumers select their space via the `X-Strapi-Space-Id` header, never by
  // reading/writing the relation directly.
  private: true,
  configurable: false,
  visible: false,
});

/**
 * Injects the `space` FK onto every content type that opts into space scope via
 * `pluginOptions.spaces.scope: 'space'`. Mirrors how i18n injects `locale` /
 * `localizations` in its own register phase: direct attribute mutation before the
 * DB metadata is built, so the schema sync creates the column automatically.
 */
const extendSpaceScopedContentTypes = (strapi: Core.Strapi) => {
  Object.values(strapi.contentTypes).forEach((contentType) => {
    if (!isSpaceScopedContentType(contentType)) {
      return;
    }

    _.set(contentType.attributes, 'space', makeSpaceRelation());
    _.set(contentType.attributes, 'spaceOverride', makeOverrideFlag());
    addSpaceIndex(strapi, contentType);
  });
};

/**
 * `(space_id, document_id)`, on top of the single-column FK index the schema
 * builder already creates for the relation.
 *
 * It is the index the inheritance exclusion needs — "the documents this
 * workspace has overridden" is `space_id = X AND space_override`, read for
 * every scoped list — and, measured on a million documents, the only composite
 * that never talked the planner out of a better plan. The list-shaped ones
 * (`space_id, published_at, locale`) buy a faster count and lose four times
 * that on the Content Manager's default sort, so they are deliberately absent.
 */
const addSpaceIndex = (
  strapi: Core.Strapi,
  contentType: { collectionName?: string; indexes?: unknown[] }
) => {
  const collectionName = contentType.collectionName;
  if (!collectionName) {
    return;
  }
  // Same helper the core model transform uses, so the name is shortened the
  // same way and stays inside the 63-character identifier limit.
  const name = strapi.db.metadata.identifiers.getIndexName([collectionName, 'space']);
  const indexes = (contentType.indexes ?? []) as Array<{ name?: string }>;
  if (indexes.some((index) => index.name === name)) {
    return;
  }
  contentType.indexes = [...indexes, { name, columns: ['space_id', 'document_id'] }];
};

/**
 * Media Library assets and folders are ALWAYS workspace-scoped — marked
 * in-memory (their schemas live in core, not in a user's schema.json). The
 * regular scoping machinery then applies: `space_id` column, write stamping,
 * and the DB read net filtering every raw `db.query` read the upload plugin
 * performs. Pre-existing rows (`space_id` NULL) count as shared.
 */
const markUploadModelsAsScoped = (strapi: Core.Strapi) => {
  for (const uid of ['plugin::upload.file', 'plugin::upload.folder']) {
    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (contentType) {
      _.set(contentType, ['pluginOptions', 'spaces', 'scope'], 'space');
    }
  }
};

const RELEASE_ACTION_UID = 'plugin::content-releases.release-action';

/**
 * A release action records the workspace of the entry it targets, so each
 * workspace sees its own entries in a cross-workspace release. Stamped by the
 * releases integration; no-op when content-releases isn't installed.
 */
const extendReleaseActions = (strapi: Core.Strapi) => {
  const contentType = strapi.contentTypes[RELEASE_ACTION_UID as keyof typeof strapi.contentTypes];
  if (contentType) {
    _.set(contentType.attributes, 'space', makeSpaceRelation());
  }
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // 0. Upload models opt in before the FK injection below picks them up.
  markUploadModelsAsScoped(strapi);

  // 1. `space` FK on opted-in content types (creates the `space_id` column),
  //    and on release actions (the workspace of the entry they target).
  extendSpaceScopedContentTypes(strapi);
  extendReleaseActions(strapi);

  // 1b. Content history versions and audit logs record their workspace.
  patchHistoryVersionModel(strapi);
  patchAuditLogContentType(strapi);

  // 2. Hidden `spaces` M2M on the workspace-bound settings resources — the
  //    visibility binding the settings-visibility pattern reads/writes.
  //    Locales (no-op when i18n isn't installed), admin roles and API tokens.
  injectVisibilityRelation(strapi, I18N_LOCALE_UID);
  injectVisibilityRelation(strapi, 'admin::role');
  injectVisibilityRelation(strapi, 'admin::api-token');
  injectVisibilityRelation(strapi, 'admin::transfer-token');

  // 3. Users belong to workspaces (direct membership, on top of their roles'
  //    bindings) — join table `admin_users_spaces_lnk`.
  injectVisibilityRelation(strapi, 'admin::user');

  // NOTE: the resolve-space Koa middleware is registered in `bootstrap.ts`, not
  // here — `server.initMiddlewares()` runs after the register phase, so a
  // register-time `strapi.server.use()` would land *before* Strapi's error/response
  // middlewares (no `ctx.badRequest`, no error handling downstream of us).
};
