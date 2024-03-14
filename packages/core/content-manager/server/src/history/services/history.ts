import type { LoadedStrapi, Documents } from '@strapi/types';
import { omit, pick } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';

import { getDeepPopulate } from 'src/services/utils/populate';
import { HISTORY_VERSION_UID } from '../constants';
import type { HistoryVersions } from '../../../../shared/contracts';
import {
  CreateHistoryVersion,
  HistoryVersionDataResponse,
} from '../../../../shared/contracts/history-versions';

// Needed because the query engine doesn't return any types yet
type HistoryVersionQueryResult = Omit<HistoryVersionDataResponse, 'locale' | 'relatedData'> &
  Pick<CreateHistoryVersion, 'locale'>;

const DEFAULT_RETENTION_DAYS = 90;

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

  const localesService = strapi.plugin('i18n').service('locales');
  const getLocaleDictionary = async () => {
    const locales = (await localesService.find()) || [];
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
    document: Documents.AnyDocument | null
  ) => {
    const documentMetadataService = strapi.plugin('content-manager').service('document-metadata');
    const meta = await documentMetadataService.getMetadata(contentTypeUid, document);

    return documentMetadataService.getStatus(document, meta.availableStatus);
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
          return next(context);
        }

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

        const documentContext =
          context.action === 'create'
            ? // @ts-expect-error The context args are not typed correctly
              { documentId: result.documentId, locale: context.args[0]?.locale }
            : { documentId: context.args[0], locale: context.args[1]?.locale };

        const locale = documentContext.locale ?? localesService.getDefaultLocale();
        const document = await strapi
          .documents(contentTypeUid)
          .findOne(documentContext.documentId, {
            locale,
          });
        const status = await getVersionStatus(contentTypeUid, document);

        const fieldsToIgnore = [
          'createdAt',
          'updatedAt',
          'publishedAt',
          'createdBy',
          'updatedBy',
          'locale',
          'strapi_stage',
          'strapi_assignee',
        ];

        // Prevent creating a history version for an action that wasn't actually executed
        await strapi.db.transaction(async ({ onCommit }) => {
          onCommit(() => {
            this.createVersion({
              contentType: contentTypeUid,
              data: omit(fieldsToIgnore, document),
              schema: omit(fieldsToIgnore, strapi.contentType(contentTypeUid).attributes),
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

    async createVersion(historyVersionData: HistoryVersions.CreateHistoryVersion) {
      await query.create({
        data: {
          ...historyVersionData,
          createdAt: new Date(),
          createdBy: strapi.requestContext.get()?.state?.user.id,
        },
      });
    },

    async findVersionsPage(params: HistoryVersions.GetHistoryVersions.Request['query']): Promise<{
      results: HistoryVersionDataResponse[];
      pagination: HistoryVersions.Pagination;
    }> {
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

      const sanitizedResults = await Promise.all(
        (results as HistoryVersionQueryResult[]).map(async (result) => {
          const dataWithRelations = await Object.keys(result.schema).reduce(
            async (currentDataWithRelations, attributeKey) => {
              const attributeSchema = result.schema[attributeKey];

              // TODO: handle media
              // TODO: nested content structures
              if (
                attributeSchema.type === 'relation' &&
                attributeSchema.relation !== 'morphToOne' &&
                attributeSchema.relation !== 'morphToMany'
              ) {
                const shouldFetchSeveral = ['oneToMany', 'manyToMany'].includes(
                  attributeSchema.relation
                );
                const relatedEntries = await Promise.all(
                  (
                    (shouldFetchSeveral
                      ? result.data[attributeKey]
                      : [result.data[attributeKey]]) as number[]
                  ).map((id) => {
                    if (!id) {
                      return null;
                    }

                    return strapi.db.query(attributeSchema.target).findOne({ where: { id } });
                  })
                );

                return {
                  ...(await currentDataWithRelations),
                  [attributeKey]: shouldFetchSeveral ? relatedEntries : relatedEntries[0],
                };
              }

              // Not a media or relation, nothing to change
              return currentDataWithRelations;
            },
            Promise.resolve(result.data)
          );

          return {
            ...result,
            data: dataWithRelations,
            locale: result.locale ? localeDictionary[result.locale] : null,
            createdBy: result.createdBy
              ? pick(['id', 'firstname', 'lastname', 'username', 'email'], result.createdBy)
              : undefined,
          };
        })
      );

      return {
        results: sanitizedResults,
        pagination,
      };
    },
  };
};

export { createHistoryService };
