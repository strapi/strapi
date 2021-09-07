'use strict';

const jwtService = require('./jwt');
const providersService = require('./providers');
const userService = require('./user');
const roleService = require('./role');
const usersPermissionsService = require('./users-permissions');

module.exports = {
  jwt: jwtService,
  providers: providersService,
  role: roleService,
  user: userService,
  'users-permissions': usersPermissionsService,
};
