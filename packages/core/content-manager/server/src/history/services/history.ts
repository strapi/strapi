import type { Core, Modules, Data, Schema, Struct } from '@strapi/types';
import { async, errors } from '@strapi/utils';
import { omit, pick } from 'lodash/fp';

import { scheduleJob } from 'node-schedule';

import { FIELDS_TO_IGNORE, HISTORY_VERSION_UID } from '../constants';
import type { HistoryVersions } from '../../../../shared/contracts';
import {
  CreateHistoryVersion,
  HistoryVersionDataResponse,
} from '../../../../shared/contracts/history-versions';
import { createHistoryUtils } from './utils';

// Needed because the query engine doesn't return any types yet
type HistoryVersionQueryResult = Omit<HistoryVersionDataResponse, 'locale'> &
  Pick<CreateHistoryVersion, 'locale'>;

const createHistoryService = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: {
    deleteExpiredJob: ReturnType<typeof scheduleJob> | null;
    isInitialized: boolean;
  } = {
    deleteExpiredJob: null,
    isInitialized: false,
  };

  const query = strapi.db.query(HISTORY_VERSION_UID);
  const historyUtils = createHistoryUtils({ strapi });

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

        const defaultLocale = await historyUtils.getDefaultLocale();
        const locale = documentContext.locale || defaultLocale;

        const document = await strapi.documents(contentTypeUid).findOne({
          documentId: documentContext.documentId,
          locale,
          populate: historyUtils.getDeepPopulate(contentTypeUid),
        });
        const status = await historyUtils.getVersionStatus(contentTypeUid, document);

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
            this.createVersion({
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

      const retentionDays = historyUtils.getRetentionDays();
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
      results: HistoryVersions.HistoryVersionDataResponse[];
      pagination: HistoryVersions.Pagination;
    }> {
      const locale = params.locale || (await historyUtils.getDefaultLocale());
      const [{ results, pagination }, localeDictionary] = await Promise.all([
        query.findPage({
          ...params,
          where: {
            $and: [
              { contentType: params.contentType },
              ...(params.documentId ? [{ relatedDocumentId: params.documentId }] : []),
              ...(locale ? [{ locale }] : []),
            ],
          },
          populate: ['createdBy'],
          orderBy: [{ createdAt: 'desc' }],
        }),
        historyUtils.getLocaleDictionary(),
      ]);

      type EntryToPopulate =
        | {
            documentId: string;
            locale: string | null;
          }
        | { id: Data.ID }
        | null;

      /**
       * Get an object with two keys:
       * - results: an array with the current values of the relations
       * - meta: an object with the count of missing relations
       */
      const buildRelationReponse = async (
        values: EntryToPopulate[],
        attributeSchema: Schema.Attribute.AnyAttribute
      ): Promise<{ results: any[]; meta: { missingCount: number } }> => {
        return (
          values
            // Until we implement proper pagination, limit relations to an arbitrary amount
            .slice(0, 25)
            .reduce(
              async (currentRelationDataPromise, entry) => {
                const currentRelationData = await currentRelationDataPromise;

                // Entry can be null if it's a toOne relation
                if (!entry) {
                  return currentRelationData;
                }

                const isNormalRelation =
                  attributeSchema.type === 'relation' &&
                  attributeSchema.relation !== 'morphToOne' &&
                  attributeSchema.relation !== 'morphToMany';

                /**
                 * Adapt the query depending on if the attribute is a media
                 * or a normal relation. The extra checks are only for type narrowing
                 */
                let relatedEntry;
                if (isNormalRelation) {
                  if ('documentId' in entry) {
                    relatedEntry = await strapi
                      .documents(attributeSchema.target)
                      .findOne({ documentId: entry.documentId, locale: entry.locale || undefined });
                  }
                  // For media assets, only the id is available, double check that we have it
                } else if ('id' in entry) {
                  relatedEntry = await strapi.db
                    .query('plugin::upload.file')
                    .findOne({ where: { id: entry.id } });
                }

                if (relatedEntry) {
                  currentRelationData.results.push({
                    ...relatedEntry,
                    ...(isNormalRelation
                      ? {
                          status: await historyUtils.getVersionStatus(
                            attributeSchema.target,
                            relatedEntry
                          ),
                        }
                      : {}),
                  });
                } else {
                  // The related content has been deleted
                  currentRelationData.meta.missingCount += 1;
                }

                return currentRelationData;
              },
              Promise.resolve({
                results: [] as any[],
                meta: { missingCount: 0 },
              })
            )
        );
      };

      const populateEntryRelations = async (
        entry: HistoryVersionQueryResult
      ): Promise<CreateHistoryVersion['data']> => {
        const entryWithRelations = await Object.entries(entry.schema).reduce(
          async (currentDataWithRelations, [attributeKey, attributeSchema]) => {
            // TODO: handle relations that are inside components
            if (['relation', 'media'].includes(attributeSchema.type)) {
              const attributeValue = entry.data[attributeKey];
              const relationResponse = await buildRelationReponse(
                (Array.isArray(attributeValue)
                  ? attributeValue
                  : [attributeValue]) as EntryToPopulate[],
                attributeSchema
              );

              return {
                ...(await currentDataWithRelations),
                [attributeKey]: relationResponse,
              };
            }

            // Not a media or relation, nothing to change
            return currentDataWithRelations;
          },
          Promise.resolve(entry.data)
        );

        return entryWithRelations;
      };

      const sanitizedResults = await Promise.all(
        (results as HistoryVersionQueryResult[]).map(async (result) => {
          return {
            ...result,
            data: await populateEntryRelations(result),
            meta: {
              unknownAttributes: historyUtils.getSchemaAttributesDiff(
                result.schema,
                strapi.getModel(params.contentType).attributes
              ),
            },
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

    async restoreVersion(versionId: Data.ID) {
      const version = await query.findOne({ where: { id: versionId } });
      const contentTypeSchemaAttributes = strapi.getModel(version.contentType).attributes;
      const schemaDiff = historyUtils.getSchemaAttributesDiff(
        version.schema,
        contentTypeSchemaAttributes
      );

      // Set all added attribute values to null
      const dataWithoutAddedAttributes = Object.keys(schemaDiff.added).reduce(
        (currentData, addedKey) => {
          currentData[addedKey] = null;
          return currentData;
        },
        // Clone to avoid mutating the original version data
        structuredClone(version.data)
      );
      const sanitizedSchemaAttributes = omit(
        FIELDS_TO_IGNORE,
        contentTypeSchemaAttributes
      ) as Struct.SchemaAttributes;

      // Set all deleted relation values to null
      const reducer = async.reduce(Object.entries(sanitizedSchemaAttributes));
      const dataWithoutMissingRelations = await reducer(
        async (
          previousRelationAttributes: Record<string, unknown>,
          [name, attribute]: [string, Schema.Attribute.AnyAttribute]
        ) => {
          const versionRelationData = version.data[name];
          if (!versionRelationData) {
            return previousRelationAttributes;
          }

          if (
            attribute.type === 'relation' &&
            // TODO: handle polymorphic relations
            attribute.relation !== 'morphToOne' &&
            attribute.relation !== 'morphToMany'
          ) {
            const data = await historyUtils.getRelationRestoreValue(versionRelationData, attribute);
            previousRelationAttributes[name] = data;
          }

          if (attribute.type === 'media') {
            const data = await historyUtils.getMediaRestoreValue(versionRelationData, attribute);
            previousRelationAttributes[name] = data;
          }

          return previousRelationAttributes;
        },
        // Clone to avoid mutating the original version data
        structuredClone(dataWithoutAddedAttributes)
      );

      const data = omit(['id', ...Object.keys(schemaDiff.removed)], dataWithoutMissingRelations);
      const restoredDocument = await strapi.documents(version.contentType).update({
        documentId: version.relatedDocumentId,
        locale: version.locale,
        data,
      });

      if (!restoredDocument) {
        throw new errors.ApplicationError('Failed to restore version');
      }

      return restoredDocument;
    },
  };
};

export { createHistoryService };
