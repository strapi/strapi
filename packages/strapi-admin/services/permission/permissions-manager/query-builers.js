'use strict';

const _ = require('lodash');
const { rulesToQuery } = require('@casl/ability/extra');
const { VALID_REST_OPERATORS } = require('strapi-utils');

const ops = {
  common: VALID_REST_OPERATORS.map(op => `$${op}`),
  boolean: ['$or', '$and'],
  cleanable: ['$elemMatch'],
};

const buildCaslQuery = (ability, action, model) => {
  const query = rulesToQuery(ability, action, model, o => o.conditions);
  return _.get(query, '$or[0].$and', {});
};

const buildStrapiQuery = caslQuery => {
  const transform = _.flow([flattenDeep, cleanupUnwantedProperties]);
  return transform(caslQuery);
};

const flattenDeep = condition => {
  if (_.isArray(condition)) {
    return _.map(condition, flattenDeep);
  }

  if (!_.isObject(condition)) {
    return condition;
  }

  const shouldIgnore = e => !!ops.common.includes(e);
  const shouldPerformTransformation = (v, k) => _.isObject(v) && !_.isArray(v) && !shouldIgnore(k);

  const result = {};
  const set = (key, value) => (result[key] = value);

  const getTransformParams = (prevKey, v, k) =>
    shouldIgnore(k) ? [`${prevKey}_${k.replace('$', '')}`, v] : [`${prevKey}.${k}`, v];

  _.each(condition, (value, key) => {
    if (ops.boolean.includes(key)) {
      set(key.replace('$', '_'), _.map(value, flattenDeep));
    } else if (shouldPerformTransformation(value, key)) {
      _.each(flattenDeep(value), (v, k) => {
        set(...getTransformParams(key, v, k));
      });
    } else {
      set(key, flattenDeep(value));
    }
  });

  return result;
};

const cleanupUnwantedProperties = condition => {
  if (!_.isObject(condition)) {
    return condition;
  }

  if (_.isArray(condition)) {
    return condition.map(cleanupUnwantedProperties);
  }

  const shouldClean = e =>
    typeof e === 'string' ? ops.cleanable.find(o => e.includes(`.${o}`)) : undefined;

  return _.reduce(
    condition,
    (acc, value, key) => {
      const keyToClean = shouldClean(key);
      const newKey = keyToClean ? key.split(`.${keyToClean}`).join('') : key;

      return {
        ...acc,
        [newKey]: _.isArray(value) ? value.map(cleanupUnwantedProperties) : value,
      };
    },
    {}
  );
};

module.exports = {
  buildCaslQuery,
  buildStrapiQuery,
};
