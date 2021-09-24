'use strict';

// TODO: migration
const _ = require('lodash');
const { rulesToQuery } = require('@casl/ability/extra');

const operatorsMap = {
  $in: '$in',
  $nin: '$notIn',
  $exists: '$notNull',
  $gte: '$gte',
  $gt: '$gt',
  $lte: '$lte',
  $lt: '$lt',
  $eq: '$eq',
  $ne: '$ne',
  $and: '$and',
  $or: '$or',
  $not: '$not',
};

const mapKey = key => {
  if (_.isString(key) && key.startsWith('$') && key in operatorsMap) {
    return operatorsMap[key];
  }
  return key;
};

const buildCaslQuery = (ability, action, model) => {
  const query = rulesToQuery(ability, action, model, o => o.conditions);
  return _.get(query, '$or[0]', {});
};

const buildStrapiQuery = caslQuery => {
  const transform = _.flow([unwrapDeep]);
  const res = transform(caslQuery);
  return res;
};

const unwrapDeep = obj => {
  if (!_.isPlainObject(obj) && !_.isArray(obj)) {
    return obj;
  }
  if (_.isArray(obj)) {
    return obj.map(v => unwrapDeep(v));
  }

  return _.reduce(
    obj,
    (acc, v, k) => {
      const key = mapKey(k);

      if (_.isPlainObject(v)) {
        if ('$elemMatch' in v) {
          v = v.$elemMatch; // removing this key
        }
        _.setWith(acc, key, unwrapDeep(v));
      } else if (_.isArray(v)) {
        _.setWith(
          acc,
          key,
          v.map(v => unwrapDeep(v))
        );
      } else {
        _.setWith(acc, key, v);
      }

      return acc;
    },
    {}
  );
};

module.exports = {
  buildCaslQuery,
  buildStrapiQuery,
};
