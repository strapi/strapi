'use strict';

// TODO: migration
const _ = require('lodash');
const { rulesToQuery } = require('@casl/ability/extra');
const { VALID_REST_OPERATORS } = require('@strapi/utils');

const ops = {
  common: VALID_REST_OPERATORS.map(op => `$${op}`),
  boolean: ['$or', '$and'],
  cleanable: ['$elemMatch'],
};

const buildCaslQuery = (ability, action, model) => {
  const query = rulesToQuery(ability, action, model, o => o.conditions);
  return _.get(query, '$or[0]', {});
};

const buildStrapiQuery = caslQuery => {
  const transform = _.flow([removeCleanable]);
  const res = transform(caslQuery);
  return res;
};

const removeCleanable = condition => {
  if (_.isArray(condition)) {
    return _.map(condition, removeCleanable);
  }

  if (!_.isObject(condition)) {
    return condition;
  }

  return _.reduce(
    condition,
    (newCondition, value, key) => {
      if (ops.cleanable.includes(key)) {
        newCondition.$and = [removeCleanable(value)];
      } else {
        newCondition[key] = removeCleanable(value);
      }

      return newCondition;
    },
    {}
  );
};

module.exports = {
  buildCaslQuery,
  buildStrapiQuery,
};
