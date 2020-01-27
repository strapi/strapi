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

module.exports = {
  mergeSchemas,
};
