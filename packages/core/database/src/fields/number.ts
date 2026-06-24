import fp from 'lodash/fp.js';
import Field from './field';

const { toNumber } = fp;

export default class NumberField extends Field {
  toDB(value: unknown) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Expected a valid Number, got ${value}`);
      }

      return value;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();

      if (trimmedValue.length === 0) {
        throw new Error(`Expected a valid Number, got ${value}`);
      }

      const numberValue = Number(trimmedValue);

      if (!Number.isFinite(numberValue)) {
        throw new Error(`Expected a valid Number, got ${value}`);
      }

      return numberValue;
    }

    throw new Error(`Expected a valid Number, got ${value}`);
  }

  fromDB(value: unknown) {
    return toNumber(value);
  }
}
