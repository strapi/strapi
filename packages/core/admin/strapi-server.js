'use strict';

const _ = require('lodash');

const admin = require('./dist/server');

const mergeRoutes = (a, b, key) => {
  return _.isArray(a) && _.isArray(b) && key === 'routes' ? a.concat(b) : undefined;
};

if (strapi.EE) {
  const eeAdmin = require('./dist/ee/server');
  // module.exports = admin;
  module.exports = _.mergeWith({}, admin, eeAdmin, mergeRoutes);
} else {
  module.exports = admin;
}
