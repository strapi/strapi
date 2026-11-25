import { parseDateTimeOrTimestamp } from './shared/parsers';
import Field from './field';

export default class DatetimeField extends Field {
  toDB(value: unknown) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value: unknown) {
    // Drivers already hand back a `Date` for timestamp columns, so the constructor was
    // re-parsing a value that had just been parsed — once per datetime column of every
    // row. For a `Date`, `dateFns.isValid` reduces to a NaN check on the timestamp, which
    // is what this does without the argument normalisation date-fns performs first.
    const cast = value instanceof Date ? value : new Date(value as any);
    return Number.isNaN(cast.getTime()) ? null : cast.toISOString();
  }
}
