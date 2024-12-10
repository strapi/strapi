import type { Core, Data, Modules, Schema } from '@strapi/types';
import { errors, traverseEntity } from '@strapi/utils';
import { omit, set } from 'lodash/fp';

import { FIELDS_TO_IGNORE, HISTORY_VERSION_UID } from '../constants';
import type { HistoryVersions } from '../../../../shared/contracts';
import type {
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
      const model = strapi.getModel(params.query.contentType);
      const isLocalizedContentType = serviceUtils.isLocalizedContentType(model);
      const defaultLocale = await serviceUtils.getDefaultLocale();

      let locale = null;
      if (isLocalizedContentType) {
        locale = params.query.locale || defaultLocale;
      }

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
      const populateEntryRelations = async (
        entry: Pick<HistoryVersionQueryResult, 'data' | 'schema'>,
        initialData: Promise<Modules.Documents.AnyDocument> = Promise.resolve(entry.data),
        componentKeyPath: string[] = []
      ): Promise<CreateHistoryVersion['data']> => {
        const entryWithRelations = await Object.entries(entry.schema).reduce(
          async (
            currentDataWithRelations,
            [attributeKey, attributeSchema]
          ): Promise<Modules.Documents.AnyDocument> => {
            const attributeValue = entry.data[attributeKey];
            const attributeValues = Array.isArray(attributeValue)
              ? attributeValue
              : [attributeValue];

            if (attributeSchema.type === 'component' && attributeValue) {
              const nextComponent = serviceUtils.getNextComponent(
                componentKeyPath,
                attributeKey,
                attributeSchema
              );

              if (!nextComponent) {
                return currentDataWithRelations;
              }

              return populateEntryRelations(
                {
                  data: omit('id', attributeValue),
                  schema: nextComponent.schema.attributes,
                },
                currentDataWithRelations,
                nextComponent.keyPath
              );
            }

            if (attributeSchema.type === 'media') {
              const permissionChecker = getContentManagerService('permission-checker').create({
                userAbility: params.state.userAbility,
                model: 'plugin::upload.file',
              });

              const response = await serviceUtils.buildMediaResponse(attributeValues);
              const sanitizedResults = await Promise.all(
                response.results.map((media) => permissionChecker.sanitizeOutput(media))
              );

              const keyPathToUpdate = componentKeyPath.length
                ? `${componentKeyPath.join('.')}.${attributeKey}`
                : attributeKey;
              const currentData = { ...(await currentDataWithRelations) };

              return set(
                keyPathToUpdate,
                { results: sanitizedResults, meta: response.meta },
                currentData
              );
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
                  attributeValues.map((userToPopulate) => {
                    if (userToPopulate == null) {
                      return null;
                    }

                    return strapi.query('admin::user').findOne({
                      where: {
                        ...(userToPopulate.id ? { id: userToPopulate.id } : {}),
                        ...(userToPopulate.documentId
                          ? { documentId: userToPopulate.documentId }
                          : {}),
                      },
                    });
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

              const permissionChecker = getContentManagerService('permission-checker').create({
                userAbility: params.state.userAbility,
                model: attributeSchema.target,
              });

              const response = await serviceUtils.buildRelationReponse(
                attributeValues,
                attributeSchema
              );
              const sanitizedResults = await Promise.all(
                response.results.map((media) => permissionChecker.sanitizeOutput(media))
              );

              return {
                ...(await currentDataWithRelations),
                [attributeKey]: {
                  results: sanitizedResults,
                  meta: response.meta,
                },
              };
            }

            // Not a media or relation, nothing to change
            return currentDataWithRelations;
          },
          initialData
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

      // Remove the schema attributes history should ignore
      const schema = structuredClone(version.schema);
      schema.attributes = omit(FIELDS_TO_IGNORE, contentTypeSchemaAttributes);

      const dataWithoutMissingRelations = await traverseEntity(
        async (options, utils) => {
          if (!options.attribute) return;

          if (options.attribute.type === 'component') {
            // Ids on components cause issues when restoring
            // TODO: Ask Marc to explain the real reason
            utils.remove('id');
          }

          if (
            options.attribute.type === 'relation' &&
            // TODO: handle polymorphic relations
            options.attribute.relation !== 'morphToOne' &&
            options.attribute.relation !== 'morphToMany'
          ) {
            if (!options.value) return;

            const data = await serviceUtils.getRelationRestoreValue(
              options.value as Modules.Documents.AnyDocument,
              options.attribute as Schema.Attribute.RelationWithTarget
            );

            utils.set(options.key, data as Modules.Documents.AnyDocument);
          }

          if (options.attribute.type === 'media') {
            if (!options.value) return;

            const data = await serviceUtils.getMediaRestoreValue(
              options.value as Modules.Documents.AnyDocument
            );

            utils.set(options.key, data);
          }
        },
        {
          schema,
          getModel: strapi.getModel.bind(strapi),
        },
        dataWithoutAddedAttributes
      );

      const data = omit(['id', ...Object.keys(schemaDiff.removed)], dataWithoutMissingRelations);
      try {
        const restoredDocument = await strapi.documents(version.contentType).update({
          documentId: version.relatedDocumentId,
          locale: version.locale,
          data,
        });

        if (!restoredDocument) {
          throw new errors.ApplicationError('Failed to restore version');
        }

        return restoredDocument;
      } catch (error) {
        console.error(error);
      }
    },
  };
};

export { createHistoryService };
