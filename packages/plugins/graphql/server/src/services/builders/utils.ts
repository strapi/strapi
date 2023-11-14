import { entries, mapValues, omit } from 'lodash/fp';
import { pagination, contentTypes } from '@strapi/utils';
import type { Strapi, Schema } from '@strapi/types';

const { withDefaultPagination } = pagination;
const { hasDraftAndPublish } = contentTypes;

export default ({ strapi }: { strapi: Strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  return {
    /**
     * Get every args for a given content type
     * @param {object} contentType
     * @param {object} options
     * @param {boolean} options.multiple
     * @return {object}
     */
    getContentTypeArgs(contentType: Schema.Any, { multiple = true } = {}) {
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

      // Collection Types
      if (kind === 'collectionType') {
        if (!multiple) {
          return { id: 'ID' };
        }

        const params = {
          filters: naming.getFiltersInputTypeName(contentType),
          pagination: args.PaginationArg,
          sort: args.SortArg,
        };

        if (hasDraftAndPublish(contentType)) {
          Object.assign(params, { publicationState: args.PublicationStateArg });
        }

        return params;
      }

      // Single Types
      if (kind === 'singleType') {
        const params = {};

        if (hasDraftAndPublish(contentType)) {
          Object.assign(params, { publicationState: args.PublicationStateArg });
        }

        return params;
      }
    },

    /**
     * Filter an object entries and keep only those whose value is a unique scalar attribute
     */
    getUniqueScalarAttributes(attributes: Schema.Attributes) {
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
    scalarAttributesToFiltersMap(attributes: Schema.Attributes) {
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
      }: { contentType: Schema.ContentType; usePagination?: boolean }
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
