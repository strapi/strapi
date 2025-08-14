'use strict';

const authRoutes = require('./auth');
const userRoutes = require('./user');
const roleRoutes = require('./role');
const permissionsRoutes = require('./permissions');

module.exports = (strapi) => {
  return {
    type: 'content-api',
    routes: [
      ...authRoutes(strapi),
      ...userRoutes(strapi),
      ...roleRoutes(strapi),
      ...permissionsRoutes(strapi),
    ],
  };
};
