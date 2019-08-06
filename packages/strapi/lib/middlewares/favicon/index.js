'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const { resolve } = require('path');
const favicon = require('koa-favicon');

/**
 * Favicon hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      const { dir } = strapi;
      const {
        maxAge,
        path: faviconPath,
      } = strapi.config.middleware.settings.favicon;

      strapi.app.use(
        favicon(resolve(dir, faviconPath), {
          maxAge,
        })
      );
    },
  };
};
