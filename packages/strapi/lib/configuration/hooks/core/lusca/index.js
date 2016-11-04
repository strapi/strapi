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

    initialize: cb => {
      if (_.isPlainObject(strapi.config.csrf) && !_.isEmpty(strapi.config.csrf)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.csrf({
          key: strapi.config.csrf.key,
          secret: strapi.config.csrf.secret
        })));
      }

      if (_.isPlainObject(strapi.config.csp) && !_.isEmpty(strapi.config.csp)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.csp(strapi.config.csp)));
      }

      if (_.isString(strapi.config.xframe)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.xframe({
          value: strapi.config.xframe
        })));
      }

      if (_.isString(strapi.config.p3p)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.p3p({
          value: strapi.config.p3p
        })));
      }

      if (_.isPlainObject(strapi.config.hsts) && !_.isEmpty(strapi.config.hsts)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.hsts({
          maxAge: strapi.config.hsts.maxAge,
          includeSubDomains: strapi.config.hsts.includeSubDomains
        })));
      }

      if (_.isPlainObject(strapi.config.xssProtection) && !_.isEmpty(strapi.config.xssProtection)) {
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.lusca.xssProtection({
          enabled: strapi.config.xssProtection.enabled,
          mode: strapi.config.xssProtection.mode
        })));
      }

      cb();
    }
  };
};
