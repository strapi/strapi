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
};

const createDefaultSchema = () => ({
  definition: '',
  query: '',
  mutation: '',
  resolvers: {},
});

const diffResolvers = (object, base) => {
  let newObj = {};

  Object.keys(object).forEach(type => {
    Object.keys(object[type]).forEach(resolver => {
      if (!_.has(base, [type, resolver])) {
        _.set(newObj, [type, resolver], _.get(object, [type, resolver]));
      }
    });
  });

  return newObj;
};

module.exports = {
  diffResolvers,
  mergeSchemas,
  createDefaultSchema,
};
