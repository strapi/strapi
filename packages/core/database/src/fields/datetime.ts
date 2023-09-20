import * as dateFns from 'date-fns';

import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

export default class DatetimeField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    const cast = new Date(value as any);
    return dateFns.isValid(cast) ? cast.toISOString() : null;
  }
}
