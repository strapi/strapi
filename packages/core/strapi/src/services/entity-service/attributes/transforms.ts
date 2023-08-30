import { getOr, toNumber, isString, isBuffer } from 'lodash/fp';
import bcrypt from 'bcryptjs';

import type { Attribute } from '../../../types';

type Transforms = {
  [key in Attribute.Kind]?: (
    value: Attribute.GetValue<Attribute.Attribute<key>>,
    context: { attribute: Attribute.Attribute<key>; attributeName: string }
  ) => unknown;
};

const transforms: Transforms = {
  password(value, context) {
    const { attribute } = context;

    if (!isString(value) && !isBuffer(value)) {
      return value;
    }

    const rounds = toNumber(getOr(10, 'encryption.rounds', attribute));

    return bcrypt.hashSync(value, rounds);
  },
} as const;

export default transforms;
