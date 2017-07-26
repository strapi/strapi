'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');

/**
 * Language hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      language: {
        defaultLocale: 'en_US',
        modes: ['query', 'subdomain', 'cookie', 'header', 'url', 'tld'],
        cookieName: 'locale'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      if (
        _.isPlainObject(strapi.config.middleware.settings.language) &&
        !_.isEmpty(strapi.config.middleware.settings.language) &&
        _.get(strapi.config, 'language.enabled') !== false
      ) {
        strapi.koaMiddlewares.locale(strapi.app);
        strapi.app.use(
          strapi.koaMiddlewares.convert(
            strapi.koaMiddlewares.i18n(strapi.app, {
              directory: path.resolve(
                strapi.config.appPath,
                strapi.config.paths.config,
                'locales'
              ),
              locales: strapi.config.middleware.settings.language.locales,
              defaultLocale: strapi.config.middleware.settings.language.defaultLocale,
              modes: strapi.config.middleware.settings.language.modes,
              cookieName: strapi.config.middleware.settings.language.cookieName,
              extension: '.json'
            })
          )
        );
      }

      cb();
    }
  };
};
