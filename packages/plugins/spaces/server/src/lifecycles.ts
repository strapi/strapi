import type { Core } from '@strapi/types';

import { getService } from './utils';
import { isSharedContentType } from './services/content-types';
import { assertWritable } from './services/access';
import {
  getRequestSpace,
  getScopeOverride,
  isOverrideScope,
  isUnscopedContext,
  runUnscoped,
} from './utils/space-scope';

/**
 * DB-level safety net for raw `strapi.db.query(uid)` writes that bypass the
 * document service (internal plugin code — the upload plugin above all —,
 * content-releases' `updateMany`, migrations).
 *
 *   - `beforeCreate` stamps the workspace (see `stampSpaceOnCreate`);
 *   - `beforeUpdate` / `beforeDelete` refuse, from a sub-workspace, single-row
 *     writes on rows that workspace may not edit (see `refuseSharedRowWrite`).
 */
export const registerLifecycleSubscriber = (strapi: Core.Strapi) => {
  const { getSpaceScopedContentTypes } = getService('content-types');
  const models = getSpaceScopedContentTypes(strapi).map((ct: { uid: string }) => ct.uid);

  if (models.length === 0) return;

  strapi.db.lifecycles.subscribe({
    models,

    beforeCreate(event: unknown) {
      stampSpaceOnCreate(strapi, event);
    },
    async beforeUpdate(event: unknown) {
      await refuseSharedRowWrite(strapi, event);
    },
    async beforeDelete(event: unknown) {
      await refuseSharedRowWrite(strapi, event);
    },
  });
};

interface WriteEvent {
  model?: { uid?: string };
  params?: { data?: Record<string, unknown>; where?: Record<string, unknown> };
}

/**
 * Fills `space` on a row being created. Precedence: an explicit `data.space`
 * (the document-service middleware already decided) → the scope override
 * (`runScoped`) → NULL for shared content types → the request's workspace.
 * Never overwrites an existing value.
 */
export const stampSpaceOnCreate = (strapi: Core.Strapi, rawEvent: unknown): void => {
  const event = rawEvent as WriteEvent;
  const data = event?.params?.data;
  if (!data) return;

  // Rows written while copying an inherited entry into a workspace are that
  // workspace's own version of it, whoever writes them (the clone itself, the
  // publish that follows, a locale added later).
  if (data.spaceOverride === undefined && isOverrideScope()) {
    data.spaceOverride = true;
  }

  if (data.space !== undefined) return;

  const override = getScopeOverride();
  if (override) {
    data.space = override.target;
    return;
  }

  const model = event.model?.uid ? strapi.contentTypes[event.model.uid as never] : undefined;
  if (model && isSharedContentType(model)) {
    data.space = null;
    return;
  }

  const request = getRequestSpace(strapi);
  if (request) {
    data.space = request.id;
  }
};

/**
 * Single-row raw writes (`where: { id }`) from a sub-workspace are checked
 * against the decision table; anything inside `runScoped` / `runUnscoped`
 * (the document service, internal code acting on purpose) or from the default
 * workspace passes untouched. Bulk `updateMany` / `deleteMany` writes are not
 * checked: the read net already narrows their `where` to visible rows.
 */
export const refuseSharedRowWrite = async (
  strapi: Core.Strapi,
  rawEvent: unknown
): Promise<void> => {
  if (isUnscopedContext() || getScopeOverride()) return;

  const request = getRequestSpace(strapi);
  if (!request || request.isDefault) return;

  const event = rawEvent as WriteEvent;
  const id = event?.params?.where?.id;
  if (id === undefined || id === null || typeof id === 'object') return;

  const uid = event.model?.uid;
  const model = uid ? strapi.contentTypes[uid as never] : undefined;
  if (!uid || !model) return;

  const row = await runUnscoped(() =>
    strapi.db.query(uid as never).findOne({
      where: { id },
      select: ['id', 'spaceOverride'],
      populate: { space: { select: ['id'] } },
    })
  );
  if (!row) return;

  // A row is addressed by its primary key here, so there is no ambiguity about
  // which of a document's rows this is — its own workspace decides.
  assertWritable({
    model,
    request,
    entrySpaceId: row.space?.id ?? null,
    isOverride: row.spaceOverride === true,
  });
};
