import { parseDate } from './shared/parsers';
import Field from './field';

export default class DateField extends Field {
  toDB(value: unknown) {
    return parseDate(value);
  }

  fromDB(value: unknown) {
    return value;
  }
}
