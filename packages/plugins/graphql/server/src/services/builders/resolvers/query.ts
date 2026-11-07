import { omit } from 'lodash';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

import { mergePublicationFilterFromGraphQLArgs } from './merge-publication-args';
import { getOutputScope, isSubjectAware } from '../permissions';
import { sanitizeEntries } from '../nested-output';

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

  const { publicationFilter } = mergePublicationFilterFromGraphQLArgs(args);
  if (publicationFilter !== undefined) {
    merged.publicationFilter = publicationFilter;
  }

  return merged;
};

export default ({ strapi }: Context) => ({
  buildQueriesResolvers({ contentType }: { contentType: Schema.ContentType }) {
    const { uid } = contentType;

    /**
     * Validates and sanitizes the query as the REST controllers do: conditions, the drafts gate
     * and the populate depth apply to a caller with subject-aware permissions. `status` and
     * `publicationFilter` come from the GraphQL arguments, so this is their only guard.
     */
    const prepare = async (args: any, ctx: any, action: 'find' | 'findOne') => {
      const auth = ctx?.state?.auth;

      await strapi.contentAPI.validate.query(args, contentType, { auth, action });

      return (await strapi.contentAPI.sanitize.query(args, contentType, {
        auth,
        action,
      })) as Record<string, unknown>;
    };

    /**
     * The output of a caller with subject-aware permissions goes through the output rules (private
     * fields, field rules) in the status and locale it was read in, and the nested resolvers learn
     * from it which fields of each entry the caller may read. Others get it as it is.
     */
    const sanitizeOutput = async (
      data: unknown,
      ctx: any,
      action: 'find' | 'findOne',
      params: Record<string, unknown>
    ) => {
      if (data === null || data === undefined || !isSubjectAware(strapi, ctx)) {
        return data;
      }

      return sanitizeEntries(strapi, ctx, contentType, data, {
        action,
        ...(await getOutputScope(strapi, contentType, params)),
      });
    };

    return {
      async findMany(parent: any, args: any, ctx: any) {
        const sanitizedQuery = await prepare(args, ctx, 'find');
        const params = mergeDocumentListParams(sanitizedQuery, args);

        const results = await strapi.documents!(uid).findMany(params as any);

        return sanitizeOutput(results, ctx, 'find', params);
      },

      async findFirst(parent: any, args: any, ctx: any) {
        const sanitizedQuery = await prepare(args, ctx, 'find');
        const params = mergeDocumentListParams(sanitizedQuery, args);

        const result = await strapi.documents!(uid).findFirst(params as any);

        return sanitizeOutput(result, ctx, 'find', params);
      },

      async findOne(parent: any, args: any, ctx: any) {
        const { documentId } = args;

        const sanitizedQuery = await prepare(args, ctx, 'findOne');

        const merged = mergeDocumentListParams(
          omit(sanitizedQuery, ['id', 'documentId']) as Record<string, unknown>,
          args
        );

        const result = await strapi.documents!(uid).findOne({ ...merged, documentId } as any);

        return sanitizeOutput(result, ctx, 'findOne', merged);
      },
    };
  },
});
