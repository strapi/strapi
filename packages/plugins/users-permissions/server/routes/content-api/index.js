'use strict';

const authRoutes = require('./auth');
const userRoutes = require('./user');
const roleRoutes = require('./role');
const permissionsRoutes = require('./permissions');

let sharedRoutes;

const ensureSharedRoutes = () => {
  if (!sharedRoutes) {
    sharedRoutes = [
      ...authRoutes(strapi),
      ...userRoutes(strapi),
      ...roleRoutes(strapi),
      ...permissionsRoutes(strapi),
    ];
  }
  return sharedRoutes;
};

const createContentApiRoutes = () => {
  return {
    type: 'content-api',
    routes: ensureSharedRoutes(),
  };
};

Object.defineProperty(createContentApiRoutes, 'routes', {
  get: ensureSharedRoutes,
  set(next) {
    sharedRoutes = next;
  },
});

module.exports = createContentApiRoutes;
