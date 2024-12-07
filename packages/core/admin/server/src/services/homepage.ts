import type { Core, UID } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import type { GetRecentDocuments } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  const metadataService = strapi.plugin('content-manager').service('document-metadata');
  const permissionService = strapi.admin.services.permission as typeof import('./permission');

  /**
   * Don't use the strapi.store util because we need to make
   * more precise queries than exact key matches, in order to make as few queries as possible.
   */
  const coreStore = strapi.db.query('strapi::core-store');

  return {
    async getRecentUpdates(): Promise<GetRecentDocuments.Response['data']> {
      // Get all the content types the user has permissions to read
      const readPermissions = await permissionService.findMany({
        where: {
          role: { users: { id: strapi.requestContext.get()?.state?.user.id } },
          action: 'plugin::content-manager.explorer.read',
        },
      });
      const allowedContentTypeNames = readPermissions
        .map((permission) => permission.subject)
        .filter(Boolean) as UID.ContentType[];

      // Fetch the configuration for each content type in a single query
      const rawConfigurations = await coreStore.findMany({
        where: {
          key: {
            $in: allowedContentTypeNames.map(
              (contentType) => `plugin_content_manager_configuration_content_types::${contentType}`
            ),
          },
        },
      });
      const configurations = rawConfigurations.map((rawConfiguration) => {
        return JSON.parse(rawConfiguration.value);
      });

      const recentDocuments = await Promise.all(
        allowedContentTypeNames.map(async (contentTypeName) => {
          const configuration = configurations.find((config) => config.uid === contentTypeName);
          const contentType = strapi.contentType(contentTypeName);
          const fields = ['documentId', 'updatedAt'];

          // Add fields required to get the status if D&P is enabled
          const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);
          if (hasDraftAndPublish) {
            fields.push('publishedAt');
          }

          // Only add the main field if it's defined
          const { mainField } = configuration.settings;
          if (mainField) {
            fields.push(mainField);
          }

          // Only add locale if it's localized
          const isLocalized = (contentType.pluginOptions?.i18n as any)?.localized;
          if (isLocalized) {
            fields.push('locale');
          }

          const documents = await strapi.documents(contentTypeName).findMany({
            limit: MAX_DOCUMENTS,
            sort: 'updatedAt:desc',
            fields,
          });

          return documents.map((document) => {
            /**
             * Save the main field value before deleting it so we can use the common
             * title key instead across all content types. Use the delete operator instead of
             * destructuring or lodash omit for better type inference.
             */
            const mainFieldValue = document[mainField ?? 'documentId'];
            delete document[mainField];

            return {
              data: {
                ...document,
                updatedAt: new Date(document.updatedAt),
                title: mainFieldValue,
              },
              meta: {
                model: contentTypeName,
                modelDisplayName: contentType.info.displayName,
                kind: contentType.kind,
                hasDraftAndPublish,
              },
            };
          });
        })
      );

      const overallRecentDocuments = recentDocuments
        .flat()
        .sort((a, b) => b.data.updatedAt.valueOf() - a.data.updatedAt.valueOf())
        .slice(0, MAX_DOCUMENTS);

      return Promise.all(
        overallRecentDocuments.map(async (document) => {
          /**
           * Tries to query the other version of the document if draft and publish is enabled,
           * so that we know when to give the "modified" status.
           */
          const { availableStatus } = await metadataService.getMetadata(
            document.meta.model,
            document.data,
            {
              availableStatus: document.meta.hasDraftAndPublish,
              availableLocales: false,
            }
          );
          const status = metadataService.getStatus(document.data, availableStatus);

          return {
            ...document.data,
            ...document.meta,
            status,
          };
        })
      );
    },
  };
};

export { createHomepageService };
