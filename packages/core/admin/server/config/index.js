'use strict';

module.exports = {
  policies: {
    hasPermissions: require('./policies/hasPermissions'),
    isAuthenticatedAdmin: require('./policies/isAuthenticatedAdmin'),
  },
  layout: require('./layout'),
  ...require('./settings'),
};
