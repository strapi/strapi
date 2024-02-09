import type { LoadedStrapi } from '@strapi/types';
import { omit, pick } from 'lodash/fp';
import { HISTORY_VERSION_UID } from '../constants';

import type { HistoryVersions } from '../../../../shared/contracts';

const createHistoryService = ({ strapi }: { strapi: LoadedStrapi }) => {
  /**
   * Use the query engine API, not the document service,
   * since we'll refactor history version to be just a model instead of a content type.
   * TODO: remove this comment once the refactor is done.
   */
  const query = strapi.db.query(HISTORY_VERSION_UID);

  let isInitialized = false;

  return {
    async init() {
      // Prevent initializing the service twice
      if (isInitialized) {
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

      isInitialized = true;
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
              { relatedDocumentId: params.documentId },
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
