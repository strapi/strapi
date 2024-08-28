import isValid from 'date-fns/isValid';
import format from 'date-fns/format';

import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

export default class TimestampField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    const cast = new Date(value as any);
    return isValid(cast) ? format(cast, 'T') : null;
  }
}
