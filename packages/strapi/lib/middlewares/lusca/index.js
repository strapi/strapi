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
        _.isPlainObject(strapi.config.middlewares.settings.csrf) &&
        !_.isEmpty(strapi.config.middlewares.settings.csrf)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.csrf({
              key: strapi.config.middlewares.settings.csrf.key,
              secret: strapi.config.middlewares.settings.csrf.secret
            })
          )
        );
      }

      if (_.isPlainObject(strapi.config.middlewares.settings.csp) && !_.isEmpty(strapi.config.middlewares.settings.csp)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.csp(strapi.config.middlewares.settings.csp)
          )
        );
      }

      if (_.isString(strapi.config.middlewares.settings.xframe)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.xframe({
              value: strapi.config.middlewares.settings.xframe
            })
          )
        );
      }

      if (_.isString(strapi.config.middlewares.settings.p3p)) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.p3p({
              value: strapi.config.middlewares.settings.p3p
            })
          )
        );
      }

      if (
        _.isPlainObject(strapi.config.middlewares.settings.hsts) &&
        !_.isEmpty(strapi.config.middlewares.settings.hsts)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.hsts({
              maxAge: strapi.config.middlewares.settings.hsts.maxAge,
              includeSubDomains: strapi.config.middlewares.settings.hsts.includeSubDomains
            })
          )
        );
      }

      if (
        _.isPlainObject(strapi.config.middlewares.settings.xssProtection) &&
        !_.isEmpty(strapi.config.middlewares.settings.xssProtection)
      ) {
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.lusca.xssProtection({
              enabled: strapi.config.middlewares.settings.xssProtection.enabled,
              mode: strapi.config.middlewares.settings.xssProtection.mode
            })
          )
        );
      }

      cb();
    }
  };
};
