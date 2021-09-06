'use strict';

const usersPermissionsRoutes = require('./users-permissions');
const userRoutes = require('./user');
const authRoutes = require('./auth');

module.exports = {
  routes: [...usersPermissionsRoutes, ...authRoutes, ...userRoutes],
};
