import type { Core, Modules, Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import type { GetRecentDocuments, RecentDocument } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  const metadataService = strapi.plugin('content-manager').service('document-metadata');
  const permissionService = strapi.admin.services.permission as typeof import('./permission');

  type ContentTypeConfiguration = {
    uid: RecentDocument['model'];
    settings: { mainField: string };
  };
  const getConfiguration = async (
    contentTypeUids: RecentDocument['model'][]
  ): Promise<ContentTypeConfiguration[]> => {
    /**
     * Don't use the strapi.store util because we need to make
     * more precise queries than exact key matches, in order to make as few queries as possible.
     */
    const coreStore = strapi.db.query('strapi::core-store');
    const rawConfigurations = await coreStore.findMany({
      where: {
        key: {
          $in: contentTypeUids.map(
            (contentType) => `plugin_content_manager_configuration_content_types::${contentType}`
          ),
        },
      },
    });

    return rawConfigurations.map((rawConfiguration) => {
      return JSON.parse(rawConfiguration.value);
    });
  };

  const getPermittedContentTypes = async () => {
    const readPermissions = await permissionService.findMany({
      where: {
        role: { users: { id: strapi.requestContext.get()?.state?.user.id } },
        action: 'plugin::content-manager.explorer.read',
      },
    });

    return readPermissions
      .map((permission) => permission.subject)
      .filter(Boolean) as RecentDocument['model'][];
  };

  type DocumentMeta = {
    fields: string[];
    mainField: string;
    contentType: Schema.ContentType;
    hasDraftAndPublish: boolean;
    uid: RecentDocument['model'];
  };

  const getDocumentsMetaData = (
    allowedContentTypeUids: RecentDocument['model'][],
    configurations: ContentTypeConfiguration[]
  ): DocumentMeta[] => {
    return allowedContentTypeUids.map((uid) => {
      const configuration = configurations.find((config) => config.uid === uid);
      const contentType = strapi.contentType(uid);
      const fields = ['documentId', 'updatedAt'];

      // Add fields required to get the status if D&P is enabled
      const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);
      if (hasDraftAndPublish) {
        fields.push('publishedAt');
      }

      // Only add the main field if it's defined
      if (configuration?.settings.mainField) {
        fields.push(configuration.settings.mainField);
      }

      // Only add locale if it's localized
      const isLocalized = (contentType.pluginOptions?.i18n as any)?.localized;
      if (isLocalized) {
        fields.push('locale');
      }

      return {
        fields,
        mainField: configuration!.settings.mainField,
        contentType,
        hasDraftAndPublish,
        uid,
      };
    });
  };

  const formatDocuments = (documents: Modules.Documents.AnyDocument[], meta: DocumentMeta) => {
    return documents.map((document) => {
      const { mainField, ...restDocument } = document;

      return {
        data: {
          ...restDocument,
          ...(restDocument.publishedAt && { publishedAt: new Date(restDocument.publishedAt) }),
          updatedAt: new Date(document.updatedAt),
          title: document[meta.mainField ?? 'documentId'],
        },
        meta: {
          model: meta.uid,
          kind: meta.contentType.kind,
          hasDraftAndPublish: meta.hasDraftAndPublish,
        },
      };
    });
  };

  const addStatusToDocuments = async (
    documents: {
      data: RecentDocument[];
      meta: {
        model: RecentDocument['model'];
        kind: RecentDocument['kind'];
        hasDraftAndPublish: boolean;
      };
    }[]
  ): Promise<RecentDocument[]> => {
    return Promise.all(
      documents.map(async (document) => {
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
        } as unknown as RecentDocument;
      })
    );
  };

  return {
    async getRecentlyPublishedDocuments(): Promise<GetRecentDocuments.Response['data']> {
      const permittedContentTypes = await getPermittedContentTypes();
      const allowedContentTypeUids = permittedContentTypes.filter((contentType) => {
        return contentTypes.hasDraftAndPublish(strapi.contentType(contentType));
      });
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(allowedContentTypeUids);
      // Get the necessary metadata for the documents
      const documentsMeta = await getDocumentsMetaData(allowedContentTypeUids, configurations);
      // Now actually fetch and format the documents
      const recentDocuments = await Promise.all(
        documentsMeta.map(async (meta) => {
          const docs = await strapi.documents(meta.uid).findMany({
            limit: MAX_DOCUMENTS,
            sort: 'publishedAt:desc',
            fields: meta.fields,
            status: 'published',
          });

          return formatDocuments(docs, meta);
        })
      );

      const overallRecentDocuments = recentDocuments
        .flat()
        .sort((a, b) => {
          return b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf();
        })
        .slice(0, MAX_DOCUMENTS);

      return addStatusToDocuments(overallRecentDocuments);
    },
    async getRecentlyUpdatedDocuments(): Promise<GetRecentDocuments.Response['data']> {
      const allowedContentTypeNames = await getPermittedContentTypes();
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(allowedContentTypeNames);
      // Get the necessary metadata for the documents
      const documentsMeta = await getDocumentsMetaData(allowedContentTypeNames, configurations);
      // Now actually fetch and format the documents
      const recentDocuments = await Promise.all(
        documentsMeta.map(async (meta) => {
          const docs = await strapi.documents(meta.uid).findMany({
            limit: MAX_DOCUMENTS,
            sort: 'updatedAt:desc',
            fields: meta.fields,
          });

          return formatDocuments(docs, meta);
        })
      );

      const overallRecentDocuments = recentDocuments
        .flat()
        .sort((a, b) => {
          return b.data.updatedAt.valueOf() - a.data.updatedAt.valueOf();
        })
        .slice(0, MAX_DOCUMENTS);

      return addStatusToDocuments(overallRecentDocuments);
    },
  };
};

export { createHomepageService };
