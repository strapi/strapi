'use strict';

const _ = require('lodash');
const dates = require('date-fns');

const timeRegex = new RegExp(
  '^(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]{1,3})?$'
);

const parseTime = value => {
  const result = value.match(timeRegex);

  if (result === null) {
    throw new Error('Invalid time format, expected HH:mm:ss.SSS');
  }

  const [, hours, minutes, seconds, fraction = '.000'] = result;
  const fractionPart = _.padEnd(fraction.slice(1), 3, '0');

  return `${hours}:${minutes}:${seconds}.${fractionPart}`;
};

const parseDate = value => {
  try {
    let date = dates.parseISO(value);
    if (dates.isValid(date)) return dates.format(date, 'yyyy-MM-dd');

    throw new Error(`Invalid format, expected an ISO compatble date`);
  } catch (error) {
    throw new Error(`Invalid format, expected an ISO compatble date`);
  }
};

const parseDateTimeOrTimestamp = value => {
  const date = dates.parseISO(value);
  if (dates.isValid(date)) return date;

  dates.setTime(date, value);

  if (!dates.isValid(date)) {
    throw new Error(`Invalid format, expected a timestamp or an ISO date`);
  }

  return date;
};

/**
 * Cast basic values based on attribute type
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 */
const parseType = ({ type, value }) => {
  switch (type) {
    case 'boolean': {
      if (['true', 't', '1', 1, true].includes(value)) {
        return true;
      }

      if (['false', 'f', '0', 0].includes(value)) {
        return false;
      }

      return Boolean(value);
    }
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal': {
      return _.toNumber(value);
    }
    case 'time': {
      return parseTime(value);
    }
    case 'date': {
      return parseDate(value);
    }
    case 'timestamp':
    case 'datetime': {
      return parseDateTimeOrTimestamp(value);
    }
    default:
      return value;
  }
};

module.exports = parseType;
