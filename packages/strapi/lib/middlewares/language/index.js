'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

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
        enabled: false,
        defaultLocale: 'en_us',
        locales: ['en_us'],
        modes: ['query', 'subdomain', 'cookie', 'header', 'url', 'tld'],
        cookieName: 'locale'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.koaMiddlewares.locale(strapi.app);

      strapi.app.use(
        strapi.koaMiddlewares.convert(
          strapi.koaMiddlewares.i18n(strapi.app, {
            directory: path.resolve(
              strapi.config.appPath,
              strapi.config.paths.config,
              'locales'
            ),
            locales: Object.keys(strapi.config.locales),
            defaultLocale: strapi.config.middleware.settings.language.defaultLocale,
            modes: strapi.config.middleware.settings.language.modes,
            cookieName: strapi.config.middleware.settings.language.cookieName,
            extension: '.json'
          })
        )
      );

      cb();
    }
  };
};
