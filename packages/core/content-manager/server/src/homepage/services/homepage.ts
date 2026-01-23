/* eslint-disable func-names */
import type { Core, Modules, Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

import type {
  GetCountDocuments,
  GetRecentDocuments,
  RecentDocument,
} from '../../../../shared/contracts/homepage';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  const metadataService = strapi.plugin('content-manager').service('document-metadata');
  const permissionService = strapi.admin.services.permission;

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
    const readPermissions: Modules.Permissions.PermissionRule[] = await permissionService.findMany({
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

  const formatDocuments = (
    documents: Modules.Documents.AnyDocument[],
    meta: ContentTypeMeta,
    populate?: string[]
  ) => {
    return documents.map((document) => {
      const additionalFields =
        populate?.reduce(
          (acc, key) => {
            acc[key] = document[key];
            return acc;
          },
          {} as Record<string, any>
        ) || {};
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
        ...additionalFields,
      };
    });
  };

  const permissionCheckerService = strapi.plugin('content-manager').service('permission-checker');
  const getPermissionChecker = (uid: string) =>
    permissionCheckerService.create({
      userAbility: strapi.requestContext.get()?.state.userAbility,
      model: uid,
    });

  return {
    async addStatusToDocuments(documents: RecentDocument[]): Promise<RecentDocument[]> {
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
    },

    async queryLastDocuments(
      additionalQueryParams?: Record<string, unknown>,
      draftAndPublishOnly?: boolean
    ): Promise<RecentDocument[]> {
      const permittedContentTypes = await getPermittedContentTypes();
      const allowedContentTypeUids = draftAndPublishOnly
        ? permittedContentTypes.filter((uid) => {
            return contentTypes.hasDraftAndPublish(strapi.contentType(uid));
          })
        : permittedContentTypes;
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(allowedContentTypeUids);
      // Get the necessary metadata for the documents
      const contentTypesMeta = getContentTypesMeta(allowedContentTypeUids, configurations);

      const recentDocuments = await Promise.all(
        contentTypesMeta.map(async (meta) => {
          const permissionQuery = await getPermissionChecker(meta.uid).sanitizedQuery.read({
            limit: MAX_DOCUMENTS,
            fields: meta.fields,
            ...additionalQueryParams,
            locale: '*',
          });

          const docs = await strapi.documents(meta.uid).findMany(permissionQuery);
          const populate = additionalQueryParams?.populate as string[];

          return formatDocuments(docs, meta, populate);
        })
      );

      return recentDocuments
        .flat()
        .sort((a, b) => {
          switch (additionalQueryParams?.sort) {
            case 'publishedAt:desc':
              if (!a.publishedAt || !b.publishedAt) return 0;
              return b.publishedAt.valueOf() - a.publishedAt.valueOf();
            case 'publishedAt:asc':
              if (!a.publishedAt || !b.publishedAt) return 0;
              return a.publishedAt.valueOf() - b.publishedAt.valueOf();
            case 'updatedAt:desc':
              if (!a.updatedAt || !b.updatedAt) return 0;
              return b.updatedAt.valueOf() - a.updatedAt.valueOf();
            case 'updatedAt:asc':
              if (!a.updatedAt || !b.updatedAt) return 0;
              return a.updatedAt.valueOf() - b.updatedAt.valueOf();
            default:
              return 0;
          }
        })
        .slice(0, MAX_DOCUMENTS);
    },

    async getRecentlyPublishedDocuments(): Promise<GetRecentDocuments.Response['data']> {
      const recentlyPublishedDocuments = await this.queryLastDocuments(
        {
          sort: 'publishedAt:desc',
          status: 'published',
        },
        true
      );

      return this.addStatusToDocuments(recentlyPublishedDocuments);
    },

    async getRecentlyUpdatedDocuments(): Promise<GetRecentDocuments.Response['data']> {
      const recentlyUpdatedDocuments = await this.queryLastDocuments({
        sort: 'updatedAt:desc',
      });

      return this.addStatusToDocuments(recentlyUpdatedDocuments);
    },

    async getCountDocuments(): Promise<GetCountDocuments.Response['data']> {
      const permittedContentTypes = await getPermittedContentTypes();
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(permittedContentTypes);
      // Get the necessary metadata for the documents
      const contentTypesMeta = getContentTypesMeta(permittedContentTypes, configurations);

      const countDocuments = {
        draft: 0,
        published: 0,
        modified: 0,
      };

      await Promise.all(
        contentTypesMeta.map(async (meta) => {
          const strapiDBConnection = strapi.db.connection;
          const tableName = strapi.contentType(meta.uid).collectionName;
          if (tableName) {
            const draftDocuments = await strapiDBConnection(tableName)
              .whereNull('published_at')
              .whereIn('document_id', function () {
                this.select('document_id')
                  .from(tableName)
                  .groupBy('document_id')
                  .havingRaw('COUNT(*) = 1');
              })
              .count('* as count')
              .first();
            countDocuments.draft += Number(draftDocuments?.count) || 0;

            const publishedDocuments = meta.hasDraftAndPublish
              ? await strapiDBConnection(tableName)
                  .countDistinct('draft.document_id as count')
                  .from(`${tableName} as draft`)
                  .join(`${tableName} as published`, function () {
                    this.on('draft.document_id', '=', 'published.document_id')
                      .andOn('draft.updated_at', '=', 'published.updated_at')
                      .andOnNull('draft.published_at')
                      .andOnNotNull('published.published_at');
                  })
                  .first()
              : await strapiDBConnection(tableName)
                  .countDistinct('document_id as count')
                  .from(`${tableName}`)
                  .first();
            countDocuments.published += Number(publishedDocuments?.count) || 0;

            const modifiedDocuments = await strapiDBConnection(tableName)
              .select('draft.document_id')
              .from(`${tableName} as draft`)
              .join(`${tableName} as published`, function () {
                this.on('draft.document_id', '=', 'published.document_id')
                  .andOn('draft.updated_at', '!=', 'published.updated_at')
                  .andOnNull('draft.published_at')
                  .andOnNotNull('published.published_at');
              })
              .countDistinct('draft.document_id as count')
              .groupBy('draft.document_id')
              .first();
            countDocuments.modified += Number(modifiedDocuments?.count) || 0;
          }
        })
      );

      return countDocuments;
    },
  };
};

export { createHomepageService };
