import { toString } from 'lodash';
import Field from './field';
import { InvalidBooleanError } from '../errors';

function toRecognisedNumber(value: number): boolean | undefined {
  if (value === 1) {
    return true;
  }

  if (value === 0) {
    return false;
  }

  return undefined;
}

// Case-insensitive, so `'FALSE'` is read as false rather than `Boolean('FALSE')`.
function toRecognisedString(value: string): boolean | undefined {
  const lowerCased = value.toLowerCase();

  if (['true', 't', '1'].includes(lowerCased)) {
    return true;
  }

  if (['false', 'f', '0'].includes(lowerCased)) {
    return false;
  }

  return undefined;
}

/**
 * Casts the values both `toDB` and `toFilterValue` accept. Returns `undefined` for any other
 * value, so each caller decides how to handle it.
 */
function toRecognisedBoolean(value: unknown): boolean | null | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle null/undefined values explicitly
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return toRecognisedNumber(value);
  }

  if (typeof value === 'string') {
    return toRecognisedString(value);
  }

  return undefined;
}

export default class BooleanField extends Field {
  toDB(value: unknown) {
    const recognised = toRecognisedBoolean(value);

    if (recognised !== undefined) {
      return recognised;
    }

    // Lenient on writes, kept for backward compatibility of direct `db.query` callers.
    return Boolean(value);
  }

  /**
   * Strict on filters: the `Boolean(value)` fallback of `toDB` reads `'no'` as `true`, so
   * `filters[flag][$eq]=no` would silently match the true rows.
   */
  toFilterValue(value: unknown) {
    const recognised = toRecognisedBoolean(value);

    if (recognised === undefined) {
      throw new InvalidBooleanError();
    }

    return recognised;
  }

  fromDB(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }

    const strVal = toString(value);

    if (strVal === '1') {
      return true;
    }
    if (strVal === '0') {
      return false;
    }
    return null;
  }
}
