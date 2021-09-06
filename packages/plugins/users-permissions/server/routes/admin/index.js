'use strict';

const usersPermissionsRoutes = require('./users-permissions');
const userRoutes = require('./user');
const authRoutes = require('./auth');

module.exports = {
  type: 'admin',
  routes: [...usersPermissionsRoutes, ...authRoutes, ...userRoutes],
};
