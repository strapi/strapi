'use strict';

const { entries, mapValues, omit } = require('lodash/fp');
const {
  pagination: { withDefaultPagination },
} = require('@strapi/utils');

const {
  args,
  mappers: { strapiScalarToGraphQLScalar, graphQLFiltersToStrapiQuery },
  utils: { isScalar, getScalarFilterInputTypeName, getFiltersInputTypeName },
} = require('../../types');

/**
 * Filter an object entries and keep only those whose value is a unique scalar attribute
 * @param {object} attributes
 * @return {Object<string, object>}
 */
const getUniqueScalarAttributes = attributes => {
  const uniqueAttributes = entries(attributes).filter(
    ([, attribute]) => isScalar(attribute) && attribute.unique
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
// todo[v4]: unify & move elsewhere
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
    return multiple
      ? {
          publicationState: args.PublicationStateArg,
          // todo[v4]: to add through i18n plugin
          locale: 'String',
          sort: args.SortArg,
          pagination: args.PaginationArg,
          filters: getFiltersInputTypeName(contentType),
        }
      : { id: 'ID' };
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
