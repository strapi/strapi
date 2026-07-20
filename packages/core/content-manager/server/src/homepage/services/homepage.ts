/* eslint-disable func-names */
import type { Core, Modules, Schema } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

import type {
  GetCountDocuments,
  GetRecentDocuments,
  RecentDocument,
} from '../../../../shared/contracts/homepage';

import {
  buildHomepageQueryFields,
  compactSanitizedFields,
  resolveReadableMainField,
  resolveTitleField,
} from './homepage-query-utils';

const createHomepageService = ({ strapi }: { strapi: Core.Strapi }) => {
  const MAX_DOCUMENTS = 4;

  const metadataService = strapi.plugin('content-manager').service('document-metadata');
  const permissionService = strapi.admin.services.permission;

  const getRegisteredContentType = (uid: RecentDocument['contentTypeUid']) => {
    const contentType = strapi.contentTypes[uid];

    if (contentType === undefined) {
      strapi.log.warn(
        `Skipping homepage content type "${uid}" because it is no longer registered.`
      );
      return undefined;
    }

    return contentType;
  };

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

    // Deduplicate subjects using a Set: the JOIN across permission -> role -> users produces one row
    // per role the user belongs to, so a multi-role user gets duplicate subjects.
    // Using a Set collapses them to unique content type UID.
    return [
      ...new Set(
        readPermissions
          .map((permission) => permission.subject)
          .filter((subject): subject is RecentDocument['contentTypeUid'] => {
            if (!subject) {
              return false;
            }

            const contentType = strapi.contentTypes[subject as keyof typeof strapi.contentTypes];
            const contentTypeOptions = contentType?.pluginOptions?.['content-manager'] as
              | { visible?: boolean }
              | undefined;

            return contentTypeOptions?.visible !== false;
          })
      ),
    ];
  };

  type ContentTypeMeta = {
    fields: string[];
    mainField: string;
    contentType: Schema.ContentType;
    hasDraftAndPublish: boolean;
    uid: RecentDocument['contentTypeUid'];
  };

  const permissionCheckerService = strapi.plugin('content-manager').service('permission-checker');
  const getPermissionChecker = (uid: string) =>
    permissionCheckerService.create({
      userAbility: strapi.requestContext.get()?.state.userAbility,
      model: uid,
    });

  const getContentTypesMeta = (
    allowedContentTypeUids: RecentDocument['contentTypeUid'][],
    configurations: ContentTypeConfiguration[]
  ): ContentTypeMeta[] => {
    return allowedContentTypeUids.reduce<ContentTypeMeta[]>((acc, uid) => {
      const configuration = configurations.find((config) => config.uid === uid);
      const contentType = getRegisteredContentType(uid);

      if (contentType === undefined) {
        return acc;
      }

      const mainField = resolveReadableMainField(
        contentType,
        configuration,
        getPermissionChecker(uid)
      );
      const fields = buildHomepageQueryFields(contentType, mainField);
      const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);

      acc.push({
        fields,
        mainField,
        contentType,
        hasDraftAndPublish,
        uid,
      });

      return acc;
    }, []);
  };

  /**
   * Homepage widgets expect JSON-safe ISO strings. Returning `Date` objects can
   * serialize as `{}` after spread/clone (see https://github.com/strapi/strapi/issues/27013).
   */
  const toIsoDateString = (value: unknown): string | null => {
    if (value == null || value === '') {
      return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
        title: document[meta.mainField ?? 'documentId'],
        contentTypeUid: meta.uid,
        contentTypeDisplayName: meta.contentType.info.displayName,
        kind: meta.contentType.kind,
        ...additionalFields,
        // Keep dates last so populate cannot overwrite with non-JSON-safe values
        updatedAt: toIsoDateString(document.updatedAt) as string,
        publishedAt:
          meta.hasDraftAndPublish && document.publishedAt
            ? toIsoDateString(document.publishedAt)
            : null,
      };
    });
  };

  const sanitizeHomepageQuery = async (
    meta: ContentTypeMeta,
    additionalQueryParams?: Record<string, unknown>
  ) => {
    const permissionQuery = await getPermissionChecker(meta.uid).sanitizedQuery.read({
      limit: MAX_DOCUMENTS,
      fields: meta.fields,
      ...additionalQueryParams,
      locale: '*',
    });

    const sanitizedFields = compactSanitizedFields(permissionQuery.fields);
    if (sanitizedFields !== undefined) {
      permissionQuery.fields = sanitizedFields;
    }

    return {
      permissionQuery,
      titleField: resolveTitleField(meta.mainField, sanitizedFields),
    };
  };

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
            const contentType = getRegisteredContentType(uid);

            return contentType !== undefined && contentTypes.hasDraftAndPublish(contentType);
          })
        : permittedContentTypes;
      // Fetch the configuration for each content type in a single query
      const configurations = await getConfiguration(allowedContentTypeUids);
      // Get the necessary metadata for the documents
      const contentTypesMeta = getContentTypesMeta(allowedContentTypeUids, configurations);

      const recentDocuments = await Promise.all(
        contentTypesMeta.map(async (meta) => {
          const { permissionQuery, titleField } = await sanitizeHomepageQuery(
            meta,
            additionalQueryParams
          );

          const docs = await strapi.documents(meta.uid).findMany(permissionQuery);
          const populate = additionalQueryParams?.populate as string[];

          return formatDocuments(docs, { ...meta, mainField: titleField }, populate);
        })
      );

      return recentDocuments
        .flat()
        .sort((a, b) => {
          // ISO-8601 strings compare lexicographically in chronological order
          switch (additionalQueryParams?.sort) {
            case 'publishedAt:desc':
              if (!a.publishedAt || !b.publishedAt) return 0;
              return b.publishedAt.localeCompare(a.publishedAt);
            case 'publishedAt:asc':
              if (!a.publishedAt || !b.publishedAt) return 0;
              return a.publishedAt.localeCompare(b.publishedAt);
            case 'updatedAt:desc':
              if (!a.updatedAt || !b.updatedAt) return 0;
              return b.updatedAt.localeCompare(a.updatedAt);
            case 'updatedAt:asc':
              if (!a.updatedAt || !b.updatedAt) return 0;
              return a.updatedAt.localeCompare(b.updatedAt);
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
          if (!tableName) return;

          if (!meta.hasDraftAndPublish) {
            const publishedDocuments = await strapiDBConnection(tableName)
              .countDistinct('document_id as count')
              .first();
            countDocuments.published += Number(publishedDocuments?.count) || 0;
            return;
          }

          // Classify each document_id into a single bucket (draft / published / modified)
          // in one pass. Replaces three separate self-join queries that scaled poorly on
          // large tables — see https://github.com/strapi/strapi/issues/25200.
          const classified = strapiDBConnection(tableName)
            .select('document_id')
            .select(
              strapiDBConnection.raw(
                `CASE
                  WHEN MAX(CASE WHEN published_at IS NOT NULL THEN 1 ELSE 0 END) = 0
                    THEN 'draft'
                  WHEN MAX(CASE WHEN published_at IS NULL THEN updated_at END) =
                       MAX(CASE WHEN published_at IS NOT NULL THEN updated_at END)
                    THEN 'published'
                  ELSE 'modified'
                END AS bucket`
              )
            )
            .groupBy('document_id');

          const counts = await strapiDBConnection
            .from(classified.as('classified'))
            .select(
              strapiDBConnection.raw(
                `COUNT(CASE WHEN bucket = 'draft' THEN 1 END) AS draft,
                 COUNT(CASE WHEN bucket = 'published' THEN 1 END) AS published,
                 COUNT(CASE WHEN bucket = 'modified' THEN 1 END) AS modified`
              )
            )
            .first();

          countDocuments.draft += Number(counts?.draft) || 0;
          countDocuments.published += Number(counts?.published) || 0;
          countDocuments.modified += Number(counts?.modified) || 0;
        })
      );

      return countDocuments;
    },
  };
};

export { createHomepageService };
