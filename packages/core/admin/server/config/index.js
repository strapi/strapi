'use strict';

module.exports = {
  policies: {
    hasPermissions: require('./policies/hasPermissions'),
    isAuthenticatedAdmin: require('./policies/isAuthenticatedAdmin'),
  },
  routes: require('./routes').routes,
  layout: require('./layout'),
  ...require('./settings'),
};
