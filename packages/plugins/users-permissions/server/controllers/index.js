'use strict';

const authController = require('./auth');
const userController = require('./user');
const roleController = require('./role');
const usersPermissionsController = require('./users-permissions');

module.exports = {
  auth: authController,
  user: userController,
  role: roleController,
  'users-permissions': usersPermissionsController,
};
