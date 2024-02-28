import type { LoadedStrapi } from '@strapi/types';
import { omit, pick } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';
import { HISTORY_VERSION_UID } from '../constants';

import type { HistoryVersions } from '../../../../shared/contracts';

const DEFAULT_RETENTION_DAYS = 90;

const createHistoryService = ({ strapi }: { strapi: LoadedStrapi }) => {
  const state: {
    deleteExpiredJob: ReturnType<typeof scheduleJob> | null;
    isInitialized: boolean;
  } = {
    deleteExpiredJob: null,
    isInitialized: false,
  };

  /**
   * Use the query engine API, not the document service,
   * since we'll refactor history version to be just a model instead of a content type.
   * TODO: remove this comment once the refactor is done.
   */
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
    return licenseRetentionDays ?? DEFAULT_RETENTION_DAYS;
  };

  return {
    async bootstrap() {
      // Prevent initializing the service twice
      if (state.isInitialized) {
        return;
      }

      // TODO: replace by strapi.documents.use once it supports multiple actions at once
      strapi.documents?.middlewares.add('_all', '_all', async (context, next) => {
        // Ignore actions that don't mutate documents
        if (!['create', 'update', 'publish', 'unpublish'].includes(context.action)) {
          return next(context);
        }

        // Ignore content types not created by the user
        if (!context.uid.startsWith('api::')) {
          return next(context);
        }

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

        /**
         * Await the middleware stack because for create actions,
         * the document ID only exists after the creation, which is later in the stack.
         */
        const result = await next(context);

        // Prevent creating a history version for an action that wasn't actually executed
        await strapi.db.transaction(async ({ onCommit }) => {
          onCommit(() => {
            this.createVersion({
              contentType: context.uid,
              relatedDocumentId: result.documentId,
              locale: context.params.locale,
              // TODO: check if drafts should should be "modified" once D&P is ready
              status: context.params.status,
              data: omit(fieldsToIgnore, context.params.data),
              schema: omit(fieldsToIgnore, strapi.contentType(context.uid).attributes),
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

    /**
     * TODO: Refactor so i18n can interact history without history itself being concerned about i18n
     */
    async getLocaleDictionary() {
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
    },

    async findVersionsPage(params: HistoryVersions.GetHistoryVersions.Request['query']) {
      const [{ results, pagination }, localeDictionary] = await Promise.all([
        query.findPage({
          page: 1,
          pageSize: 10,
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
        this.getLocaleDictionary(),
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
