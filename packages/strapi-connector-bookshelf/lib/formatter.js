'use strict';

const { isValid, format, formatISO } = require('date-fns');
const { has } = require('lodash');

const createFormatter = client => ({ type }, value) => {
  if (value === null) return null;

  const formatter = {
    ...defaultFormatter,
    ...formatters[client],
  };

  if (has(formatter, type)) {
    return formatter[type](value);
  }

  return value;
};

const defaultFormatter = {
  json: value => {
    if (typeof value === 'object') return value;
    return JSON.parse(value);
  },
  boolean: value => {
    if (typeof value === 'boolean') {
      return value;
    }

    const strVal = value.toString();
    if (strVal === '1') {
      return true;
    } else if (strVal === '0') {
      return false;
    } else {
      return null;
    }
  },
  date: value => {
    const cast = new Date(value);
    return isValid(cast) ? formatISO(cast, { representation: 'date' }) : null;
  },
  datetime: value => {
    const cast = new Date(value);
    return isValid(cast) ? cast.toISOString() : null;
  },
  timestamp: value => {
    const cast = new Date(value);
    return isValid(cast) ? format(cast, 'T') : null;
  },
};

const formatters = {
  sqlite3: {
    biginteger: value => {
      return value.toString();
    },
  },
};

module.exports = {
  createFormatter,
};
