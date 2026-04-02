import { omit } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

/** Merge sanitized query with resolver args so GraphQL-coerced publication args are not dropped. */
const mergeDocumentListParams = (
  sanitizedQuery: Record<string, unknown>,
  args: Record<string, unknown>
) => {
  const { status, ...rest } = sanitizedQuery;

  const merged: Record<string, unknown> = {
    ...rest,
    status: (status as 'draft' | 'published' | undefined) ?? 'published',
  };

  if (args.publicationFilter !== undefined && args.publicationFilter !== null) {
    merged.publicationFilter = args.publicationFilter;
  }

  // Deprecated GraphQL arg; prefer `publicationFilter`.
  if (args.hasPublishedVersion !== undefined && args.hasPublishedVersion !== null) {
    merged.hasPublishedVersion = args.hasPublishedVersion;
  }

  return merged;
};

export default ({ strapi }: Context) => ({
  buildQueriesResolvers({ contentType }: { contentType: Schema.ContentType }) {
    const { uid } = contentType;

    return {
      async findMany(parent: any, args: any, ctx: any) {
        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = (await strapi.contentAPI.sanitize.query(args, contentType, {
          auth: ctx?.state?.auth,
        })) as Record<string, unknown>;

        return strapi.documents!(uid).findMany(
          mergeDocumentListParams(sanitizedQuery, args) as any
        );
      },

      async findFirst(parent: any, args: any, ctx: any) {
        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = (await strapi.contentAPI.sanitize.query(args, contentType, {
          auth: ctx?.state?.auth,
        })) as Record<string, unknown>;

        return strapi.documents!(uid).findFirst(
          mergeDocumentListParams(sanitizedQuery, args) as any
        );
      },

      async findOne(parent: any, args: any, ctx: any) {
        const { documentId } = args;

        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = (await strapi.contentAPI.sanitize.query(args, contentType, {
          auth: ctx?.state?.auth,
        })) as Record<string, unknown>;

        const merged = mergeDocumentListParams(
          omit(['id', 'documentId'], sanitizedQuery) as Record<string, unknown>,
          args
        );

        return strapi.documents!(uid).findOne({ ...merged, documentId } as any);
      },
    };
  },
});
