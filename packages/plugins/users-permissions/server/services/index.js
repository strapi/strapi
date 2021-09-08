'use strict';

const jwtService = require('./jwt');
const providersService = require('./providers');
const userService = require('./user');
const usersPermissionsService = require('./users-permissions');

module.exports = {
  jwt: jwtService,
  providers: providersService,
  user: userService,
  'users-permissions': usersPermissionsService,
};
