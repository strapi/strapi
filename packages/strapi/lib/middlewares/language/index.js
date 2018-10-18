'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const { get } = require('lodash');

/**
 * Language hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      strapi.koaMiddlewares.locale(strapi.app);

      strapi.app.use(
        strapi.koaMiddlewares.i18n(strapi.app, {
          directory: path.resolve(
            strapi.config.appPath,
            strapi.config.paths.config,
            'locales'
          ),
          locales: Object.keys(get(strapi.config, 'locales', {})),
          defaultLocale: strapi.config.middleware.settings.language.defaultLocale,
          modes: strapi.config.middleware.settings.language.modes,
          cookieName: strapi.config.middleware.settings.language.cookieName,
          extension: '.json'
        })
      );

      cb();
    }
  };
};
