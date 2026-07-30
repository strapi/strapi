import type { Core } from '@strapi/types';

import { getService } from './utils';

/**
 * DB-level safety net for the `strapi.db.query(uid).create(...)` bypass.
 *
 * The document-service middleware (`multitenancy.ts`) stamps
 * `params.data.space` for the canonical write path. This subscriber catches
 * writes that skip the document service entirely — e.g. internal plugin
 * code, content-releases' `strapi_release_actions.updateMany`, raw migrations.
 *
 * It's the §8 "Guarantee 2" of the design doc, applied to writes. (Reads via
 * the bypass are caught by a separate `beforeFindMany`/`beforeFindOne`/
 * `beforeCount` net — deferred to a follow-up slice.)
 */
export const registerLifecycleSubscriber = (strapi: Core.Strapi) => {
  const { getSpaceScopedContentTypes } = getService('content-types');
  const models = getSpaceScopedContentTypes(strapi).map((ct: any) => ct.uid);

  if (models.length === 0) return;

  strapi.db.lifecycles.subscribe({
    models,

    beforeCreate(event: any) {
      stampSpaceOnCreate(strapi, event);
    },
  });
};

/**
 * If the row being created has no explicit `space`, fill it from
 * `ctx.state.spaceId`. Idempotent: never overwrites an existing value.
 */
export const stampSpaceOnCreate = (strapi: Core.Strapi, event: any): void => {
  if (!event?.params?.data) return;
  if (event.params.data.space !== undefined) return;

  const spaceId = strapi.requestContext.get()?.state?.spaceId as number | undefined;
  if (spaceId === undefined) return;

  event.params.data.space = spaceId;
};
