'use strict';

const authController = require('../../controllers/Auth');
const userController = require('../../controllers/User');
const usersPermissionsController = require('../../controllers/UsersPermissions');

module.exports = {
  auth: authController,
  user: userController,
  usersPermissions: usersPermissionsController,
};
