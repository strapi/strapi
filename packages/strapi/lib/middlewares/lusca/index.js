'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

/**
 * Lusca hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      csrf: false,
      csp: false,
      p3p: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true
      },
      xframe: 'SAMEORIGIN',
      xssProtection: false
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (
        _.isPlainObject(strapi.config.middleware.settings.csrf) &&
        !_.isEmpty(strapi.config.middleware.settings.csrf)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.csrf({
              key: strapi.config.middleware.settings.csrf.key,
              secret: strapi.config.middleware.settings.csrf.secret
            })
          )
        );
      }

      if (_.isPlainObject(strapi.config.middleware.settings.csp) && !_.isEmpty(strapi.config.middleware.settings.csp)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.csp(strapi.config.middleware.settings.csp)
          )
        );
      }

      if (_.isString(strapi.config.middleware.settings.xframe)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.xframe({
              value: strapi.config.middleware.settings.xframe
            })
          )
        );
      }

      if (_.isString(strapi.config.middleware.settings.p3p)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.p3p({
              value: strapi.config.middleware.settings.p3p
            })
          )
        );
      }

      if (
        _.isPlainObject(strapi.config.middleware.settings.hsts) &&
        !_.isEmpty(strapi.config.middleware.settings.hsts)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.hsts({
              maxAge: strapi.config.middleware.settings.hsts.maxAge,
              includeSubDomains: strapi.config.middleware.settings.hsts.includeSubDomains
            })
          )
        );
      }

      if (
        _.isPlainObject(strapi.config.middleware.settings.xssProtection) &&
        !_.isEmpty(strapi.config.middleware.settings.xssProtection)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.xssProtection({
              enabled: strapi.config.middleware.settings.xssProtection.enabled,
              mode: strapi.config.middleware.settings.xssProtection.mode
            })
          )
        );
      }

      cb();
    }
  };
};
