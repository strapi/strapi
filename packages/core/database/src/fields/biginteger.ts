import { toString } from 'lodash/fp';
import NumberField from './number';

export default class BigIntegerField extends NumberField {
  toDB(value: unknown) {
    return toString(value);
  }

  fromDB(value: unknown) {
    return toString(value);
  }
}
