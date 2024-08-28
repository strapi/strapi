import isValid from 'date-fns/isValid';

import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

export default class DatetimeField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    const cast = new Date(value as any);
    return isValid(cast) ? cast.toISOString() : null;
  }
}
