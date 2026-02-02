import type { Core, Data, Modules, Schema } from '@strapi/types';
import { errors, traverseEntity } from '@strapi/utils';
import { omit } from 'lodash/fp';

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
      const schema = strapi.getModel(params.query.contentType);
      const isLocalizedContentType = serviceUtils.isLocalizedContentType(schema);
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

      const populateEntry = async (entry: HistoryVersionQueryResult) => {
        return traverseEntity(
          async (options, utils) => {
            if (!options.attribute) return;
            if (!options.value) return;

            const currentValue: any[] = Array.isArray(options.value)
              ? options.value
              : [options.value];

            if (options.attribute.type === 'component') {
              // Ids on components throw an error when restoring
              utils.remove('id');
            }

            if (
              options.attribute.type === 'relation' &&
              // TODO: handle polymorphic relations
              options.attribute.relation !== 'morphToOne' &&
              options.attribute.relation !== 'morphToMany'
            ) {
              if (options.attribute.target === 'admin::user') {
                const adminUsers = await Promise.all(
                  currentValue.map((userToPopulate) => {
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

                utils.set(options.key, adminUsers as any);
              }

              const permissionChecker = getContentManagerService('permission-checker').create({
                userAbility: params.state.userAbility,
                model: options.attribute.target,
              });

              const response = await serviceUtils.buildRelationReponse(
                currentValue,
                options.attribute as Schema.Attribute.RelationWithTarget
              );
              const sanitizedResults = await Promise.all(
                response.results.map((media) => permissionChecker.sanitizeOutput(media))
              );

              utils.set(options.key, {
                results: sanitizedResults,
                meta: response.meta,
              });
            }

            if (options.attribute.type === 'media') {
              const permissionChecker = getContentManagerService('permission-checker').create({
                userAbility: params.state.userAbility,
                model: 'plugin::upload.file',
              });

              const response = await serviceUtils.buildMediaResponse(currentValue);
              const sanitizedResults = await Promise.all(
                response.results.map((media) => permissionChecker.sanitizeOutput(media))
              );

              utils.set(options.key, {
                results: sanitizedResults,
                meta: response.meta,
              });
            }
          },
          {
            schema,
            getModel: strapi.getModel.bind(strapi),
          },
          entry.data
        );
      };

      const formattedResults: any[] = await Promise.all(
        (results as HistoryVersionQueryResult[]).map(async (result) => {
          return {
            ...result,
            data: await populateEntry(result),
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
            // Ids on components throw an error when restoring
            utils.remove('id');

            if (options.attribute.repeatable && options.value === null) {
              // Repeatable Components should always be an array
              utils.set(options.key, [] as any);
            }
          }

          if (options.attribute.type === 'dynamiczone') {
            if (options.value === null) {
              // Dynamic zones should always be an array
              utils.set(options.key, [] as any);
            }
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
