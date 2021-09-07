'use strict';

const usersPermissionsRoutes = require('./users-permissions');
const roleRoutes = require('./role');
const userRoutes = require('./user');
const authRoutes = require('./auth');

module.exports = {
  type: 'admin',
  routes: [...roleRoutes, ...usersPermissionsRoutes, ...authRoutes, ...userRoutes],
};
