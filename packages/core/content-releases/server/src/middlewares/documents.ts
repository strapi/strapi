import type { Core, Modules, UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from '../constants';
import { getService, isEntryValid } from '../utils';

type Middleware = Modules.Documents.Middleware.Middleware;

interface ReleaseActionsParams {
  contentType: UID.ContentType;
  entryDocumentId?: Modules.Documents.ID;
  locale?: string;
}

const updateActionsStatusAndUpdateReleaseStatus = async (
  contentType: UID.ContentType,
  entry: Modules.Documents.AnyDocument,
  strapi: Core.Strapi
) => {
  const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      releasedAt: null,
      actions: {
        contentType,
        entryDocumentId: entry.documentId,
        locale: entry.locale,
      },
    },
  });

  const entryStatus = await isEntryValid(contentType, entry, { strapi });

  await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
    where: {
      contentType,
      entryDocumentId: entry.documentId,
      locale: entry.locale,
    },
    data: {
      isEntryValid: entryStatus,
    },
  });

  for (const release of releases) {
    await getService('release', { strapi }).updateReleaseStatus(release.id);
  }
};

const deleteActionsAndUpdateReleaseStatus = async (
  params: ReleaseActionsParams,
  strapi: Core.Strapi
) => {
  const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      actions: params,
    },
  });

  await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
    where: params,
  });

  for (const release of releases) {
    await getService('release', { strapi }).updateReleaseStatus(release.id);
  }
};

const deleteActionsOnDelete =
  (strapi: Core.Strapi): Middleware =>
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

    try {
      await deleteActionsAndUpdateReleaseStatus(
        {
          contentType,
          entryDocumentId: documentId,
          ...(locale !== '*' && { locale }),
        },
        strapi
      );
    } catch (error) {
      strapi.log.error('Error while deleting release actions after delete', {
        error,
      });
    }

    return result;
  };

const updateActionsOnUpdate =
  (strapi: Core.Strapi): Middleware =>
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

    try {
      await updateActionsStatusAndUpdateReleaseStatus(contentType, result, strapi);
    } catch (error) {
      strapi.log.error('Error while updating release actions after update', {
        error,
      });
    }

    return result;
  };

export { deleteActionsOnDelete, updateActionsOnUpdate };
