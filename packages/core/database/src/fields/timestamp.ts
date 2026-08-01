import type * as dateFnsType from 'date-fns';

import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

// Lazy: defer date-fns until a value is actually read from the DB.
let lazyDateFns: typeof dateFnsType | undefined;
const dateFns = (): typeof dateFnsType => {
  if (!lazyDateFns) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyDateFns = require('date-fns');
  }
  return lazyDateFns as typeof dateFnsType;
};

export default class TimestampField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    const cast = new Date(value as any);
    return dateFns().isValid(cast) ? dateFns().format(cast, 'T') : null;
  }
}
