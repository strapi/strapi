'use strict';

const { get } = require('lodash/fp');

module.exports = strapi => {
  return {
    beforeInitialize() {
      strapi.config.middleware.load.before.unshift('i18n');
    },

    initialize() {
      const routes = get('plugins.content-manager.config.routes', strapi);

      const createRoute = routes.find(
        route => route.method === 'POST' && route.path === '/collection-types/:model'
      );
      createRoute.config.policies.push('plugins::i18n.validateLocaleCreation');
    },
  };
};
