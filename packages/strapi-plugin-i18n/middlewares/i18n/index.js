'use strict';

const { get, isMatch } = require('lodash/fp');

module.exports = strapi => {
  return {
    beforeInitialize() {
      strapi.config.middleware.load.before.unshift('i18n');
    },

    initialize() {
      const routes = get('plugins.content-manager.config.routes', strapi);
      const routesToAddPolicyTo = routes.filter(
        route =>
          isMatch({ method: 'POST', path: '/collection-types/:model' }, route) ||
          isMatch({ method: 'PUT', path: '/single-types/:model' }, route)
      );

      routesToAddPolicyTo.forEach(route => {
        route.config.policies.push('plugins::i18n.validateLocaleCreation');
      });
    },
  };
};
