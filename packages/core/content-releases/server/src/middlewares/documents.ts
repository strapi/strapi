import type { Core, Modules } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { getService, runAfterCommit } from '../utils';

type Middleware = Modules.Documents.Middleware.Middleware;

const createDeleteActionsOnDelete =
  ({ strapi }: { strapi: Core.Strapi }): Middleware =>
  async (ctx, next) => {
    if (ctx.action !== 'delete') {
      return next();
    }

    if (!contentTypes.hasDraftAndPublish(ctx.contentType)) {
      return next();
    }

    const contentType = ctx.contentType.uid;
    const { documentId, locale } = ctx.params;

    const result = await next();

    if (!result) {
      return result;
    }

    runAfterCommit(
      () =>
        getService('release-action', { strapi }).deletePlannedActions({
          contentType,
          entryDocumentId: documentId,
          ...(locale !== '*' && { locale }),
        }),
      'Error while deleting release actions after delete',
      { strapi }
    );

    return result;
  };

// An update or a discarded draft changes the draft a planned release would publish
const createRevalidateActionsOnDraftChange =
  ({ strapi }: { strapi: Core.Strapi }): Middleware =>
  async (ctx, next) => {
    if (ctx.action !== 'update' && ctx.action !== 'discardDraft') {
      return next();
    }

    if (!contentTypes.hasDraftAndPublish(ctx.contentType)) {
      return next();
    }

    const contentType = ctx.contentType.uid;
    const { action } = ctx;

    const result = await next();

    // Neither action returns a count or a list; nothing to revalidate without a result
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return result;
    }

    // `update` returns the updated draft (which may have its own `entries` field); `discardDraft`
    // `{ entries }`, the new draft of each locale it discarded
    const drafts = action === 'discardDraft' && 'entries' in result ? result.entries : [result];

    runAfterCommit(
      async () => {
        for (const draft of drafts) {
          await getService('release-action', { strapi }).revalidatePlannedActions({
            contentType,
            entryDocumentId: draft.documentId,
            locale: draft.locale,
          });
        }
      },
      `Error while updating release actions after ${action}`,
      { strapi }
    );

    return result;
  };

export { createDeleteActionsOnDelete, createRevalidateActionsOnDraftChange };
