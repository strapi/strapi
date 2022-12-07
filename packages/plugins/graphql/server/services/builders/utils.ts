import { StrapiCTX } from '../../types/strapi-ctx';

import { entries, mapValues, omit } from 'lodash/fp';
import { pagination, contentTypes } from '@strapi/utils';
import { ContentType } from '../../types/schema';

const { withDefaultPagination } = pagination;
const { hasDraftAndPublish } = contentTypes;

export default ({ strapi }: StrapiCTX) => {
  const { service: getService } = strapi.plugin('graphql');

  return {
    /**
     * Get every args for a given content type
     */
    getContentTypeArgs(contentType: ContentType, builder: any, { multiple = true } = {}) {
      const { naming } = getService('utils');
      const { args } = getService('internals');

      const { kind, modelType } = contentType;

      // Components
      if (modelType === 'component') {
        if (!multiple) return {};

        return {
          filters: builder.arg({ type: naming.getFiltersInputTypeName(contentType) }),
          pagination: args.PaginationArg(builder),
          sort: args.SortArg(builder),
        };
      }

      // Collection Types
      if (kind === 'collectionType') {
        if (!multiple) {
          return { id: builder.arg({ type: 'ID' }) };
        }

        const params = {
          filters: builder.arg({ type: naming.getFiltersInputTypeName(contentType) }),
          pagination: args.PaginationArg(builder),
          sort: args.SortArg(builder),
        };

        if (hasDraftAndPublish(contentType)) {
          Object.assign(params, { publicationState: args.PublicationStateArg(builder) });
        }

        return params;
      }

      // Single Types
      if (kind === 'singleType') {
        const params = {};

        if (hasDraftAndPublish(contentType)) {
          Object.assign(params, { publicationState: args.PublicationStateArg(builder) });
        }

        return params;
      }
    },

    /**
     * Filter an object entries and keep only those whose value is a unique scalar attribute
     */
    getUniqueScalarAttributes(attributes: any) {
      const { isStrapiScalar } = getService('utils').attributes;

      const uniqueAttributes = entries(attributes).filter(
        ([, attribute]) => isStrapiScalar(attribute) && attribute.unique
      );

      return Object.fromEntries(uniqueAttributes);
    },

    /**
     * Map each value from an attribute to a FiltersInput type name
     */
    scalarAttributesToFiltersMap: mapValues((attribute) => {
      const { mappers, naming } = getService('utils');

      const gqlScalar = mappers.strapiScalarToGraphQLScalar(attribute.type);

      return naming.getScalarFilterInputTypeName(gqlScalar);
    }),

    /**
     * Apply basic transform to GQL args
     */
    transformArgs(
      args: any = {},
      {
        contentType,
        usePagination = false,
      }: { contentType?: ContentType; usePagination?: boolean } = {}
    ) {
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
