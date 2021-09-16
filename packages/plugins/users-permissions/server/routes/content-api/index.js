'use strict';

const authRoutes = require('./auth');
const userRoutes = require('./user');
const roleRoutes = require('./role');
const permissionsRoutes = require('./permissions');

module.exports = {
  type: 'content-api',
  routes: [...authRoutes, ...userRoutes, ...roleRoutes, ...permissionsRoutes],
};
