import type { Core, Modules } from '@strapi/types';

import { omit } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';

import { getService } from '../utils';
import { FIELDS_TO_IGNORE, HISTORY_VERSION_UID } from '../constants';

import { CreateHistoryVersion } from '../../../../shared/contracts/history-versions';
import { createServiceUtils } from './utils';

const createLifecyclesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: {
    deleteExpiredJob: ReturnType<typeof scheduleJob> | null;
    isInitialized: boolean;
  } = {
    deleteExpiredJob: null,
    isInitialized: false,
  };

  const query = strapi.db.query(HISTORY_VERSION_UID);
  const historyService = getService(strapi, 'history');
  const serviceUtils = createServiceUtils({ strapi });

  return {
    async bootstrap() {
      // Prevent initializing the service twice
      if (state.isInitialized) {
        return;
      }
      /**
       * TODO: Fix the types for the middleware
       */
      strapi.documents.use(async (context, next) => {
        // Ignore requests that are not related to the content manager
        if (!strapi.requestContext.get()?.request.url.startsWith('/content-manager')) {
          return next();
        }

        // NOTE: can do type narrowing with array includes
        if (
          context.action !== 'create' &&
          context.action !== 'update' &&
          context.action !== 'publish' &&
          context.action !== 'unpublish' &&
          context.action !== 'discardDraft'
        ) {
          return next();
        }

        const contentTypeUid = context.contentType.uid;
        // Ignore content types not created by the user
        if (!contentTypeUid.startsWith('api::')) {
          return next();
        }

        const result = (await next()) as any;

        const documentContext =
          context.action === 'create'
            ? { documentId: result.documentId, locale: context.params?.locale }
            : { documentId: context.params.documentId, locale: context.params?.locale };

        const defaultLocale = await serviceUtils.getDefaultLocale();
        const locale = documentContext.locale || defaultLocale;

        if (Array.isArray(locale)) {
          strapi.log.warn(
            '[Content manager history middleware]: An array of locales was provided, but only a single locale is supported for the findOne operation.'
          );
          // TODO calls picked from the middleware could contain an array of
          // locales. This is incompatible with our call to findOne below.
          return next();
        }

        const document = await strapi.documents(contentTypeUid).findOne({
          documentId: documentContext.documentId,
          locale,
          populate: serviceUtils.getDeepPopulate(contentTypeUid),
        });
        const status = await serviceUtils.getVersionStatus(contentTypeUid, document);

        /**
         * Store schema of both the fields and the fields of the attributes, as it will let us know
         * if changes were made in the CTB since a history version was created,
         * and therefore which fields can be restored and which cannot.
         */
        const attributesSchema = strapi.getModel(contentTypeUid).attributes;
        const componentsSchemas: CreateHistoryVersion['componentsSchemas'] = Object.keys(
          attributesSchema
        ).reduce((currentComponentSchemas, key) => {
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
        }, {});

        // Prevent creating a history version for an action that wasn't actually executed
        await strapi.db.transaction(async ({ onCommit }) => {
          onCommit(() => {
            historyService.createVersion({
              contentType: contentTypeUid,
              data: omit(FIELDS_TO_IGNORE, document) as Modules.Documents.AnyDocument,
              schema: omit(FIELDS_TO_IGNORE, attributesSchema),
              componentsSchemas,
              relatedDocumentId: documentContext.documentId,
              locale,
              status,
            });
          });
        });

        return result;
      });

      const retentionDays = serviceUtils.getRetentionDays();
      // Schedule a job to delete expired history versions every day at midnight
      state.deleteExpiredJob = scheduleJob('0 0 * * *', () => {
        const retentionDaysInMilliseconds = retentionDays * 24 * 60 * 60 * 1000;
        const expirationDate = new Date(Date.now() - retentionDaysInMilliseconds);

        query.deleteMany({
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
