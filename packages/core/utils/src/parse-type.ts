import * as _ from 'lodash';
import * as dates from 'date-fns';

const timeRegex = /^(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]{1,3})?$/;

const isDate = (v: unknown): v is Date => {
  return dates.isDate(v);
};

const parseTime = (value: unknown): string => {
  if (isDate(value)) {
    return dates.format(value, 'HH:mm:ss.SSS');
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected a string, got a ${typeof value}`);
  }
  const result = value.match(timeRegex);

  if (result === null) {
    throw new Error('Invalid time format, expected HH:mm:ss.SSS');
  }

  const [, hours, minutes, seconds, fraction = '.000'] = result;
  const fractionPart = _.padEnd(fraction.slice(1), 3, '0');

  return `${hours}:${minutes}:${seconds}.${fractionPart}`;
};

const parseDate = (value: unknown) => {
  if (isDate(value)) {
    return dates.format(value, 'yyyy-MM-dd');
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected a string, got a ${typeof value}`);
  }

  try {
    const date = dates.parseISO(value);

    if (dates.isValid(date)) return dates.format(date, 'yyyy-MM-dd');

    throw new Error(`Invalid format, expected an ISO compatible date`);
  } catch {
    throw new Error(`Invalid format, expected an ISO compatible date`);
  }
};

const parseDateTimeOrTimestamp = (value: unknown) => {
  if (isDate(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected a string, got a ${typeof value}`);
  }

  try {
    const date = dates.parseISO(value);
    if (dates.isValid(date)) return date;

    const milliUnixDate = dates.parse(value, 'T', new Date());
    if (dates.isValid(milliUnixDate)) return milliUnixDate;

    throw new Error(`Invalid format, expected a timestamp or an ISO date`);
  } catch {
    throw new Error(`Invalid format, expected a timestamp or an ISO date`);
  }
};

type TypeMap = {
  boolean: boolean;
  integer: number;
  biginteger: number;
  float: number;
  decimal: number;
  time: string;
  date: string;
  timestamp: Date;
  datetime: Date;
};

export interface ParseTypeOptions<T extends keyof TypeMap> {
  type: T;
  value: unknown;
  forceCast?: boolean;
}

/**
 * Hoisted out of `parseBoolean`, which allocated both of these arrays on every call.
 * Query validation calls it once per node of the populate tree of every request, which
 * made those two throwaway allocations one of the largest single sources of GC pressure
 * in a read: 4.3% of on-CPU time in a profiled LaunchPad run.
 */
const TRUTHY_INPUTS: ReadonlyArray<string | number> = ['true', 't', '1', 1];
const FALSY_INPUTS: ReadonlyArray<string | number> = ['false', 'f', '0', 0];

/**
 * Whether `parseBoolean` would accept this value without `forceCast`.
 *
 * Exists so callers can ask the question without using an exception as control flow.
 * Query validation asked it once per populate key by calling `parseType` inside a
 * `try`/`catch`, so every key that is not a boolean keyword — which is nearly all of
 * them — built an Error and captured a stack trace only to discard it. Stack capture is
 * the expensive part, and it made this the second hottest function in a read.
 *
 * Kept in lockstep with `parseBoolean`'s accept conditions below.
 */
const isBooleanLike = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return TRUTHY_INPUTS.includes(value) || FALSY_INPUTS.includes(value);
  }

  return false;
};

const parseBoolean = (value: unknown, options: { forceCast?: boolean }): boolean => {
  const { forceCast = false } = options;

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    if (TRUTHY_INPUTS.includes(value)) {
      return true;
    }

    if (FALSY_INPUTS.includes(value)) {
      return false;
    }
  }

  if (forceCast) {
    return Boolean(value);
  }

  throw new Error('Invalid boolean input. Expected "t","1","true","false","0","f"');
};

/**
 * Cast basic values based on attribute type
 */
const parseType = <Type extends keyof TypeMap>(options: ParseTypeOptions<Type>): TypeMap[Type] => {
  const { type, value, forceCast } = options;

  switch (type) {
    case 'boolean':
      return parseBoolean(value, { forceCast }) as TypeMap[Type];
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal': {
      return _.toNumber(value) as TypeMap[Type];
    }
    case 'time': {
      return parseTime(value) as TypeMap[Type];
    }
    case 'date': {
      return parseDate(value) as TypeMap[Type];
    }
    case 'timestamp':
    case 'datetime': {
      return parseDateTimeOrTimestamp(value) as TypeMap[Type];
    }
    default:
      return value as TypeMap[Type];
  }
};

export { isBooleanLike };
export default parseType;
