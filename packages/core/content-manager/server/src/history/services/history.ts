import type { Core, Data, Schema, Struct } from '@strapi/types';
import { async, errors } from '@strapi/utils';
import { omit } from 'lodash/fp';

import { FIELDS_TO_IGNORE, HISTORY_VERSION_UID } from '../constants';
import type { HistoryVersions } from '../../../../shared/contracts';
import {
  CreateHistoryVersion,
  HistoryVersionDataResponse,
} from '../../../../shared/contracts/history-versions';
import { createServiceUtils } from './utils';
import { getService as getContentManagerService } from '../../utils';

// Needed because the query engine doesn't return any types yet
type HistoryVersionQueryResult = Omit<HistoryVersionDataResponse, 'locale'> &
  Pick<CreateHistoryVersion, 'locale'>;

const createHistoryService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = strapi.db.query(HISTORY_VERSION_UID);
  const serviceUtils = createServiceUtils({ strapi });

  return {
    async createVersion(historyVersionData: HistoryVersions.CreateHistoryVersion) {
      await query.create({
        data: {
          ...historyVersionData,
          createdAt: new Date(),
          createdBy: strapi.requestContext.get()?.state?.user.id,
        },
      });
    },

    async findVersionsPage(params: HistoryVersions.GetHistoryVersions.Request): Promise<{
      results: HistoryVersions.HistoryVersionDataResponse[];
      pagination: HistoryVersions.Pagination;
    }> {
      const locale = params.query.locale || (await serviceUtils.getDefaultLocale());
      const [{ results, pagination }, localeDictionary] = await Promise.all([
        query.findPage({
          ...params.query,
          where: {
            $and: [
              { contentType: params.query.contentType },
              ...(params.query.documentId ? [{ relatedDocumentId: params.query.documentId }] : []),
              ...(locale ? [{ locale }] : []),
            ],
          },
          populate: ['createdBy'],
          orderBy: [{ createdAt: 'desc' }],
        }),
        serviceUtils.getLocaleDictionary(),
      ]);

      /**
       * Get an object with two keys:
       * - results: an array with the current values of the relations
       * - meta: an object with the count of missing relations
       */
      // TODO: Move outside this function to utils
      const buildRelationReponse = async (
        values: {
          documentId: string;
          locale: string | null;
        }[],
        attributeSchema: Schema.Attribute.RelationWithTarget
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

                const relatedEntry = await strapi
                  .documents(attributeSchema.target)
                  .findOne({ documentId: entry.documentId, locale: entry.locale || undefined });

                const permissionChecker = getContentManagerService('permission-checker').create({
                  userAbility: params.state.userAbility,
                  model: attributeSchema.target,
                });
                const sanitizedEntry = await permissionChecker.sanitizeOutput(relatedEntry);

                if (sanitizedEntry) {
                  currentRelationData.results.push({
                    ...sanitizedEntry,
                    status: await serviceUtils.getVersionStatus(attributeSchema.target, sanitizedEntry),
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

      /**
       * Get an object with two keys:
       * - results: an array with the current values of the relations
       * - meta: an object with the count of missing relations
       */
      // TODO: Move outside this function to utils
      const buildMediaResponse = async (
        values: { id: Data.ID }[]
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

                const permissionChecker = getContentManagerService('permission-checker').create({
                  userAbility: params.state.userAbility,
                  model: 'plugin::upload.file',
                });

                const relatedEntry = await strapi.db
                  .query('plugin::upload.file')
                  .findOne({ where: { id: entry.id } });

                const sanitizedEntry = await permissionChecker.sanitizeOutput(relatedEntry);

                if (sanitizedEntry) {
                  currentRelationData.results.push(sanitizedEntry);
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
            const attributeValue = entry.data[attributeKey];
            const attributeValues = Array.isArray(attributeValue)
              ? attributeValue
              : [attributeValue];

            if (attributeSchema.type === 'media') {
              return {
                ...(await currentDataWithRelations),
                [attributeKey]: await buildMediaResponse(attributeValues),
              };
            }

            // TODO: handle relations that are inside components
            if (
              attributeSchema.type === 'relation' &&
              attributeSchema.relation !== 'morphToOne' &&
              attributeSchema.relation !== 'morphToMany'
            ) {
              /**
               * Don't build the relations response object for relations to admin users,
               * because pickAllowedAdminUserFields will sanitize the data in the controller.
               */
              if (attributeSchema.target === 'admin::user') {
                const adminUsers = await Promise.all(
                  attributeValues.map(async (userToPopulate) => {
                    if (userToPopulate == null) {
                      return null;
                    }

                    return strapi
                      .query('admin::user')
                      .findOne({ where: { id: userToPopulate.id } });
                  })
                );

                return {
                  ...(await currentDataWithRelations),
                  /**
                   * Ideally we would return the same "{results: [], meta: {}}" shape, however,
                   * when sanitizing the data as a whole in the controller before sending to the client,
                   * the data for admin relation user is completely sanitized if we return an object here as opposed to an array.
                   */
                  [attributeKey]: adminUsers,
                };
              }

              return {
                ...(await currentDataWithRelations),
                [attributeKey]: await buildRelationReponse(attributeValues, attributeSchema),
              };
            }

            // Not a media or relation, nothing to change
            return currentDataWithRelations;
          },
          Promise.resolve(entry.data)
        );

        return entryWithRelations;
      };

      const formattedResults = await Promise.all(
        (results as HistoryVersionQueryResult[]).map(async (result) => {
          return {
            ...result,
            data: await populateEntryRelations(result),
            meta: {
              unknownAttributes: serviceUtils.getSchemaAttributesDiff(
                result.schema,
                strapi.getModel(params.query.contentType).attributes
              ),
            },
            locale: result.locale ? localeDictionary[result.locale] : null,
          };
        })
      );

      return {
        results: formattedResults,
        pagination,
      };
    },

    async restoreVersion(versionId: Data.ID) {
      const version = await query.findOne({ where: { id: versionId } });
      const contentTypeSchemaAttributes = strapi.getModel(version.contentType).attributes;
      const schemaDiff = serviceUtils.getSchemaAttributesDiff(
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
            const data = await serviceUtils.getRelationRestoreValue(versionRelationData, attribute);
            previousRelationAttributes[name] = data;
          }

          if (attribute.type === 'media') {
            const data = await serviceUtils.getMediaRestoreValue(versionRelationData, attribute);
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
