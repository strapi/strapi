'use strict';

const jwtService = require('../../services/Jwt');
const providersService = require('../../services/Providers');
const userService = require('../../services/User');
const usersPermissionsService = require('../../services/UsersPermissions');

module.exports = {
  jwt: jwtService,
  providers: providersService,
  user: userService,
  'users-permissions': usersPermissionsService,
};
