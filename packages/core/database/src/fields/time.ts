import { parseTime } from './shared/parsers';
import Field from './field';

export default class TimeField extends Field {
  toDB(value: unknown) {
    return parseTime(value);
  }

  fromDB(value: unknown) {
    // make sure that's a string with valid format ?
    return value;
  }
}
