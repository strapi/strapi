import type { Core, Modules, Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';
import type { GetRecentDocuments, RecentDocument } from '../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  const metadataService = strapi.plugin('content-manager').service('document-metadata');
  const permissionService = strapi.admin.services.permission as typeof import('./permission');

  type ContentTypeConfiguration = {
    uid: RecentDocument['contentTypeUid'];
    settings: { mainField: string };
  };
  const getConfiguration = async (
    contentTypeUids: RecentDocument['contentTypeUid'][]
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
      .filter(Boolean) as RecentDocument['contentTypeUid'][];
  };

  type ContentTypeMeta = {
    fields: string[];
    mainField: string;
    contentType: Schema.ContentType;
    hasDraftAndPublish: boolean;
    uid: RecentDocument['contentTypeUid'];
  };

  const getContentTypesMeta = (
    allowedContentTypeUids: RecentDocument['contentTypeUid'][],
    configurations: ContentTypeConfiguration[]
  ): ContentTypeMeta[] => {
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

  const formatDocuments = (documents: Modules.Documents.AnyDocument[], meta: ContentTypeMeta) => {
    return documents.map((document) => {
      return {
        documentId: document.documentId,
        locale: document.locale ?? null,
        updatedAt: new Date(document.updatedAt),
        title: document[meta.mainField ?? 'documentId'],
        publishedAt:
          meta.hasDraftAndPublish && document.publishedAt ? new Date(document.publishedAt) : null,
        contentTypeUid: meta.uid,
        contentTypeDisplayName: meta.contentType.info.displayName,
        kind: meta.contentType.kind,
      };
    });
  };

  const addStatusToDocuments = async (documents: RecentDocument[]): Promise<RecentDocument[]> => {
    return Promise.all(
      documents.map(async (recentDocument) => {
        const hasDraftAndPublish = contentTypes.hasDraftAndPublish(
          strapi.contentType(recentDocument.contentTypeUid)
        );
        /**
         * Tries to query the other version of the document if draft and publish is enabled,
         * so that we know when to give the "modified" status.
         */
        const { availableStatus } = await metadataService.getMetadata(
          recentDocument.contentTypeUid,
          recentDocument,
          {
            availableStatus: hasDraftAndPublish,
            availableLocales: false,
          }
        );
        const status: RecentDocument['status'] = metadataService.getStatus(
          recentDocument,
          availableStatus
        );

        return {
          ...recentDocument,
          status: hasDraftAndPublish ? status : undefined,
        };
      })
    );
  };

  const permissionCheckerService = strapi.plugin('content-manager').service('permission-checker');
  const getPermissionChecker = (uid: string) =>
    permissionCheckerService.create({
      userAbility: strapi.requestContext.get()?.state.userAbility,
      model: uid,
    });

  return {
    async getRecentlyPublishedDocuments(): Promise<GetRecentDocuments.Response['data']> {
      const permittedContentTypes = await getPermittedContentTypes();
      const allowedContentTypeUids = permittedContentTypes.filter((uid) => {
        return contentTypes.hasDraftAndPublish(strapi.contentType(uid));
      });
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(allowedContentTypeUids);
      // Get the necessary metadata for the documents
      const contentTypesMeta = getContentTypesMeta(allowedContentTypeUids, configurations);
      // Now actually fetch and format the documents
      const recentDocuments = await Promise.all(
        contentTypesMeta.map(async (meta) => {
          const permissionQuery = await getPermissionChecker(meta.uid).sanitizedQuery.read({
            limit: MAX_DOCUMENTS,
            sort: 'publishedAt:desc',
            fields: meta.fields,
            status: 'published',
          });

          const docs = await strapi.documents(meta.uid).findMany(permissionQuery);

          return formatDocuments(docs, meta);
        })
      );

      const overallRecentDocuments = recentDocuments
        .flat()
        .sort((a, b) => {
          if (!a.publishedAt || !b.publishedAt) return 0;
          return b.publishedAt.valueOf() - a.publishedAt.valueOf();
        })
        .slice(0, MAX_DOCUMENTS);

      return addStatusToDocuments(overallRecentDocuments);
    },

    async getRecentlyUpdatedDocuments(): Promise<GetRecentDocuments.Response['data']> {
      const allowedContentTypeUids = await getPermittedContentTypes();
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(allowedContentTypeUids);
      // Get the necessary metadata for the documents
      const contentTypesMeta = getContentTypesMeta(allowedContentTypeUids, configurations);
      // Now actually fetch and format the documents
      const recentDocuments = await Promise.all(
        contentTypesMeta.map(async (meta) => {
          const permissionQuery = await getPermissionChecker(meta.uid).sanitizedQuery.read({
            limit: MAX_DOCUMENTS,
            sort: 'updatedAt:desc',
            fields: meta.fields,
          });

          const docs = await strapi.documents(meta.uid).findMany(permissionQuery);

          return formatDocuments(docs, meta);
        })
      );

      const overallRecentDocuments = recentDocuments
        .flat()
        .sort((a, b) => {
          return b.updatedAt.valueOf() - a.updatedAt.valueOf();
        })
        .slice(0, MAX_DOCUMENTS);

      return addStatusToDocuments(overallRecentDocuments);
    },
  };
};

export { createHomepageService };
