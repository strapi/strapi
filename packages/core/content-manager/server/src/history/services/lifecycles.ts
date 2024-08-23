import type { Core, Modules, UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

import { omit, castArray } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';

import { getService } from '../utils';
import { FIELDS_TO_IGNORE, HISTORY_VERSION_UID } from '../constants';

import { CreateHistoryVersion } from '../../../../shared/contracts/history-versions';
import { createServiceUtils } from './utils';

/**
 * Filters out actions that should not create a history version.
 */
const shouldCreateHistoryVersion = (
  context: Modules.Documents.Middleware.Context
): context is Modules.Documents.Middleware.Context & {
  action: 'create' | 'update' | 'clone' | 'publish' | 'unpublish' | 'discardDraft';
  contentType: UID.CollectionType;
} => {
  // Ignore requests that are not related to the content manager
  if (!strapi.requestContext.get()?.request.url.startsWith('/content-manager')) {
    return false;
  }

  // NOTE: cannot do type narrowing with array includes
  if (
    context.action !== 'create' &&
    context.action !== 'update' &&
    context.action !== 'clone' &&
    context.action !== 'publish' &&
    context.action !== 'unpublish' &&
    context.action !== 'discardDraft'
  ) {
    return false;
  }

  /**
   * When a document is published, the draft version of the document is also updated.
   * It creates confusion for users because they see two history versions each publish action.
   * To avoid this, we silence the update action during a publish request,
   * so that they only see the published version of the document in the history.
   */
  if (
    context.action === 'update' &&
    strapi.requestContext.get()?.request.url.endsWith('/actions/publish')
  ) {
    return false;
  }

  // Ignore content types not created by the user
  if (!context.contentType.uid.startsWith('api::')) {
    return false;
  }

  return true;
};

/**
 * Returns the content type schema (and its components schemas).
 * Used to determine if changes were made in the content type builder since a history version was created.
 * And therefore which fields can be restored and which cannot.
 */
const getSchemas = (uid: UID.CollectionType) => {
  const attributesSchema = strapi.getModel(uid).attributes;

  // TODO: Handle nested components
  const componentsSchemas = Object.keys(attributesSchema).reduce(
    (currentComponentSchemas, key) => {
      const fieldSchema = attributesSchema[key];

      if (fieldSchema.type === 'component') {
        const componentSchema = strapi.getModel(fieldSchema.component).attributes;
        return {
          ...currentComponentSchemas,
          [fieldSchema.component]: componentSchema,
        };
      }

      // Ignore anything that's not a component
      return currentComponentSchemas;
    },
    {} as CreateHistoryVersion['componentsSchemas']
  );

  return {
    schema: omit(FIELDS_TO_IGNORE, attributesSchema) as CreateHistoryVersion['schema'],
    componentsSchemas,
  };
};

const createLifecyclesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: {
    deleteExpiredJob: ReturnType<typeof scheduleJob> | null;
    isInitialized: boolean;
  } = {
    deleteExpiredJob: null,
    isInitialized: false,
  };

  const serviceUtils = createServiceUtils({ strapi });

  return {
    async bootstrap() {
      // Prevent initializing the service twice
      if (state.isInitialized) {
        return;
      }

      strapi.documents.use(async (context, next) => {
        const result = (await next()) as any;

        if (!shouldCreateHistoryVersion(context)) {
          return result;
        }

        // On create/clone actions, the documentId is not available before creating the action is executed
        const documentId =
          context.action === 'create' || context.action === 'clone'
            ? result.documentId
            : context.params.documentId;

        // Apply default locale if not available in the request
        const defaultLocale = await serviceUtils.getDefaultLocale();
        const locales = castArray(context.params?.locale || defaultLocale);
        if (!locales.length) {
          return result;
        }

        // All schemas related to the content type
        const uid = context.contentType.uid;
        const schemas = getSchemas(uid);
        const model = strapi.getModel(uid);

        const isLocalizedContentType = serviceUtils.isLocalizedContentType(model);

        // Find all affected entries
        const localeEntries = await strapi.db.query(uid).findMany({
          where: {
            documentId,
            ...(isLocalizedContentType ? { locale: { $in: locales } } : {}),
            ...(contentTypes.hasDraftAndPublish(strapi.contentTypes[uid])
              ? { publishedAt: null }
              : {}),
          },
          populate: serviceUtils.getDeepPopulate(uid, true /* use database syntax */),
        });

        await strapi.db.transaction(async ({ onCommit }) => {
          // .createVersion() is executed asynchronously,
          // onCommit prevents creating a history version
          // when the transaction has already been committed
          onCommit(async () => {
            for (const entry of localeEntries) {
              const status = await serviceUtils.getVersionStatus(uid, entry);

              await getService(strapi, 'history').createVersion({
                contentType: uid,
                data: omit(FIELDS_TO_IGNORE, entry) as Modules.Documents.AnyDocument,
                relatedDocumentId: documentId,
                locale: entry.locale,
                status,
                ...schemas,
              });
            }
          });
        });

        return result;
      });

      // Schedule a job to delete expired history versions every day at midnight
      state.deleteExpiredJob = scheduleJob('0 0 * * *', () => {
        const retentionDaysInMilliseconds = serviceUtils.getRetentionDays() * 24 * 60 * 60 * 1000;
        const expirationDate = new Date(Date.now() - retentionDaysInMilliseconds);

        strapi.db.query(HISTORY_VERSION_UID).deleteMany({
          where: {
            created_at: {
              $lt: expirationDate.toISOString(),
            },
          },
        });
      });

      state.isInitialized = true;
    },

    async destroy() {
      if (state.deleteExpiredJob) {
        state.deleteExpiredJob.cancel();
      }
    },
  };
};

export { createLifecyclesService };
