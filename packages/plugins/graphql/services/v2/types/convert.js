'use strict';

const { set } = require('lodash/fp');

const operators = require('../schema/builders/filters/operators');
const { isRelation, isScalar } = require('./utils');

const rootLevelOperators = [operators.AND, operators.OR, operators.NOT];

// todo[v4]: Find a way to get that dynamically
const virtualScalarAttributes = ['id'];

const convertGraphQLFiltersToStrapiQuery = (filters, contentType) => {
  const { attributes } = contentType;

  const isAttribute = key => virtualScalarAttributes.includes(key) || attributes[key] !== undefined;

  const convert = ops => {
    return Object.entries(ops).reduce(
      (acc, [operator, value]) => ({
        ...acc,
        [operators[operator].strapiOperator]: value,
      }),
      {}
    );
  };

  for (const [key, value] of Object.entries(filters)) {
    if (isAttribute(key)) {
      const attribute = attributes[key];

      // Scalar filters
      if (virtualScalarAttributes.includes(key) || isScalar(attribute)) {
        Object.assign(filters, set(key, convert(value), filters));
      }

      // Handle deep filters
      else if (isRelation(attribute)) {
        const ct = strapi.getModel(attribute.model, attribute.plugin);
        const newValue = convertGraphQLFiltersToStrapiQuery(value, ct);
        Object.assign(filters, set(key, newValue, filters));
      }
    } else {
      const operator = rootLevelOperators.find(op => {
        return op.fieldName === key;
      });

      if (operator) {
        delete filters[key];
        const newValue = Array.isArray(value)
          ? value.map(f => convertGraphQLFiltersToStrapiQuery(f, contentType))
          : convertGraphQLFiltersToStrapiQuery(value, contentType);
        filters[operator.strapiOperator] = newValue;
      }
    }
  }

  return filters;
};

module.exports = {
  convertGraphQLFiltersToStrapiQuery,
};
