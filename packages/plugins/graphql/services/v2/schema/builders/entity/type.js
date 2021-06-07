'use strict';

const { upperFirst } = require('lodash/fp');
const { objectType } = require('nexus');

const { mappers, utils: typeUtils } = require('../../../types');
const { toSingular } = require('../../../../naming');
// const { buildAssociationResolver } = require('../resolvers');
const { buildAssocResolvers } = require('../../../../shadow-crud');

const buildType = contentType => {
  const { modelName, attributes } = contentType;
  const name = upperFirst(toSingular(modelName));

  return {
    [name]: objectType({
      name,
      definition(t) {
        Object.entries(attributes).forEach(([attrName, attr]) =>
          buildAttribute(t, attrName, attr, contentType)
        );
      },
    }),
  };
};

/**
 * Map & add an attribute to the object type using the given builder
 * @param {ObjectDefinitionBlock} builder Definition builder
 * @param {string} attributeName The name of the attribute
 * @param {object} attribute The components of the attributes
 * @param {object} contentType The content type
 */
const buildAttribute = (builder, attributeName, attribute, contentType) => {
  const { type, required = false } = attribute;

  if (attribute.private === true) {
    return;
  }

  if (required) {
    builder = builder.nonNull;
  }

  if (typeUtils.isScalar(attribute)) {
    builder.field(attributeName, { type: mappers.strapiTypeToGraphQLScalar[type] });
  }

  if (typeUtils.isEnumeration(attribute)) {
    builder.field(attributeName, { type: typeUtils.getEnumName(contentType, attributeName) });
  }

  if (typeUtils.isRelation(attribute)) {
    const relationType = contentType.associations.find(assoc => assoc.alias === attributeName)
      .nature;

    const type = upperFirst(attribute.model);

    // todo: use util to know when the relation is an array
    if (relationType.endsWith('Many')) {
      builder = builder.list;
    }

    builder.field(attributeName, {
      type,
      resolve: buildAssocResolvers(contentType)[attributeName],
      // resolve: buildAssociationResolver(contentType.uid, attributeName),
    });

    // same kind of logic for loading components & dz
    // if (isComponent()) {
    //   ...
    // }
    //
    // if (isDZ()) {
    //   ...
    // }
  }
};

module.exports = { buildType };
