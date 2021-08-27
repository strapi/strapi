'use strict';

const authController = require('./auth');
const userController = require('./user');
const usersPermissionsController = require('./users-permissions');

module.exports = {
  auth: authController,
  user: userController,
  'users-permissions': usersPermissionsController,
};
