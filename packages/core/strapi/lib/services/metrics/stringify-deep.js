'use strict';

const { map, mapValues, isObject, toString } = require('lodash/fp');

/**
 * Stringify all non object valutes before send them
 * @param {object} obj
 * @returns {object}
 */
const stringifyDeep = value => {
  if (Array.isArray(value)) {
    return map(stringifyDeep, value);
  }

  if (isObject(value)) {
    return mapValues(stringifyDeep, value);
  }

  return toString(value);
};

module.exports = stringifyDeep;
