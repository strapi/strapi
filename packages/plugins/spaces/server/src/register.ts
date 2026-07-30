import _ from 'lodash';
import type { Core } from '@strapi/types';

import { isSpaceScopedContentType } from './services/content-types';
import { injectVisibilityRelation } from './settings-visibility';

const SPACE_MODEL_UID = 'plugin::spaces.space';
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
  });
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

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // 0. Upload models opt in before the FK injection below picks them up.
  markUploadModelsAsScoped(strapi);

  // 1. `space` FK on opted-in content types (creates the `space_id` column).
  extendSpaceScopedContentTypes(strapi);

  // 2. Hidden `spaces` M2M on the workspace-bound settings resources — the
  //    visibility binding the settings-visibility pattern reads/writes.
  //    Locales (no-op when i18n isn't installed), admin roles and API tokens.
  injectVisibilityRelation(strapi, I18N_LOCALE_UID);
  injectVisibilityRelation(strapi, 'admin::role');
  injectVisibilityRelation(strapi, 'admin::api-token');
  injectVisibilityRelation(strapi, 'admin::transfer-token');

  // NOTE: the resolve-space Koa middleware is registered in `bootstrap.ts`, not
  // here — `server.initMiddlewares()` runs after the register phase, so a
  // register-time `strapi.server.use()` would land *before* Strapi's error/response
  // middlewares (no `ctx.badRequest`, no error handling downstream of us).
};
