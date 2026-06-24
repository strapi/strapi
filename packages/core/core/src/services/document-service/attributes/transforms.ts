import fp from 'lodash/fp.js';
import type { Schema } from '@strapi/types';
import bcrypt from 'bcryptjs';

const { getOr, toNumber, isString } = fp;

type Transforms = {
  [TKind in Schema.Attribute.Kind]?: (
    value: unknown,
    context: {
      attribute: Schema.Attribute.AnyAttribute;
      attributeName: string;
    }
  ) => any;
};

const transforms: Transforms = {
  password(value, context) {
    const { attribute } = context;

    if (attribute.type !== 'password') {
      throw new Error('Invalid attribute type');
    }

    if (!isString(value) && !(value instanceof Buffer)) {
      return value;
    }

    const rounds = toNumber(getOr(10, 'encryption.rounds', attribute));

    return bcrypt.hashSync(value.toString(), rounds);
  },
};

export default transforms;
