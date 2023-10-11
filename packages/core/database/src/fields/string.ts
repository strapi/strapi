import { toString } from 'lodash/fp';
import Field from './field';

export default class StringField extends Field {
  toDB(value: unknown) {
    return toString(value);
  }

  fromDB(value: unknown) {
    return toString(value);
  }
}
