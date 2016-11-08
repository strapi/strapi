'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * i18n hook
 */

module.exports = strapi => {
  return {

    /**
     * Default options
     */

    defaults: {
      i18n: {
        defaultLocale: 'en_US',
        modes: [
          'query',
          'subdomain',
          'cookie',
          'header',
          'url',
          'tld'
        ],
        cookieName: 'locale'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isPlainObject(strapi.config.i18n) && !_.isEmpty(strapi.config.i18n) && _.get(strapi.config, 'i18n.enabled') !== false) {
        strapi.middlewares.locale(strapi.app);
        strapi.app.use(strapi.middlewares.convert(strapi.middlewares.i18n(strapi.app, {
          directory: path.resolve(strapi.config.appPath, strapi.config.paths.config, 'locales'),
          locales: strapi.config.i18n.locales,
          defaultLocale: strapi.config.i18n.defaultLocale,
          modes: strapi.config.i18n.modes,
          cookieName: strapi.config.i18n.cookieName,
          extension: '.json'
        })));
      }

      cb();
    }
  };
};
