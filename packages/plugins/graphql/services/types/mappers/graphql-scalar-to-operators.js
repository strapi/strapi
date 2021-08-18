'use strict';

const { get } = require('lodash/fp');

const {
  eq,
  gt,
  lt,
  not,
  contains,
  endsWith,
  startsWith,
} = require('../../schema/builders/filters/operators');

const associations = {
  // ID
  ID: [eq, not],
  // Booleans
  Boolean: [eq, not],
  // Strings
  String: [eq, not, contains, startsWith, endsWith],
  // Numbers
  Int: [eq, not, gt, lt],
  Long: [eq, not, gt, lt],
  Float: [eq, not, gt, lt],
  // Dates
  Date: [eq, not, gt, lt],
  Time: [eq, not, gt, lt],
  DateTime: [eq, not, gt, lt],
  // Others
  JSON: [eq, not],
};

const enabledScalars = Object.keys(associations).filter(key => associations[key].length > 0);

const graphqlScalarToOperators = graphqlScalar => get(graphqlScalar, associations);

graphqlScalarToOperators.enabledScalars = enabledScalars;

module.exports = { graphqlScalarToOperators };
