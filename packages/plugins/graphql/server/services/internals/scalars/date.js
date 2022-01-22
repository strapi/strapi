'use strict';

const { GraphQLDate } = require('graphql-iso-date/dist');

const { parseLiteral: originalParseLiteral, parseValue } = GraphQLDate;

GraphQLDate.parseLiteral = ast =>
  ast.value === 'now()'
    ? parseValue(new Date().toISOString().substring(0, 10))
    : originalParseLiteral(ast.value);

module.exports = GraphQLDate;
