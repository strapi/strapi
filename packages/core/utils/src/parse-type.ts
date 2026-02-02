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
  } catch (error) {
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
  } catch (error) {
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

const parseBoolean = (value: unknown, options: { forceCast?: boolean }): boolean => {
  const { forceCast = false } = options;

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    if (['true', 't', '1', 1].includes(value)) {
      return true;
    }

    if (['false', 'f', '0', 0].includes(value)) {
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

export default parseType;
