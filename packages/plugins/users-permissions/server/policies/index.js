'use strict';

const isAuthenticated = require('./isAuthenticated');
const permissions = require('./permissions');
const rateLimit = require('./rateLimit');

module.exports = {
  isAuthenticated,
  permissions,
  rateLimit,
};
