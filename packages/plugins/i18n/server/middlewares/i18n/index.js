'use strict';

const { getOr, isMatch } = require('lodash/fp');
const _ = require('lodash');

module.exports = {
  defaults: { i18n: { enabled: true } },
  load: {
    beforeInitialize() {
      strapi.config.middleware.load.before.unshift('i18n');
    },
    initialize() {
      const routes = strapi.plugins['content-manager'].routes;
      const routesToAddPolicyTo = routes.filter(
        route =>
          isMatch({ method: 'POST', path: '/collection-types/:model' }, route) ||
          isMatch({ method: 'PUT', path: '/single-types/:model' }, route)
      );

      routesToAddPolicyTo.forEach(route => {
        const policies = getOr([], 'config.policies', route).concat(
          'plugin::i18n.validateLocaleCreation'
        );
        _.set(route, 'config.policies', policies);
      });
    },
  },
};
