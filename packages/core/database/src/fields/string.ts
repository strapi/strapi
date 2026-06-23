import fp from 'lodash/fp.js';
import Field from './field';

const { toString } = fp;

export default class StringField extends Field {
  toDB(value: unknown) {
    return toString(value);
  }

  fromDB(value: unknown) {
    return toString(value);
  }
}
