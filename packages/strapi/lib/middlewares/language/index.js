'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const { resolve } = require('path');
const { get } = require('lodash');
const locale = require('koa-locale');
const i18n = require('koa-i18n');
/**
 * Language hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      locale(strapi.app);

      const {
        defaultLocale,
        modes,
        cookieName,
      } = strapi.config.middleware.settings.language;

      const directory = resolve(
        strapi.config.appPath,
        strapi.config.paths.config,
        'locales'
      );

      strapi.app.use(
        i18n(strapi.app, {
          directory,
          locales: Object.keys(get(strapi.config, 'locales', {})),
          defaultLocale,
          modes,
          cookieName,
          extension: '.json',
        })
      );
    },
  };
};
