'use strict';
const _ = require('lodash');

module.exports = (value, type, key) => {
  const result = {};

  switch (type) {
    case '=':
      result.key = `where.${key}`;
      result.value = {
        symbol: '=',
        value,
      };
      break;
    case '_ne':
      result.key = `where.${key}`;
      result.value = {
        symbol: '!=',
        value,
      };
      break;
    case '_lt':
      result.key = `where.${key}`;
      result.value = {
        symbol: '<',
        value,
      };
      break;
    case '_gt':
      result.key = `where.${key}`;
      result.value = {
        symbol: '>',
        value,
      };
      break;
    case '_lte':
      result.key = `where.${key}`;
      result.value = {
        symbol: '<=',
        value,
      };
      break;
    case '_gte':
      result.key = `where.${key}`;
      result.value = {
        symbol: '>=',
        value,
      };
      break;
    case '_sort':
      result.key = 'sort';
      result.value = {
        key,
        order: value.toUpperCase(),
      };
      break;
    case '_start':
      result.key = 'start';
      result.value = parseFloat(value);
      break;
    case '_limit':
      result.key = 'limit';
      result.value = parseFloat(value);
      break;
    case '_populate':
      result.key = 'populate';
      result.value = value;
      break;
    case '_contains':
    case '_containss':
      result.key = `where.${key}`;
      result.value = {
        symbol: 'like',
        value: `%${value}%`,
      };
      break;
    case '_in':
      result.key = `where.${key}`;
      result.value = {
        symbol: 'IN',
        value: _.castArray(value),
      };
      break;
    case '_nin':
      result.key = `where.${key}`;
      result.value = {
        symbol: 'NOT IN',
        value: _.castArray(value),
      };
      break;
    default:
      return undefined;
  }

  return result;
};
