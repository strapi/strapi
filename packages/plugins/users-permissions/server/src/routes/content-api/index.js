'use strict';

const { createContentApiRoutesFactory } = require('@strapi/utils');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const roleRoutes = require('./role');
const permissionsRoutes = require('./permissions');

const createContentApiRoutes = createContentApiRoutesFactory(() => {
  return [
    ...authRoutes(strapi),
    ...userRoutes(strapi),
    ...roleRoutes(strapi),
    ...permissionsRoutes(strapi),
  ];
});

module.exports = createContentApiRoutes;
