import type { Core, Modules } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { getService } from '../utils';

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

    getService('release-action', { strapi })
      .deleteEntryActions({
        contentType,
        entryDocumentId: documentId,
        ...(locale !== '*' && { locale }),
      })
      .catch((error: unknown) => {
        strapi.log.error('Error while deleting release actions after delete', {
          error,
        });
      });

    return result;
  };

const createUpdateActionsOnUpdate =
  ({ strapi }: { strapi: Core.Strapi }): Middleware =>
  async (ctx, next) => {
    if (ctx.action !== 'update') {
      return next();
    }

    if (!contentTypes.hasDraftAndPublish(ctx.contentType)) {
      return next();
    }

    const contentType = ctx.contentType.uid;

    const result = (await next()) as Modules.Documents.AnyDocument;

    if (!result) {
      return result;
    }

    getService('release-action', { strapi })
      .revalidateEntryActions(contentType, result)
      .catch((error: unknown) => {
        strapi.log.error('Error while updating release actions after update', {
          error,
        });
      });

    return result;
  };

export { createDeleteActionsOnDelete, createUpdateActionsOnUpdate };
