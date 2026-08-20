import { parsePublicationFilter, type PublicationFilterMode } from '@strapi/utils';

/**
 * GraphQL still exposes deprecated `hasPublishedVersion`; normalize to `publicationFilter`
 * document-scoped modes so the document service only applies one code path.
 */
export const mergePublicationFilterFromGraphQLArgs = (
  args: Record<string, unknown>
): { publicationFilter?: PublicationFilterMode } => {
  if (args.publicationFilter != null && args.publicationFilter !== undefined) {
    return { publicationFilter: parsePublicationFilter(args.publicationFilter) };
  }
  if (args.hasPublishedVersion != null && args.hasPublishedVersion !== undefined) {
    return {
      publicationFilter: args.hasPublishedVersion
        ? 'has-published-version-document'
        : 'never-published-document',
    };
  }
  return {};
};
