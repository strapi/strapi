'use strict';

const jwt = require('./jwt');
const providers = require('./providers');
const user = require('./user');
const role = require('./role');
const usersPermissions = require('./users-permissions');

module.exports = {
  jwt,
  providers,
  role,
  user,
  'users-permissions': usersPermissions,
};
