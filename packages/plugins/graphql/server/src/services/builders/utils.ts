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

      // `status` / `hasPublishedVersion` on every root collection & single-type query.
      // Document service ignores or applies them by content type (D&P vs not).
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
