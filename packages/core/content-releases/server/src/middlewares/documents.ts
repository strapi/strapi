import type { Core, Modules, Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { getService, runAfterCommit } from '../utils';

type Middleware = Modules.Documents.Middleware.Middleware;

type LocaleFilter = { locale?: string | null | { $in: string[] } };

/**
 * The locales a document delete removed, as a filter on release actions. Resolved the way the
 * document service resolves the `locale` param of a delete.
 */
const getDeletedLocalesFilter = async (
  contentType: Schema.ContentType,
  locale: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<LocaleFilter> => {
  if (!strapi.localization.isLocalizedContentType(contentType) || locale === '*') {
    return {};
  }

  if (Array.isArray(locale)) {
    return { locale: { $in: locale } };
  }

  if (typeof locale === 'string' && locale !== '') {
    return { locale };
  }

  return { locale: await strapi.localization.getDefaultLocale() };
};

const createDeleteActionsOnDelete =
  ({ strapi }: { strapi: Core.Strapi }): Middleware =>
  async (ctx, next) => {
    if (ctx.action !== 'delete') {
      return next();
    }

    if (!contentTypes.hasDraftAndPublish(ctx.contentType)) {
      return next();
    }

    const { contentType: model } = ctx;
    const contentType = model.uid;
    const { documentId, locale } = ctx.params;

    const result = await next();

    if (!result) {
      return result;
    }

    runAfterCommit(
      async () =>
        getService('release-action', { strapi }).deletePlannedActions({
          contentType,
          entryDocumentId: documentId,
          ...(await getDeletedLocalesFilter(model, locale, { strapi })),
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
