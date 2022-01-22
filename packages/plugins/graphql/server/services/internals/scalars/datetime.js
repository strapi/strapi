'use strict';

const { GraphQLDateTime } = require('graphql-iso-date/dist');

const { parseLiteral: originalParseLiteral, parseValue } = GraphQLDateTime;

GraphQLDateTime.parseLiteral = ast =>
  ast.value === 'now()' ? parseValue(new Date().toISOString()) : originalParseLiteral(ast.value);

module.exports = GraphQLDateTime;
