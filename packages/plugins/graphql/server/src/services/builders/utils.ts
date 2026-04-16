import { entries, mapValues, omit } from 'lodash/fp';
import { idArg, nonNull } from 'nexus';
import { pagination } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

const { withDefaultPagination } = pagination;

type ContentTypeArgsOptions = {
  multiple?: boolean;
  isNested?: boolean;
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  return {
    getContentTypeArgs(
      contentType: Struct.Schema,
      { multiple = true, isNested = false }: ContentTypeArgsOptions = {}
    ) {
      const { naming } = getService('utils');
      const { args } = getService('internals');

      const { modelType } = contentType;

      // Components
      if (modelType === 'component') {
        if (!multiple) return {};

        return {
          filters: naming.getFiltersInputTypeName(contentType),
          pagination: args.PaginationArg,
          sort: args.SortArg,
        };
      }

      const { kind } = contentType;

      // On non–D&P roots (e.g. User) these args do not version the parent document, but they
      // are required: association resolvers inherit them into nested D&P relations (see
      // builders/resolvers/association.ts + rootQueryArgs). Omitting them broke draft/published
      // control for populated relations (e.g. github.com/strapi/strapi/issues/25746).
      //
      // Future direction: add `status` / `hasPublishedVersion` to GraphQL args on nested
      // to-many (and to-one) relation fields when the *target* content type has D&P, instead
      // of relying on root-level “context” that is easy to misread (args on User affecting
      // Articles). That would allow different publication settings per relation branch, match
      // how developers think about the graph, and let non-DP roots drop these args if desired.
      // Would require extending getContentTypeArgs(..., { isNested: true }) for D&P targets
      // and teaching association.ts to honor args.hasPublishedVersion on nested fields, not
      // only root inheritance.
      const publicationArgs = {
        status: args.PublicationStatusArg,
        hasPublishedVersion: args.HasPublishedVersionArg,
      };

      // Collection Types
      if (kind === 'collectionType') {
        if (!multiple) {
          return {
            documentId: nonNull(idArg()),
            ...publicationArgs,
          };
        }

        const params: Record<string, unknown> = {
          filters: naming.getFiltersInputTypeName(contentType),
          pagination: args.PaginationArg,
          sort: args.SortArg,
        };

        if (!isNested) {
          Object.assign(params, publicationArgs);
        }

        return params;
      }

      // Single Types
      if (kind === 'singleType') {
        const params: Record<string, unknown> = {};

        if (!isNested) {
          Object.assign(params, publicationArgs);
        }

        return params;
      }
    },

    /**
     * Filter an object entries and keep only those whose value is a unique scalar attribute
     */
    getUniqueScalarAttributes(attributes: Struct.SchemaAttributes) {
      const { isStrapiScalar } = getService('utils').attributes;

      const uniqueAttributes = entries(attributes).filter(
        ([, attribute]) => isStrapiScalar(attribute) && 'unique' in attribute && attribute.unique
      );

      return Object.fromEntries(uniqueAttributes);
    },

    /**
     * Map each value from an attribute to a FiltersInput type name
     * @param {object} attributes - The attributes object to transform
     * @return {Object<string, string>}
     */
    scalarAttributesToFiltersMap(attributes: Struct.SchemaAttributes) {
      return mapValues((attribute) => {
        const { mappers, naming } = getService('utils');

        const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

        return naming.getScalarFilterInputTypeName(gqlScalar);
      }, attributes);
    },

    /**
     * Apply basic transform to GQL args
     */
    transformArgs(
      args: any,
      {
        contentType,
        usePagination = false,
      }: { contentType: Struct.ContentTypeSchema; usePagination?: boolean }
    ) {
      const { mappers } = getService('utils');
      const { config } = strapi.plugin('graphql');
      const { pagination = {}, filters = {} } = args;

      // Init
      const newArgs = omit(['pagination', 'filters'], args);

      // Pagination
      if (usePagination) {
        const defaultLimit: number = config('defaultLimit');
        const maxLimit: number = config('maxLimit');

        Object.assign(
          newArgs,
          withDefaultPagination(pagination, {
            maxLimit,
            defaults: {
              offset: { limit: defaultLimit },
              page: { pageSize: defaultLimit },
            },
          })
        );
      }

      // Filters
      if (args.filters) {
        Object.assign(newArgs, {
          filters: mappers.graphQLFiltersToStrapiQuery(filters, contentType),
        });
      }

      return newArgs;
    },
  };
};
