import type { Core, Modules, UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import { omit } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';

import { FIELDS_TO_IGNORE, HISTORY_VERSION_UID } from '../constants';
import type { HistoryVersions } from '../../../../shared/contracts';
import { CreateHistoryVersion } from '../../../../shared/contracts/history-versions';

const DEFAULT_RETENTION_DAYS = 90;
const createLifecyclesService = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: {
    deleteExpiredJob: ReturnType<typeof scheduleJob> | null;
    isInitialized: boolean;
  } = {
    deleteExpiredJob: null,
    isInitialized: false,
  };

  const query = strapi.db.query(HISTORY_VERSION_UID);

  const getRetentionDays = (strapi: Core.Strapi) => {
    const featureConfig = strapi.ee.features.get('cms-content-history');

    const licenseRetentionDays =
      typeof featureConfig === 'object' && featureConfig?.options.retentionDays;

    const userRetentionDays: number = strapi.config.get('admin.history.retentionDays');

    // Allow users to override the license retention days, but not to increase it
    if (userRetentionDays && userRetentionDays < licenseRetentionDays) {
      return userRetentionDays;
    }

    // User didn't provide retention days value, use the license or fallback to default
    return Math.min(licenseRetentionDays, DEFAULT_RETENTION_DAYS);
  };

  const localesService = strapi.plugin('i18n')?.service('locales');
  const historyServcice = strapi.plugin('content-manager').service('history');

  const getVersionStatus = async (
    contentTypeUid: HistoryVersions.CreateHistoryVersion['contentType'],
    document: Modules.Documents.AnyDocument | null
  ) => {
    const documentMetadataService = strapi.plugin('content-manager').service('document-metadata');
    const meta = await documentMetadataService.getMetadata(contentTypeUid, document);

    return documentMetadataService.getStatus(document, meta.availableStatus);
  };

  /**
   * Creates a populate object that looks for all the relations that need
   * to be saved in history, and populates only the fields needed to later retrieve the content.
   */
  const getDeepPopulate = (uid: UID.Schema) => {
    const model = strapi.getModel(uid);
    const attributes = Object.entries(model.attributes);

    return attributes.reduce((acc: any, [attributeName, attribute]) => {
      switch (attribute.type) {
        case 'relation': {
          const isVisible = contentTypes.isVisibleAttribute(model, attributeName);
          if (isVisible) {
            acc[attributeName] = { fields: ['documentId', 'locale', 'publishedAt'] };
          }
          break;
        }

        case 'media': {
          acc[attributeName] = { fields: ['id'] };
          break;
        }

        case 'component': {
          const populate = getDeepPopulate(attribute.component);
          acc[attributeName] = { populate };
          break;
        }

        case 'dynamiczone': {
          // Use fragments to populate the dynamic zone components
          const populatedComponents = (attribute.components || []).reduce(
            (acc: any, componentUID: UID.Component) => {
              acc[componentUID] = { populate: getDeepPopulate(componentUID) };
              return acc;
            },
            {}
          );

          acc[attributeName] = { on: populatedComponents };
          break;
        }
        default:
          break;
      }

      return acc;
    }, {});
  };

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

        const defaultLocale = localesService ? await localesService.getDefaultLocale() : null;
        const locale = documentContext.locale || defaultLocale;
        const document = await strapi.documents(contentTypeUid).findOne({
          documentId: documentContext.documentId,
          locale,
          populate: getDeepPopulate(contentTypeUid),
        });
        const status = await getVersionStatus(contentTypeUid, document);

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
            historyServcice.create({
              contentType: contentTypeUid,
              data: omit(FIELDS_TO_IGNORE, document),
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

      const retentionDays = getRetentionDays(strapi);
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
