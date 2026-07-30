import type { Core } from '@strapi/types';

import { isUnscopedContext } from './settings-visibility';
import { getService } from './utils';

/**
 * DB-level READ net for space-scoped content types — the read-side sibling of
 * the `beforeCreate` write stamp in `lifecycles.ts`. The document-service
 * middleware only covers documents-API reads; plenty of code paths (the upload
 * plugin's Media Library queries, internal plugin code, custom controllers) hit
 * `strapi.db.query()` directly and would leak rows across workspaces without
 * this.
 *
 * Filtering rules:
 *   - Active workspace only (no request context / no header → unscoped).
 *   - `runUnscoped(...)` bypasses the net for internal code that legitimately
 *     reads across workspaces (the move service, the delete-guard counters).
 *   - NULL `space_id` rows count as **shared** (visible everywhere): they
 *     predate scoping (e.g. Media Library assets uploaded before the plugin)
 *     and hiding them everywhere would read as data loss.
 */
export const registerDbReadNet = (strapi: Core.Strapi) => {
  const { getSpaceScopedContentTypes } = getService('content-types');
  const models = getSpaceScopedContentTypes(strapi).map((ct: any) => ct.uid);

  if (models.length === 0) {
    return;
  }

  const applySpaceFilter = (event: any) => {
    if (isUnscopedContext()) {
      return;
    }

    const spaceId = strapi.requestContext.get()?.state?.spaceId as number | undefined;
    if (spaceId === undefined) {
      return;
    }

    const spaceCondition = {
      $or: [{ space: { id: spaceId } }, { space: { id: { $null: true } } }],
    };

    event.params = event.params ?? {};
    event.params.where = event.params.where
      ? { $and: [event.params.where, spaceCondition] }
      : spaceCondition;
  };

  strapi.db.lifecycles.subscribe({
    models,

    beforeFindOne(event: any) {
      applySpaceFilter(event);
    },
    beforeFindMany(event: any) {
      applySpaceFilter(event);
    },
    beforeCount(event: any) {
      applySpaceFilter(event);
    },
  });
};
