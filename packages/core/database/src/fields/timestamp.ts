import * as dateFns from 'date-fns';

import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

export default class TimestampField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    const cast = new Date(value as any);
    return dateFns.isValid(cast) ? dateFns.format(cast, 'T') : null;
  }
}
