'use strict';

const _ = require('lodash');
const {
  Kind,
  GraphQLScalarType,
  valueFromASTUntyped,
  GraphQLError,
} = require('graphql');

module.exports = function DynamicZoneScalar({
  name,
  attribute,
  globalId,
  components,
}) {
  const parseData = value => {
    const compo = Object.values(strapi.components).find(
      compo => compo.globalId === value.__typename
    );

    if (!compo) {
      throw new GraphQLError(
        `Component not found. expected one of: ${components
          .map(uid => strapi.components[uid].globalId)
          .join(', ')}`
      );
    }

    const finalValue = {
      __component: compo.uid,
      ..._.omit(value, ['__typename']),
    };

    return finalValue;
  };

  return new GraphQLScalarType({
    name: name,
    description: `Input type for dynamic zone ${attribute} of ${globalId}`,
    serialize: value => value,
    parseValue: value => parseData(value),
    parseLiteral: (ast, variables) => {
      if (ast.kind !== Kind.OBJECT) return undefined;

      const value = valueFromASTUntyped(ast, variables);
      return parseData(value);
    },
  });
};
