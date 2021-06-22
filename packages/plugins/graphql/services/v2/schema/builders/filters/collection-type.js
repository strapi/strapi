'use strict';

const { inputObjectType } = require('nexus');

const { utils, mappers } = require('../../../types');
const operators = require('./operators');

const rootLevelOperators = [operators.AND, operators.OR, operators.NOT];

const buildFindOneCollectionTypeFilters = contentType => {
  const { attributes } = contentType;

  // only keep unique scalars attributes
  const validAttributes = Object.keys(attributes).filter(attributeName => {
    const attribute = attributes[attributeName];
    return utils.isScalar(attribute) && attribute.unique;
  });

  return {
    id: 'ID',

    ...validAttributes.reduce((acc, attributeName) => {
      const attribute = attributes[attributeName];
      const gqlType = mappers.strapiTypeToGraphQLScalar[attribute.type];

      return { ...acc, [attributeName]: gqlType };
    }, {}),
  };
};

const buildContentTypeFilters = contentType => {
  const { attributes } = contentType;

  const filtersTypeName = utils.getFiltersInputTypeName(contentType);

  return inputObjectType({
    name: filtersTypeName,

    definition(t) {
      // adding attributes
      for (const [attributeName, attribute] of Object.entries(attributes)) {
        // scalar attribute
        if (utils.isScalar(attribute)) {
          addScalarAttribute(t, attributeName, attribute);
        }

        // relational attribute
        else if (utils.isRelation(attribute)) {
          addRelationalAttribute(t, attributeName, attribute);
        }
      }

      // adding conditional clauses
      for (const operator of rootLevelOperators) {
        operator.add(t, filtersTypeName);
      }
    },
  });
};

const addScalarAttribute = (builder, attributeName, attribute) => {
  const gqlType = mappers.strapiTypeToGraphQLScalar[attribute.type];

  builder.field(attributeName, { type: utils.getScalarFilterInputTypeName(gqlType) });
};

const addRelationalAttribute = (builder, attributeName, attribute) => {
  const model = strapi.getModel(attribute.model, attribute.plugin);

  builder.field(attributeName, { type: utils.getFiltersInputTypeName(model) });
};

module.exports = {
  buildFindOneCollectionTypeFilters,
  buildContentTypeFilters,
};
