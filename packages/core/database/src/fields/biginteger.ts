import { toString } from 'lodash/fp';
import Field from './field';

const BIG_INTEGER_REGEX = /^[+-]?\d+$/;

const toBigIntegerString = (value: unknown): string => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`Expected a valid BigInteger, got ${value}`);
    }

    return value.toString();
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!BIG_INTEGER_REGEX.test(trimmedValue)) {
      throw new Error(`Expected a valid BigInteger, got ${value}`);
    }

    return BigInt(trimmedValue).toString();
  }

  throw new Error(`Expected a valid BigInteger, got ${value}`);
};

export default class BigIntegerField extends Field {
  toDB(value: unknown) {
    if (value === null || value === undefined) {
      return value;
    }

    return toBigIntegerString(value);
  }

  fromDB(value: unknown) {
    if (value === null || value === undefined) {
      return value;
    }

    try {
      return toBigIntegerString(value);
    } catch {
      // Preserve backward compatibility for legacy rows that may contain
      // malformed bigint values written by older versions/manual imports.
      return toString(value);
    }
  }
}
