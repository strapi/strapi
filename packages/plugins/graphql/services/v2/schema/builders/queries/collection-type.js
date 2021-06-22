'use strict';

const { extendType } = require('nexus');
const { set } = require('lodash/fp');

const { buildQuery } = require('../../../../resolvers-builder');
const { toSingular, toPlural } = require('../../../../naming');
const { actionExists } = require('../../../../utils');
const { utils, mappers } = require('../../../types');
const { convertGraphQLFiltersToStrapiQuery } = require('../../../types/convert');

const { SortArg, PublicationStateArg } = require('../args');

const getFindOneQueryName = contentType => toSingular(utils.getEntityName(contentType));

const getFindQueryName = contentType => toPlural(utils.getEntityName(contentType));

const buildCollectionTypeQueries = contentType => {
  return extendType({
    type: 'Query',

    definition(t) {
      addFindOneQuery(t, contentType);
      addFindQuery(t, contentType);
    },
  });
};

/**
 *
 * @param {OutputDefinitionBlock<Query>} t
 * @param contentType
 */
const addFindOneQuery = (t, contentType) => {
  const { uid, modelName, attributes } = contentType;

  const findOneQueryName = getFindOneQueryName(contentType);
  const responseTypeName = utils.getEntityResponseName(contentType);

  const resolverOptions = { resolver: `${uid}.findOne` };

  // If the action doesn't exist, return early and don't add the query
  if (!actionExists(resolverOptions)) {
    return;
  }

  const uniqueAttributes = Object.entries(attributes)
    // Only keep scalar attributes
    .filter(([, attribute]) => utils.isScalar(attribute) && attribute.unique)
    // Create a map with the name of the attribute & its filters type
    .reduce((acc, [name, attribute]) => {
      const gqlType = mappers.strapiTypeToGraphQLScalar[attribute.type];
      const filtersType = utils.getScalarFilterInputTypeName(gqlType);

      return set(name, filtersType, acc);
    }, {});

  const resolver = buildQuery(toSingular(modelName), resolverOptions);

  t.field(findOneQueryName, {
    type: responseTypeName,

    args: {
      id: utils.getScalarFilterInputTypeName('ID'),

      ...uniqueAttributes,
    },

    async resolve(parent, args, context, info) {
      const query = convertGraphQLFiltersToStrapiQuery(args, contentType);

      const res = await resolver(parent, query, context, info);

      return { data: { id: res.id, attributes: res } };
    },
  });
};

/**
 *
 * @param {OutputDefinitionBlock<Query>} t
 * @param contentType
 */
const addFindQuery = (t, contentType) => {
  const { uid, modelName } = contentType;

  const findQueryName = getFindQueryName(contentType);
  const responseCollectionTypeName = utils.getEntityResponseCollectionName(contentType);

  const resolverOptions = { resolver: `${uid}.find` };

  // If the action doesn't exist, return early and don't add the query
  if (!actionExists(resolverOptions)) {
    return;
  }

  const resolver = buildQuery(toPlural(modelName), resolverOptions);

  t.field(findQueryName, {
    type: responseCollectionTypeName,

    args: {
      publicationState: PublicationStateArg,
      // todo[v4]: to add through i18n plugin
      locale: 'String',
      sort: SortArg,
      filters: utils.getFiltersInputTypeName(contentType),
    },

    async resolve(parent, args, context, info) {
      args.filters = convertGraphQLFiltersToStrapiQuery(args.filters, contentType);

      const res = await resolver(parent, args, context, info);

      return { data: res.map(r => ({ id: r.id, attributes: r })), meta: { pagination: {} } };
    },
  });
};

module.exports = { buildCollectionTypeQueries };
