'use strict';

const permissionsRoutes = require('./permissions');
const settingsRoutes = require('./settings');
const roleRoutes = require('./role');

module.exports = {
  type: 'admin',
  routes: [...roleRoutes, ...settingsRoutes, ...permissionsRoutes],
};
