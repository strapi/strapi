'use strict';

const { parseType } = require('strapi-utils');

const { Kind, GraphQLScalarType } = require('graphql');

const Time = new GraphQLScalarType({
  name: 'Time',
  description: 'A time string with format: HH:mm:ss.SSS',
  serialize(value) {
    return parseType({ type: 'time', value });
  },
  parseValue(value) {
    return parseType({ type: 'time', value });
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError(`Time cannot represent non string type`);
    }

    const value = ast.value;
    return parseType({ type: 'time', value });
  },
});

module.exports = Time;
