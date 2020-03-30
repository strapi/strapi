'use strict';

const _ = require('lodash');

/**
 * Merges
 */
const mergeSchemas = (root, ...subs) => {
  subs.forEach(sub => {
    if (_.isEmpty(sub)) return;
    const { definition = '', query = {}, mutation = {}, resolvers = {} } = sub;

    root.definition += '\n' + definition;
    _.merge(root, {
      query,
      mutation,
      resolvers,
    });
  });

  return root;
};

const createDefaultSchema = () => ({
  definition: '',
  query: {},
  mutation: {},
  resolvers: {},
});

const diffResolvers = (object, base) => {
  let newObj = {};

  Object.keys(object).forEach(type => {
    Object.keys(object[type]).forEach(resolver => {
      if (type === 'Query' || type === 'Mutation') {
        if (!_.has(base, [type, resolver])) {
          _.set(newObj, [type, resolver], _.get(object, [type, resolver]));
        }
      } else {
        _.set(newObj, [type, resolver], _.get(object, [type, resolver]));
      }
    });
  });

  return newObj;
};

const convertToParams = params => {
  return Object.keys(params).reduce((acc, current) => {
    const key = current === 'id' ? 'id' : `_${current}`;
    acc[key] = params[current];
    return acc;
  }, {});
};

const convertToQuery = params => {
  const result = {};

  _.forEach(params, (value, key) => {
    if (_.isPlainObject(value)) {
      const flatObject = convertToQuery(value);
      _.forEach(flatObject, (_value, _key) => {
        result[`${key}.${_key}`] = _value;
      });
    } else {
      result[key] = value;
    }
  });

  return result;
};

const amountLimiting = (params = {}) => {
  const { amountLimit } = strapi.plugins.graphql.config;

  if (!amountLimit) return params;

  if (!params.limit || params.limit === -1 || params.limit > amountLimit) {
    params.limit = amountLimit;
  } else if (params.limit < 0) {
    params.limit = 0;
  }

  return params;
};

const noRequired = type => type.replace('!', '');

module.exports = {
  diffResolvers,
  mergeSchemas,
  createDefaultSchema,
  convertToParams,
  convertToQuery,
  amountLimiting,
  noRequired,
};
