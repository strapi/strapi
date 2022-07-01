'use strict';

const jwt = require('./jwt');
const providers = require('./providers');
const user = require('./user');
const role = require('./role');
const usersPermissions = require('./users-permissions');
const providersRegistry = require('./providers-registry');

module.exports = {
  jwt,
  providers,
  'providers-registry': providersRegistry,
  role,
  user,
  'users-permissions': usersPermissions,
};
