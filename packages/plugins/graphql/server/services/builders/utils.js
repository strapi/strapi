'use strict';

const { entries, mapValues, omit } = require('lodash/fp');
const {
  pagination: { withDefaultPagination },
  contentTypes: { hasDraftAndPublish },
} = require('@strapi/utils');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  return {
    /**
     * Get every args for a given content type
     * @param {object} contentType
     * @param {object} options
     * @param {boolean} options.multiple
     * @return {object}
     */
    getContentTypeArgs(contentType, { multiple = true } = {}) {
      const { naming } = getService('utils');
      const { args } = getService('internals');

      const { kind, modelType } = contentType;

      // Components
      if (modelType === 'component') {
        if (!multiple) return {};

        return {
          filters: naming.getFiltersInputTypeName(contentType),
          pagination: args.PaginationArg,
          sort: args.SortArg,
        };
      }

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
     * @param {object} attributes
     * @return {Object<string, object>}
     */
    getUniqueScalarAttributes(attributes) {
      const { isStrapiScalar } = getService('utils').attributes;

      const uniqueAttributes = entries(attributes).filter(
        ([, attribute]) => isStrapiScalar(attribute) && attribute.unique
      );

      return Object.fromEntries(uniqueAttributes);
    },

    /**
     * Map each value from an attribute to a FiltersInput type name
     * @param {object} attributes - The attributes object to transform
     * @return {Object<string, string>}
     */
    scalarAttributesToFiltersMap: mapValues((attribute) => {
      const { mappers, naming } = getService('utils');

      const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

      return naming.getScalarFilterInputTypeName(gqlScalar);
    }),

    /**
     * Apply basic transform to GQL args
     */
    transformArgs(args, { contentType, usePagination = false } = {}) {
      const { mappers } = getService('utils');
      const { config } = strapi.plugin('graphql');
      const { pagination = {}, filters = {} } = args;

      // Init
      const newArgs = omit(['pagination', 'filters'], args);

      // Pagination
      if (usePagination) {
        const defaultLimit = config('defaultLimit');
        const maxLimit = config('maxLimit');

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
