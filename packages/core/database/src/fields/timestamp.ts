import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

export default class TimestampField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    // Same redundant re-parse as `datetime`. `format(cast, 'T')` is the epoch in
    // milliseconds as a string, which `getTime()` already gives us.
    const cast = value instanceof Date ? value : new Date(value as any);
    const time = cast.getTime();
    return Number.isNaN(time) ? null : String(time);
  }
}
