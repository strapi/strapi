import { toNumber } from 'lodash/fp';
import Field from './field';

export default class NumberField extends Field {
  toDB(value: unknown) {
    const numberValue = toNumber(value);

    if (Number.isNaN(numberValue)) {
      throw new Error(`Expected a valid Number, got ${value}`);
    }

    return numberValue;
  }

  fromDB(value: unknown) {
    return toNumber(value);
  }
}
