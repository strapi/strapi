'use strict';

const { entries, mapValues, omit } = require('lodash/fp');
const {
  pagination: { withDefaultPagination },
  contentTypes: { hasDraftAndPublish },
} = require('@strapi/utils');

const {
  args,
  mappers: { strapiScalarToGraphQLScalar, graphQLFiltersToStrapiQuery },
  utils: { isStrapiScalar, getScalarFilterInputTypeName, getFiltersInputTypeName },
} = require('../types');

/**
 * Filter an object entries and keep only those whose value is a unique scalar attribute
 * @param {object} attributes
 * @return {Object<string, object>}
 */
const getUniqueScalarAttributes = attributes => {
  const uniqueAttributes = entries(attributes).filter(
    ([, attribute]) => isStrapiScalar(attribute) && attribute.unique
  );

  return Object.fromEntries(uniqueAttributes);
};

/**
 * Map each value from an attribute to a FiltersInput type name
 * @param {object} attributes - The attributes object to transform
 * @return {Object<string, string>}
 */
const scalarAttributesToFiltersMap = mapValues(attribute => {
  const gqlScalar = strapiScalarToGraphQLScalar(attribute.type);

  return getScalarFilterInputTypeName(gqlScalar);
});

/**
 * Apply basic transform to GQL args
 */
const transformArgs = (args, { contentType, usePagination = false } = {}) => {
  const { pagination = {}, filters = {} } = args;

  // Init
  const newArgs = omit(['pagination', 'filters'], args);

  // Pagination
  if (usePagination) {
    Object.assign(
      newArgs,
      withDefaultPagination(pagination /*, config.get(graphql.pagination.defaults)*/)
    );
  }

  // Filters
  if (args.filters) {
    Object.assign(newArgs, { filters: graphQLFiltersToStrapiQuery(filters, contentType) });
  }

  return newArgs;
};

/**
 * Get every args for a given content type
 * @param {object} contentType
 * @param {object} options
 * @param {boolean} options.multiple
 * @return {object}
 */
const getContentTypeArgs = (contentType, { multiple = true } = {}) => {
  const { kind, modelType } = contentType;

  // Components
  if (modelType === 'component') {
    return {
      sort: args.SortArg,
      pagination: args.PaginationArg,
      filters: getFiltersInputTypeName(contentType),
    };
  }

  // Collection Types
  else if (kind === 'collectionType') {
    // hasDraftAndPublish

    if (!multiple) {
      return { id: 'ID' };
    }

    const params = {
      pagination: args.PaginationArg,
      sort: args.SortArg,
      filters: getFiltersInputTypeName(contentType),
    };

    if (hasDraftAndPublish(contentType)) {
      Object.assign(params, { publicationState: args.PublicationStateArg });
    }

    return params;
  }

  // Single Types
  else if (kind === 'singleType') {
    return {
      id: 'ID',
    };
  }
};

module.exports = {
  getContentTypeArgs,
  getUniqueScalarAttributes,
  scalarAttributesToFiltersMap,
  transformArgs,
};
