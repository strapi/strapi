'use strict';

const { inputObjectType } = require('nexus');

const {
  eq,
  gt,
  lt,
  contains,
  endsWith,
  startsWith,
} = require('../../schema/builders/filters/operators');
const { getScalarFilterInputTypeName } = require('../utils');

const operatorCollectionByGraphQLScalar = {
  // ID
  ID: [eq],
  // Booleans
  Boolean: [eq],
  // Strings
  String: [eq, contains, startsWith, endsWith],
  // Numbers
  Int: [eq, gt, lt],
  Long: [eq, gt, lt],
  Float: [eq, gt, lt],
  // Dates
  Date: [eq, gt, lt],
  Time: [eq, gt, lt],
  DateTime: [eq, gt, lt],
  // Others
  JSON: [eq],
};

const VALID_SCALARS = Object.keys(operatorCollectionByGraphQLScalar);

const scalarFilters = VALID_SCALARS.reduce((acc, type) => {
  const operators = operatorCollectionByGraphQLScalar[type];
  const inputTypeName = getScalarFilterInputTypeName(type);

  acc[inputTypeName] = inputObjectType({
    name: inputTypeName,

    definition(t) {
      operators.forEach(operator => operator.add(t, type));
    },
  });

  return acc;
}, {});

module.exports = {
  scalars: scalarFilters,
};
