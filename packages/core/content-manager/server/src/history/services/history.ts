import type { Entity, LoadedStrapi } from '@strapi/types';
import { omit, pick } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';

import { HISTORY_VERSION_UID } from '../constants';
import type { HistoryVersions } from '../../../../shared/contracts';

const DEFAULT_RETENTION_DAYS = 90;

type NextDocument = HistoryVersions.CreateHistoryVersion['data'] & {
  documentId: Entity.ID;
  locale: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

const createHistoryService = ({ strapi }: { strapi: LoadedStrapi }) => {
  const state: {
    deleteExpiredJob: ReturnType<typeof scheduleJob> | null;
    isInitialized: boolean;
  } = {
    deleteExpiredJob: null,
    isInitialized: false,
  };

  const query = strapi.db.query(HISTORY_VERSION_UID);

  const getRetentionDays = (strapi: LoadedStrapi) => {
    const licenseRetentionDays =
      strapi.ee.features.get('cms-content-history')?.options.retentionDays;
    const userRetentionDays: number = strapi.config.get('admin.history.retentionDays');

    // Allow users to override the license retention days, but not to increase it
    if (userRetentionDays && userRetentionDays < licenseRetentionDays) {
      return userRetentionDays;
    }

    // User didn't provide retention days value, use the license or fallback to default
    return Math.min(licenseRetentionDays, DEFAULT_RETENTION_DAYS);
  };

  const getLocaleDictionary = async () => {
    if (!strapi.plugin('i18n')) {
      return {};
    }

    const locales = (await strapi.plugin('i18n').service('locales').find()) || [];
    return locales.reduce(
      (
        acc: Record<string, NonNullable<HistoryVersions.HistoryVersionDataResponse['locale']>>,
        locale: NonNullable<HistoryVersions.HistoryVersionDataResponse['locale']>
      ) => {
        acc[locale.code] = { name: locale.name, code: locale.code };

        return acc;
      },
      {}
    );
  };

  const getVersionStatus = async (
    contentTypeUid: HistoryVersions.CreateHistoryVersion['contentType'],
    data: NextDocument
  ) => {
    const documentMetadataService = strapi.plugin('content-manager').service('document-metadata');
    const meta = await documentMetadataService.getMetadata(contentTypeUid, data);

    return documentMetadataService.getStatus(data, meta.availableStatus);
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
        // Ignore actions that don't mutate documents
        if (
          !['create', 'update', 'publish', 'unpublish', 'discardDraft'].includes(context.action)
        ) {
          return next(context);
        }
        // @ts-expect-error ContentType is not typed correctly on the context
        const contentTypeUid = context.contentType.uid;
        // Ignore content types not created by the user
        if (!contentTypeUid.startsWith('api::')) {
          return next(context);
        }

        const result = (await next(context)) as any;
        /**
         * Publish and discardDraft actions store the created data on the result's versions array.
         * Otherwise, we assume the data is the result.
         *
         * TODO: Fix unpublish which is broken since the data that was unpublished is not passed to the middleware
         */
        const data: NextDocument =
          context.action === 'publish' || context.action === 'discardDraft'
            ? result.versions[0]
            : result;
        /**
         * The documentId should exist on the created data, fallback to context to handle the broken unpublish action
         *
         * TODO: Always get the documentId from the same place (data) once unpublish is fixed
         */
        const relatedDocumentId = data.documentId ?? context.args[0];
        // Compute the status of the version
        const status = await getVersionStatus(contentTypeUid, data);
        const fieldsToIgnore = [
          'createdAt',
          'updatedAt',
          'publishedAt',
          'createdBy',
          'updatedBy',
          'localizations',
          'locale',
          'strapi_stage',
          'strapi_assignee',
        ];

        // Prevent creating a history version for an action that wasn't actually executed
        await strapi.db.transaction(async ({ onCommit }) => {
          onCommit(() => {
            this.createVersion({
              contentType: contentTypeUid,
              locale: data.locale,
              data: omit(fieldsToIgnore, data),
              schema: omit(fieldsToIgnore, strapi.contentType(contentTypeUid).attributes),
              relatedDocumentId,
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

    async createVersion(historyVersionData: HistoryVersions.CreateHistoryVersion) {
      await query.create({
        data: {
          ...historyVersionData,
          createdAt: new Date(),
          createdBy: strapi.requestContext.get()?.state?.user.id,
        },
      });
    },

    async findVersionsPage(params: HistoryVersions.GetHistoryVersions.Request['query']) {
      const [{ results, pagination }, localeDictionary] = await Promise.all([
        query.findPage({
          ...params,
          where: {
            $and: [
              { contentType: params.contentType },
              ...(params.documentId ? [{ relatedDocumentId: params.documentId }] : []),
              ...(params.locale ? [{ locale: params.locale }] : []),
            ],
          },
          populate: ['createdBy'],
          orderBy: [{ createdAt: 'desc' }],
        }),
        getLocaleDictionary(),
      ]);

      const sanitizedResults = results.map((result) => ({
        ...result,
        locale: result.locale ? localeDictionary[result.locale] : null,
        createdBy: result.createdBy
          ? pick(['id', 'firstname', 'lastname', 'username', 'email'], result.createdBy)
          : null,
      }));

      return {
        results: sanitizedResults,
        pagination,
      };
    },
  };
};

export { createHistoryService };
