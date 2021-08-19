'use strict';

module.exports = {
  functions: {
    bootstrap: require('./functions/bootstrap'),
    register: require('./functions/register'),
  },
  policies: {
    hasPermissions: require('./policies/hasPermissions'),
    isAuthenticatedAdmin: require('./policies/isAuthenticatedAdmin'),
  },
  routes: require('./routes').routes,
  layout: require('./layout'),
  ...require('./settings'),
};
