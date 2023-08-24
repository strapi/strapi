import { getOr, toNumber, isString, isBuffer } from 'lodash/fp';
import bcrypt from 'bcryptjs';
import { Attribute } from '../../../types';

interface Transforms {
  [key: string]: (value: any, context: { attribute: Attribute.Any; attributeName: string }) => any;
}

const transforms: Transforms = {
  password(value: string, context: { attribute: Attribute.Password; attributeName: string }) {
    const { attribute } = context;

    if (!isString(value) && !isBuffer(value)) {
      return value;
    }

    const rounds = toNumber(getOr(10, 'encryption.rounds', attribute));

    return bcrypt.hashSync(value, rounds);
  },
} as const;

export default transforms;
