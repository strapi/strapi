'use strict';

const { isString, padCharsEnd } = require('lodash/fp');
const dateFns = require('date-fns');

const { InvalidDateTimeError, InvalidDateError, InvalidTimeError } = require('../../errors');

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const PARTIAL_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])/g;
const TIME_REGEX = /^(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]{1,3})?$/;

const parseDateTimeOrTimestamp = (value) => {
  if (dateFns.isDate(value)) return value;
  try {
    const date = dateFns.parseISO(value);
    if (dateFns.isValid(date)) return date;

    const milliUnixDate = dateFns.parse(value, 'T', new Date());
    if (dateFns.isValid(milliUnixDate)) return milliUnixDate;

    throw new InvalidDateTimeError(`Invalid format, expected a timestamp or an ISO date`);
  } catch (error) {
    throw new InvalidDateTimeError(`Invalid format, expected a timestamp or an ISO date`);
  }
};

const parseDate = (value) => {
  if (dateFns.isDate(value)) return dateFns.format(value, 'yyyy-MM-dd');

  const found = isString(value) ? value.match(PARTIAL_DATE_REGEX) || [] : [];
  const extractedValue = found[0];

  if (extractedValue && !DATE_REGEX.test(value)) {
    // TODO V5: throw an error when format yyyy-MM-dd is not respected
    // throw new InvalidDateError(`Invalid format, expected yyyy-MM-dd`);
    process.emitWarning(
      `[deprecated] Using a date format other than YYYY-MM-DD will be removed in future versions. Date received: ${value}. Date stored: ${extractedValue}.`
    );
  }

  const date = dateFns.parseISO(extractedValue);
  if (!dateFns.isValid(date)) {
    throw new InvalidDateError(`Invalid date`);
  }

  return extractedValue;
};

const parseTime = (value) => {
  if (dateFns.isDate(value)) return dateFns.format(value, 'HH:mm:ss.SSS');

  if (typeof value !== 'string') {
    throw new InvalidTimeError(`Expected a string, got a ${typeof value}`);
  }
  const result = value.match(TIME_REGEX);

  if (result === null) {
    throw new InvalidTimeError('Invalid time format, expected HH:mm:ss.SSS');
  }

  const [, hours, minutes, seconds, fraction = '.000'] = result;
  const fractionPart = padCharsEnd('0', 3, fraction.slice(1));

  return `${hours}:${minutes}:${seconds}.${fractionPart}`;
};

module.exports = {
  parseDateTimeOrTimestamp,
  parseDate,
  parseTime,
};
