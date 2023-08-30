import { getOr, toNumber, isString, isBuffer } from 'lodash/fp';
import bcrypt from 'bcryptjs';

import type { Attribute } from '../../../types';

type Transforms = {
  [TKind in Attribute.Kind]?: (
    value: Attribute.GetValue<Attribute.Attribute<TKind>>,
    context: { attribute: Attribute.Attribute<TKind>; attributeName: string }
  ) => Attribute.GetValue<Attribute.Attribute<TKind>>;
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
};

export default transforms;
