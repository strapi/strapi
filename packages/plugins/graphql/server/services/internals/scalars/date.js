'use strict';

const { GraphQLDate } = require('graphql-scalars');

const parseAndCast =
  (parseFn) =>
  (...args) => {
    const parsedValue = parseFn(...args);

    if (parsedValue instanceof Date) {
      return parsedValue.toISOString().split('T')[0];
    }

    return parsedValue;
  };

// GraphQLDate casts the date string to new Date, we want to keep it as a string so we cast it back to a string
// see https://github.com/excitement-engineer/graphql-iso-date/issues/106
GraphQLDate.parseValue = parseAndCast(GraphQLDate.parseValue);
GraphQLDate.parseLiteral = parseAndCast(GraphQLDate.parseLiteral);

module.exports = GraphQLDate;
