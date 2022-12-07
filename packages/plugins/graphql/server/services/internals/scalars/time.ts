import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql';
import { parseType } from '@strapi/utils';
import Utils from '@strapi/utils';

const { ValidationError } = Utils;

/**
 * A GraphQL scalar used to store Time (HH:mm:ss.SSS) values
 */
const TimeScalar = new GraphQLScalarType({
  name: 'Time',

  description: 'A time string with format HH:mm:ss.SSS',

  serialize(value) {
    return parseType({ type: 'time', value });
  },

  parseValue(value) {
    return parseType({ type: 'time', value });
  },

  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new ValidationError('Time cannot represent non string type');
    }

    const { value } = ast;

    return parseType({ type: 'time', value });
  },
});

export default TimeScalar;
