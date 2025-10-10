import { toString } from 'lodash/fp';
import Field from './field';

function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

export default class BooleanField extends Field {
  toDB(value: unknown) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (isStringOrNumber(value) && ['true', 't', '1', 1].includes(value)) {
      return true;
    }

    if (isStringOrNumber(value) && ['false', 'f', '0', 0].includes(value)) {
      return false;
    }

    return Boolean(value);
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
