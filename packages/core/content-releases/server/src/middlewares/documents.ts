import type { Modules, UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from '../constants';
import { getService, getDraftEntryValidity, UNPUBLISH_VALIDITY } from '../utils';

type Middleware = Modules.Documents.Middleware.Middleware;

interface ReleaseActionsParams {
  contentType: UID.ContentType;
  entryDocumentId?: Modules.Documents.ID;
  locale?: string;
}

const updateActionsStatusAndUpdateReleaseStatus = async (
  contentType: UID.ContentType,
  entry: Modules.Documents.AnyDocument
) => {
  const plannedActionsWhere = {
    contentType,
    entryDocumentId: entry.documentId,
    locale: entry.locale,
    outcome: null,
    release: { releasedAt: { $null: true } },
  };

  const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      releasedAt: null,
      actions: { contentType, entryDocumentId: entry.documentId, locale: entry.locale },
    },
  });

  if (releases.length === 0) {
    return;
  }

  const publishActionsWhere = { ...plannedActionsWhere, type: 'publish' };

  if ((await strapi.db.query(RELEASE_ACTION_MODEL_UID).count({ where: publishActionsWhere })) > 0) {
    const validity = await getDraftEntryValidity(
      { contentType, documentId: entry.documentId, locale: entry.locale },
      { strapi }
    );

    await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
      where: publishActionsWhere,
      data: validity,
    });
  }

  await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
    where: { ...plannedActionsWhere, type: 'unpublish', isEntryValid: false },
    data: UNPUBLISH_VALIDITY,
  });

  for (const release of releases) {
    await getService('release', { strapi }).updateReleaseStatus(release.id);
  }
};

// Only planned releases: a release that ran keeps the entry's action and what its run recorded
const deleteActionsAndUpdateReleaseStatus = async (params: ReleaseActionsParams) => {
  const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      releasedAt: null,
      actions: params,
    },
  });

  await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
    where: { ...params, release: { releasedAt: { $null: true } } },
  });

  for (const release of releases) {
    getService('release', { strapi }).updateReleaseStatus(release.id);
  }
};

const deleteActionsOnDelete: Middleware = async (ctx, next) => {
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
    deleteActionsAndUpdateReleaseStatus({
      contentType,
      entryDocumentId: documentId,
      ...(locale !== '*' && { locale }),
    });
  } catch (error) {
    strapi.log.error('Error while deleting release actions after delete', {
      error,
    });
  }

  return result;
};

const updateActionsOnUpdate: Middleware = async (ctx, next) => {
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

  updateActionsStatusAndUpdateReleaseStatus(contentType, result).catch((error: unknown) => {
    strapi.log.error('Error while updating release actions after update', {
      error,
    });
  });

  return result;
};

export { deleteActionsOnDelete, updateActionsOnUpdate };
