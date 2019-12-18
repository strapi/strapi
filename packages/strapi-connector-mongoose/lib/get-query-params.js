'use strict';

const _ = require('lodash');

module.exports = (value, type, key) => {
  const result = {};

  switch (type) {
    case '=':
      result.key = `where.${key}`;
      result.value = value;
      break;
    case '_ne':
      result.key = `where.${key}.$ne`;
      result.value = value;
      break;
    case '_lt':
      result.key = `where.${key}.$lt`;
      result.value = value;
      break;
    case '_gt':
      result.key = `where.${key}.$gt`;
      result.value = value;
      break;
    case '_lte':
      result.key = `where.${key}.$lte`;
      result.value = value;
      break;
    case '_gte':
      result.key = `where.${key}.$gte`;
      result.value = value;
      break;
    case '_sort':
      result.key = 'sort';
      result.value = _.toLower(value) === 'desc' ? '-' : '';
      result.value += key;
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
      result.key = `where.${key}`;
      result.value = {
        $regex: value,
        $options: 'i',
      };
      break;
    case '_containss':
      result.key = `where.${key}.$regex`;
      result.value = value;
      break;
    case '_in':
      result.key = `where.${key}.$in`;
      result.value = _.castArray(value);
      break;
    case '_nin':
      result.key = `where.${key}.$nin`;
      result.value = _.castArray(value);
      break;
    default:
      return undefined;
  }

  return result;
};
