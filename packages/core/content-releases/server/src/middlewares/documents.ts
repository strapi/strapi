import type { Modules, Schema, UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from '../constants';
import { isEntryValid, updateAffectedReleaseStatuses } from '../utils';

type Middleware = Modules.Documents.Middleware.Middleware;

type LocaleFilter = { locale?: string | null | { $in: string[] } };

interface ReleaseActionsParams extends LocaleFilter {
  contentType: UID.ContentType;
  entryDocumentId?: Modules.Documents.ID;
}

/**
 * The locales a document delete removed, as a filter on release actions. Resolved the way the
 * document service resolves the `locale` param of a delete.
 */
const getDeletedLocalesFilter = async (
  contentType: Schema.ContentType,
  locale: unknown
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

const updateActionsStatusAndUpdateReleaseStatus = async (
  contentType: UID.ContentType,
  entry: Modules.Documents.AnyDocument
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

  await updateAffectedReleaseStatuses(releases, { strapi });
};

const deleteActionsAndUpdateReleaseStatus = async (params: ReleaseActionsParams) => {
  const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      // A released release is a record of what was published, its actions must stay
      releasedAt: null,
      actions: params,
    },
  });

  await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
    where: { ...params, release: { releasedAt: null } },
  });

  await updateAffectedReleaseStatuses(releases, { strapi });
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
    await deleteActionsAndUpdateReleaseStatus({
      contentType,
      entryDocumentId: documentId,
      ...(await getDeletedLocalesFilter(ctx.contentType, locale)),
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

  try {
    await updateActionsStatusAndUpdateReleaseStatus(contentType, result);
  } catch (error) {
    strapi.log.error('Error while updating release actions after update', {
      error,
    });
  }

  return result;
};

export { deleteActionsOnDelete, updateActionsOnUpdate };
